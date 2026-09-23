// Validation of the report payload sent by the web client.
// Everything here comes from the browser, so it is treated as untrusted data.

export const MODULES = ['safety', 'barista', 'it', 'doctor'];

const MAX_EVENTS = 200;
const MAX_STRING = 120;

function cleanScalar(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, MAX_STRING);
  return undefined;
}

/**
 * Returns { ok: true, report } with a sanitized copy, or { ok: false, error }.
 * Sanitized shape: { module, score, metrics: {key: scalar}, events: [{t, action, ok}] }
 */
export function validateReport(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object' };

  const { module, score, metrics, events } = body;
  if (!MODULES.includes(module)) return { ok: false, error: `module must be one of: ${MODULES.join(', ')}` };
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
    return { ok: false, error: 'score must be a number between 0 and 100' };
  }
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
    return { ok: false, error: 'metrics must be an object' };
  }

  const cleanMetrics = {};
  for (const [key, value] of Object.entries(metrics).slice(0, 30)) {
    const v = cleanScalar(value);
    if (v !== undefined && /^[a-z0-9_]{1,40}$/i.test(key)) cleanMetrics[key] = v;
  }

  const cleanEvents = Array.isArray(events)
    ? events.slice(0, MAX_EVENTS)
        .filter(e => e && typeof e === 'object')
        .map(e => ({
          t: typeof e.t === 'number' && Number.isFinite(e.t) ? e.t : null,
          action: typeof e.action === 'string' ? e.action.slice(0, MAX_STRING) : '',
          ok: e.ok === true
        }))
        .filter(e => e.action)
    : [];

  return { ok: true, report: { module, score: Math.round(score), metrics: cleanMetrics, events: cleanEvents } };
}

// ---------- Validation survey (frontend/js/survey.js) ----------
const SURVEY_FIELDS = {
  role: ['8–9 класс', '10–11 класс', 'Колледж', 'Вуз', 'Работаю'],
  before: ['1', '2', '3', '4', '5'],
  clarity: ['1', '2', '3', '4', '5'],
  guide: ['Да', 'Частично', 'Нет'],
  no_help: ['Да', 'Нет'],
  learned: ['Да', 'Нет'],
  report_match: ['1', '2', '3', '4', '5'],
  more: ['Да', 'Нет', 'Не знаю']
};

/** Returns { ok: true, survey } with only known fields and allowed values, or { ok: false, error }. */
export function validateSurvey(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object' };
  if (!MODULES.includes(body.module)) return { ok: false, error: `module must be one of: ${MODULES.join(', ')}` };
  const answers = body.answers;
  if (!answers || typeof answers !== 'object') return { ok: false, error: 'answers must be an object' };
  const clean = {};
  for (const [key, allowed] of Object.entries(SURVEY_FIELDS)) {
    if (!allowed.includes(answers[key])) return { ok: false, error: `answers.${key} is missing or invalid` };
    clean[key] = answers[key];
  }
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    ok: true,
    survey: {
      at: new Date().toISOString(),
      module: body.module,
      score: num(body.score),
      time_sec: num(body.time_sec),
      errors: num(body.errors),
      answers: clean,
      comment: typeof body.comment === 'string' ? body.comment.slice(0, 300) : ''
    }
  };
}
