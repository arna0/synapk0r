// The Claude path of generateFeedback, with a fake Anthropic client (no network, no real key).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
const { generateFeedback, setClientForTests } = await import('../src/feedback.js');

const report = {
  module: 'safety',
  score: 87,
  lang: 'en',
  metrics: { violations: 1, voltage_tested: true, lockout_applied: true, total_time_sec: 120 },
  events: [{ t: 3.2, action: 'TOUCH_BREAKER_NO_PPE', ok: false }],
};
const quiet = { warn() {}, error() {}, log() {} };

let lastRequest;
function fakeClient(response) {
  return {
    beta: {
      messages: {
        create: async (req) => {
          lastRequest = req;
          if (response instanceof Error) throw response;
          return response;
        },
      },
    },
  };
}
const reply = (text, stop_reason = 'end_turn') => ({ stop_reason, content: [{ type: 'text', text }] });

const good = {
  summary: 'Solid run with one safety slip.',
  strengths: ['Measured the voltage', 'Locked out the breaker', 'Released pressure', 'Extra item'],
  growth_areas: ['Put on PPE before touching the panel'],
  career_advice: 'Practise the order until it is automatic.',
};

beforeEach(() => {
  lastRequest = undefined;
});

test('valid Claude JSON becomes the debrief, lists capped at 3', async () => {
  setClientForTests(fakeClient(reply(JSON.stringify(good))));
  const out = await generateFeedback(report, { logger: quiet });
  assert.equal(out.source, 'claude');
  assert.equal(out.summary, good.summary);
  assert.equal(out.strengths.length, 3);
  assert.deepEqual(out.growth_areas, good.growth_areas);
});

test('request uses the current model, a JSON schema and the chosen language', async () => {
  setClientForTests(fakeClient(reply(JSON.stringify(good))));
  await generateFeedback(report, { logger: quiet });
  assert.equal(lastRequest.model, 'claude-opus-5-5');
  assert.equal(lastRequest.output_config.format.type, 'json_schema');
  assert.match(lastRequest.messages[0].content, /Write the whole debrief in English/);
  assert.match(lastRequest.messages[0].content, /<session_data>/);
});

test('a refusal falls back to rule-based feedback', async () => {
  setClientForTests(fakeClient(reply('', 'refusal')));
  const out = await generateFeedback(report, { logger: quiet });
  assert.equal(out.source, 'rules');
  assert.ok(out.summary.length > 0);
});

test('a cut-off answer (max_tokens) falls back to rules', async () => {
  setClientForTests(fakeClient(reply('{"summary": "cut', 'max_tokens')));
  const out = await generateFeedback(report, { logger: quiet });
  assert.equal(out.source, 'rules');
});

test('broken JSON falls back to rules', async () => {
  setClientForTests(fakeClient(reply('this is not json')));
  const out = await generateFeedback(report, { logger: quiet });
  assert.equal(out.source, 'rules');
});

test('JSON with the wrong shape falls back to rules', async () => {
  setClientForTests(fakeClient(reply(JSON.stringify({ summary: 'only a summary' }))));
  const out = await generateFeedback(report, { logger: quiet });
  assert.equal(out.source, 'rules');
});

test('unexpected (non-API) errors are not swallowed', async () => {
  setClientForTests(fakeClient(new TypeError('bug in our code')));
  await assert.rejects(() => generateFeedback(report, { logger: quiet }), TypeError);
});
