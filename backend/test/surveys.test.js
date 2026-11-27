import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.js';
import { createSurveyStore } from '../src/surveys.js';
import { validateSurvey } from '../src/validate.js';

const answers = { role: '10–11 класс', before: '2', clarity: '5', guide: 'Да', no_help: 'Да', learned: 'Да', report_match: '4', more: 'Да' };
const payload = (id = 'submission-00000001') => ({ id, module: 'barista', score: 84, time_sec: 60, errors: 1, publish: true, answers, comment: '<img src=x onerror=alert(1)>' });
async function fixture(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'synapkor-review-'));
  const file = path.join(dir, 'survey.jsonl');
  const servers = [];
  const start = async () => {
    const server = createApp({ surveyFile: file }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve)); servers.push(server);
    return `http://127.0.0.1:${server.address().port}`;
  };
  try { await fn({ file, start }); }
  finally {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    await rm(dir, { recursive: true, force: true });
  }
}
const post = (base, body) => fetch(base + '/api/survey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('review survives a new app instance and duplicate uploads produce one row', async () => fixture(async ({ file, start }) => {
  const base = await start();
  assert.equal((await post(base, payload())).status, 201);
  const repeat = await post(base, payload());
  assert.equal(repeat.status, 200); assert.equal((await repeat.json()).duplicate, true);
  const restarted = await start();
  const response = await fetch(restarted + '/api/reviews');
  const data = await response.json();
  assert.equal(data.total, 1); assert.equal(data.reviews[0].comment, payload().comment);
  assert.deepEqual(data.reviews[0].answers, answers);
  assert.equal('score' in data.reviews[0], false);
  assert.equal('time_sec' in data.reviews[0], false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await readFile(file, 'utf8')).split('\n').filter(Boolean).length, 1);
}));

test('pagination and module filter include every public response and protect older private rows', async () => fixture(async ({ file, start }) => {
  const store = createSurveyStore(file);
  for (let i = 0; i < 23; i++) await store.add(validateSurvey({ ...payload('submission-' + String(i).padStart(8, '0')), module: i === 22 ? 'doctor' : 'barista', comment: i % 2 ? '' : 'Test review' }).survey);
  await store.add(validateSurvey({ ...payload('submission-private00'), publish: false, comment: 'Private questionnaire' }).survey);
  const base = await start();
  const first = await (await fetch(base + '/api/reviews')).json();
  const next = await (await fetch(base + '/api/reviews?page=2')).json();
  assert.equal(first.total, 23); assert.equal(first.reviews.length, 20); assert.equal(first.hasMore, true);
  assert.equal(next.reviews.length, 3); assert.equal(next.hasMore, false);
  assert.equal(new Set([...first.reviews, ...next.reviews].map(row => row.id)).size, 23);
  assert.equal(first.reviews[0].module, 'doctor');
  const filtered = await (await fetch(base + '/api/reviews?module=doctor')).json();
  assert.equal(filtered.total, 1);
  const summary = await (await fetch(base + '/api/survey/summary')).json();
  assert.equal(summary.n, 23);
  assert.equal((await fetch(base + '/api/reviews?page=-1')).status, 400);
  assert.equal((await fetch(base + '/api/reviews?page=1.5')).status, 400);
  assert.equal((await fetch(base + '/api/reviews?module=unknown')).status, 400);
}));

test('concurrent appends are serialized and damaged last lines cannot hide later reviews', async () => fixture(async ({ file }) => {
  await writeFile(file, '{partial');
  const store = createSurveyStore(file);
  await Promise.all(Array.from({ length: 10 }, (_, i) => store.add(validateSurvey(payload('concurrent-' + String(i).padStart(8, '0'))).survey)));
  assert.equal((await store.all()).length, 10);
  assert.equal((await createSurveyStore(file).all()).length, 10);
}));

test('invalid submission IDs and incomplete survey answers are rejected', async () => fixture(async ({ start }) => {
  const base = await start();
  assert.equal((await post(base, { ...payload(), id: '../invalid' })).status, 400);
  assert.equal((await post(base, { ...payload(), answers: {} })).status, 400);
  assert.equal((await (await fetch(base + '/api/reviews')).json()).total, 0);
}));
