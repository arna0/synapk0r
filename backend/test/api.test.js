import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Tests run without an API key: the backend must fall back to rule-based feedback.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_AUTH_TOKEN;

const { createApp } = await import('../src/server.js');
const { validateReport } = await import('../src/validate.js');

let server;
let base;
before(async () => {
  server = createApp().listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (body) => fetch(`${base}/api/report`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});

test('health reports AI disabled without a key', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, ai: false });
});

test('safety report without violations gets rule-based feedback', async () => {
  const res = await post({
    module: 'safety', score: 99,
    metrics: { violations: 0, voltage_tested: true, lockout_applied: true, total_time_sec: 95 },
    events: [{ t: 3.2, action: 'EQUIP_PPE_SUCCESS', ok: true }]
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.source, 'rules');
  assert.match(data.summary, /99/);
  assert.ok(data.strengths.length >= 1);
  assert.ok(data.growth_areas.length >= 1);
});

test('barista report mentions wrong clicks as growth area', async () => {
  const res = await post({
    module: 'barista', score: 84,
    metrics: { wrong_clicks: 5, conflict_choice: 'Defensive', budget_choice: 'high', total_time_sec: 200 }
  });
  const data = await res.json();
  assert.ok(data.growth_areas.some(g => g.includes('5')));
  assert.ok(data.growth_areas.length >= 2);
});

test('invalid payloads are rejected with 400', async () => {
  assert.equal((await post({ module: 'pilot', score: 50, metrics: {} })).status, 400);
  assert.equal((await post({ module: 'safety', score: 150, metrics: {} })).status, 400);
  assert.equal((await post('{not json')).status, 400);
});

test('validation strips unexpected metric values and caps events', () => {
  const { ok, report } = validateReport({
    module: 'barista', score: 90.4,
    metrics: { good: 1, nested: { a: 1 }, 'bad key!': 2, long: 'x'.repeat(500) },
    events: Array.from({ length: 500 }, (_, i) => ({ t: i, action: 'A', ok: true }))
  });
  assert.ok(ok);
  assert.equal(report.score, 90);
  assert.deepEqual(Object.keys(report.metrics).sort(), ['good', 'long']);
  assert.equal(report.metrics.long.length, 120);
  assert.equal(report.events.length, 200);
});

test('web client is served from the same origin', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /js\/report\.js/);
});
