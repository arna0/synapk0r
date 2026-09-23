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
