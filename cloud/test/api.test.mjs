import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleApi } from '../worker.js';
import { database } from './database.mjs';
const answers = { role: '10–11 класс', before: '2', clarity: '5', guide: 'Да', no_help: 'Да', learned: 'Да', report_match: '4', more: 'Да' };
const survey = (patch = {}) => ({ id: crypto.randomUUID(), module: 'barista', publish: true, answers, comment: 'Useful practice.', ...patch });
const call = (db, path, body, headers = {}, method) => handleApi(new Request('https://api.example' + path, {
  method: method || (body === undefined ? 'GET' : 'POST'),
  headers: { origin: 'https://arna0.github.io', 'content-type': 'application/json', 'cf-connecting-ip': crypto.randomUUID(), ...headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
}), { DB: db, REVIEW_ADMIN_TOKEN: 'test-secret' });

test('persistent reviews survive restart, deduplicate retries and omit private details', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'synapkor-d1-')), 'reviews.sqlite');
  let db = database(file); const payload = survey({ score: 80, time_sec: 50, errors: 2 });
  assert.equal((await call(db, '/api/survey', payload)).status, 201); db.close(); db = database(file, false);
  assert.equal((await call(db, '/api/survey', payload)).status, 200);
  await call(db, '/api/survey', survey({ publish: false }));
  const data = await (await call(db, '/api/reviews')).json();
  assert.equal(data.total, 1); assert.equal(data.reviews[0].id, payload.id);
  assert.deepEqual(Object.keys(data.reviews[0]).sort(), ['answers', 'at', 'comment', 'id', 'module']);
  assert.deepEqual(data.reviews[0].answers, answers); db.close();
});
test('concurrent retries insert exactly one review', async () => {
  const db = database(); const payload = survey();
  const responses = await Promise.all(Array.from({ length: 10 }, () => call(db, '/api/survey', payload)));
  assert.equal(responses.filter(r => r.status === 201).length, 1);
  assert.equal((await (await call(db, '/api/reviews')).json()).total, 1); db.close();
});
test('snapshot pagination remains stable during new submissions and filters professions', async () => {
  const db = database();
  for (let i = 0; i < 25; i++) await call(db, '/api/survey', survey({ comment: String(i) }));
  const first = await (await call(db, '/api/reviews')).json();
  await call(db, '/api/survey', survey()); await call(db, '/api/survey', survey({ module: 'doctor' }));
  const second = await (await call(db, '/api/reviews?page=2&snapshot=' + first.snapshot)).json();
  assert.equal(first.reviews.length, 20); assert.equal(second.reviews.length, 5);
  assert.equal(new Set([...first.reviews, ...second.reviews].map(r => r.id)).size, 25);
  assert.equal(second.hasMore, false); assert.equal(second.total, 25);
  assert.equal((await (await call(db, '/api/reviews?module=doctor')).json()).total, 1); db.close();
});
test('CORS accepts the site and blocks untrusted origins', async () => {
  const db = database(); const preflight = await call(db, '/api/survey', undefined, {}, 'OPTIONS');
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://arna0.github.io');
  assert.equal((await call(db, '/api/survey', survey(), { origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await (await call(db, '/api/reviews')).json()).total, 0); db.close();
});
test('rejects invalid input, query, content type, JSON and oversized bodies', async () => {
  const db = database();
  for (const path of ['/api/reviews?page=0', '/api/reviews?page=1.2', '/api/reviews?module=oops', '/api/reviews?snapshot=-2']) assert.equal((await call(db, path)).status, 400);
  assert.equal((await call(db, '/api/survey', survey({ answers: {} }))).status, 400);
  assert.equal((await call(db, '/api/survey', survey(), { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await call(db, '/api/survey', survey({ comment: 'x'.repeat(33000) }))).status, 413);
  const bad = new Request('https://api.example/api/survey', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal((await handleApi(bad, { DB: db })).status, 400); db.close();
});
test('write limit is durable across worker requests and sets Retry-After', async () => {
  const db = database(); const headers = { 'cf-connecting-ip': '192.0.2.1' };
  for (let i = 0; i < 20; i++) assert.equal((await call(db, '/api/survey', survey(), headers)).status, 201);
  const limited = await call(db, '/api/survey', survey(), headers);
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60');
  assert.equal((await (await call(db, '/api/reviews')).json()).total, 20); db.close();
});
test('health, aggregate summary and reports work', async () => {
  const db = database(); assert.equal((await (await call(db, '/api/health')).json()).storage, 'd1');
  await call(db, '/api/survey', survey());
  await call(db, '/api/survey', survey({ module: 'doctor', publish: false }));
  await call(db, '/api/survey', survey({ module: 'it', publish: undefined }));
  const summary = await (await call(db, '/api/survey/summary')).json();
  assert.equal(summary.n, 1); assert.equal(summary.h3_learned, 1); assert.equal(summary.by_module.barista, 1);
  assert.deepEqual(summary.by_module, { barista: 1 });
  for (const module of ['safety', 'barista', 'it', 'doctor']) {
    const r = await (await call(db, '/api/report', { module, score: 80, metrics: {}, events: [] })).json();
    assert.equal(r.source, 'rules'); assert.ok(r.summary); assert.ok(Array.isArray(r.strengths));
  } db.close();
});
test('moderation requires a secret and removes only the selected review', async () => {
  const db = database(); const one = survey(), two = survey();
  await call(db, '/api/survey', one); await call(db, '/api/survey', two);
  const path = '/api/reviews/' + one.id;
  assert.equal((await call(db, path, undefined, {}, 'DELETE')).status, 401);
  assert.equal((await call(db, path, undefined, { authorization: 'Bearer wrong' }, 'DELETE')).status, 401);
  assert.equal((await call(db, path, undefined, { authorization: 'Bearer test-secret' }, 'DELETE')).status, 200);
  const data = await (await call(db, '/api/reviews')).json(); assert.equal(data.total, 1); assert.equal(data.reviews[0].id, two.id); db.close();
});
test('storage failure returns a retryable error without internal details', async () => {
  const r = await handleApi(new Request('https://api.example/api/health'), { DB: { withSession() { throw new Error('private database details'); } } });
  assert.equal(r.status, 503); assert.equal((await r.json()).error, 'Service temporarily unavailable');
});
