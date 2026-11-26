// Production smoke test. Creates only its own temporary record and removes it in finally.
// The moderation secret arrives on stdin, never in argv or source.
import assert from 'node:assert/strict';
const origin = process.argv[2];
if (!origin || new URL(origin).protocol !== 'https:') throw new Error('Pass the HTTPS API origin');
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
console.log('Ready for moderation secret on stdin (input hidden).');
const token = await new Promise(resolve => {
  let input = '';
  const listener = chunk => {
    input += chunk;
    if (input.includes('\n') || input.includes('\r')) {
      process.stdin.removeListener('data', listener); process.stdin.pause();
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      resolve(input.trim());
    }
  };
  process.stdin.on('data', listener);
});
if (token.length < 32) throw new Error('A moderation secret is required for cleanup');
const id = crypto.randomUUID();
const body = { id, module: 'barista', publish: true, score: 80,
  answers: { role: '10–11 класс', before: '2', clarity: '5', guide: 'Да', no_help: 'Да', learned: 'Да', report_match: '4', more: 'Да' },
  comment: 'Automated deployment verification — temporary test record.' };
const req = (path, options = {}) => fetch(origin + path, { ...options, signal: AbortSignal.timeout(15000) });
try {
  const health = await req('/api/health'); assert.equal(health.status, 200); assert.equal((await health.json()).storage, 'd1');
  const preflight = await req('/api/survey', { method: 'OPTIONS', headers: { Origin: 'https://arna0.github.io', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://arna0.github.io');
  const post = () => req('/api/survey', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://arna0.github.io' }, body: JSON.stringify(body) });
  assert.equal((await post()).status, 201); assert.equal((await post()).status, 200);
  // Independent anonymous reads carry no cookies or authentication.
  for (let visitor = 0; visitor < 2; visitor++) {
    const r = await req('/api/reviews?module=barista'); assert.equal(r.status, 200);
    const row = (await r.json()).reviews.find(r => r.id === id);
    assert.ok(row); assert.equal(row.comment, body.comment); assert.equal(row.score, undefined);
    assert.deepEqual(row.answers, body.answers);
  }
  assert.equal((await req('/api/reviews/' + id, { method: 'DELETE' })).status, 401);
  console.log('Live health, CORS, durable submission, duplicate retry, public visibility, privacy and admin guard passed.');
} finally {
  const cleanup = await req('/api/reviews/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  assert.equal(cleanup.status, 200);
  const remaining = await (await req('/api/reviews?module=barista')).json();
  assert.ok(!remaining.reviews.some(r => r.id === id));
  console.log('Temporary deployment review removed.');
}
