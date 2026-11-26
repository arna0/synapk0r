import { MODULES, validateReport, validateSurvey } from '../backend/src/validate.js';
import { ruleBasedFeedback } from '../backend/src/rules.js';

const PAGE_SIZE = 20;
const MAX_BODY = 32 * 1024;
const SITE = 'https://arna0.github.io';
const LOCAL = ['http://127.0.0.1:8787', 'http://localhost:8787'];
const json = (value, status = 200, extra = {}) => Response.json(value, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra
} });

async function readBody(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw { status: 415, message: 'Content-Type must be application/json' };
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw { status: 413, message: 'Payload too large' };
  const reader = request.body?.getReader();
  if (!reader) throw { status: 400, message: 'Invalid JSON' };
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw { status: 413, message: 'Payload too large' }; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw { status: 400, message: 'Invalid JSON' }; }
}

async function allowWrite(request, db, limit) {
  const now = Date.now(); const minute = Math.floor(now / 60000);
  // Cloudflare supplies this header. Never trust a client-provided X-Forwarded-For.
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${minute}:synapkor:${ip}`));
  const key = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  const result = await db.batch([
    db.prepare('DELETE FROM request_limits WHERE expires < ?').bind(now),
    db.prepare(`INSERT INTO request_limits (key, hits, expires) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET hits = hits + 1 RETURNING hits`).bind(key, (minute + 2) * 60000)
  ]);
  return result[1].results[0].hits <= limit;
}

export async function handleApi(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin && origin !== SITE && !LOCAL.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
  const cors = {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600'
  };
  let response;
  try {
    response = request.method === 'OPTIONS' ? new Response(null, { status: 204 }) : await route(request, env, url);
  } catch (error) {
    if (!error.status) console.error('[api] Storage request failed');
    response = json({ error: error.status ? error.message : 'Service temporarily unavailable' }, error.status || 503);
  }
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

async function route(request, env, url) {
  if (url.pathname === '/') return Response.redirect('https://arna0.github.io/synapk0r/frontend/', 302);
  if (!env.DB) throw new Error('Database binding unavailable');
  const db = env.DB.withSession('first-primary');
  // Moderation secret is configured in the host, never shipped to browsers.
  if (request.method === 'DELETE' && url.pathname.startsWith('/api/reviews/')) {
    if (!env.REVIEW_ADMIN_TOKEN || request.headers.get('authorization') !== `Bearer ${env.REVIEW_ADMIN_TOKEN}`) return json({ error: 'Unauthorized' }, 401);
    const id = url.pathname.slice('/api/reviews/'.length);
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(id)) return json({ error: 'Invalid review id' }, 400);
    const removed = await db.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
    return json({ ok: true, deleted: removed.meta.changes > 0 });
  }
  if (request.method === 'GET' && url.pathname === '/api/health') {
    await db.prepare('SELECT id FROM reviews LIMIT 1').all();
    return json({ ok: true, ai: false, storage: 'd1' });
  }
  if (request.method === 'GET' && url.pathname === '/api/reviews') {
    const module = url.searchParams.get('module') || '';
    const page = url.searchParams.get('page') || '1';
    const snapshot = url.searchParams.get('snapshot');
    if (module && !MODULES.includes(module)) return json({ error: 'Invalid module' }, 400);
    if (!/^[1-9]\d{0,6}$/.test(page)) return json({ error: 'Invalid page' }, 400);
    if (snapshot !== null && !/^\d{1,15}$/.test(snapshot)) return json({ error: 'Invalid snapshot' }, 400);
    const ceiling = snapshot === null ? (await db.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM reviews').first()).seq : Number(snapshot);
    const where = 'publish = 1 AND seq <= ?' + (module ? ' AND module = ?' : '');
    const params = module ? [ceiling, module] : [ceiling];
    const [count, rows] = await db.batch([
      db.prepare(`SELECT COUNT(*) AS total FROM reviews WHERE ${where}`).bind(...params),
      db.prepare(`SELECT id, at, module, answers, comment FROM reviews WHERE ${where} ORDER BY seq DESC LIMIT ? OFFSET ?`).bind(...params, PAGE_SIZE, (Number(page) - 1) * PAGE_SIZE)
    ]);
    const total = count.results[0].total;
    return json({ reviews: rows.results.map(row => ({ ...row, answers: JSON.parse(row.answers) })), total, page: Number(page), pageSize: PAGE_SIZE, hasMore: Number(page) * PAGE_SIZE < total, snapshot: String(ceiling) });
  }
  if (request.method === 'GET' && url.pathname === '/api/survey/summary') {
    const [totals, modules] = await db.batch([
      db.prepare(`SELECT COUNT(*) AS n,
        COALESCE(SUM(json_extract(answers, '$.before') IN ('1','2','3')),0) AS h1_before_le3,
        COALESCE(SUM(json_extract(answers, '$.no_help') = 'Да'),0) AS h2_no_help,
        COALESCE(SUM(json_extract(answers, '$.learned') = 'Да'),0) AS h3_learned,
        COALESCE(SUM(json_extract(answers, '$.more') = 'Да'),0) AS want_more FROM reviews`),
      db.prepare('SELECT module, COUNT(*) AS n FROM reviews GROUP BY module')
    ]);
    return json({ ...totals.results[0], by_module: Object.fromEntries(modules.results.map(r => [r.module, r.n])) });
  }
  if (request.method === 'POST' && ['/api/survey', '/api/report'].includes(url.pathname)) {
    const body = await readBody(request);
    const result = url.pathname === '/api/survey' ? validateSurvey(body) : validateReport(body);
    if (!result.ok) return json({ error: result.error }, 400);
    if (!await allowWrite(request, db, Number(env.RATE_LIMIT_PER_MIN) || 20)) return json({ error: 'Too many requests. Try again in a minute.' }, 429, { 'Retry-After': '60' });
    if (result.report) return json({ source: 'rules', ...ruleBasedFeedback(result.report) });
    const s = result.survey; const id = s.id || crypto.randomUUID();
    const saved = await db.prepare(`INSERT INTO reviews (id, at, module, publish, answers, comment, score, time_sec, errors)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
      .bind(id, s.at, s.module, s.publish ? 1 : 0, JSON.stringify(s.answers), s.comment, s.score, s.time_sec, s.errors).run();
    const duplicate = saved.meta.changes === 0;
    return json({ ok: true, id, duplicate }, duplicate ? 200 : 201);
  }
  return json({ error: 'Not found' }, 404);
}
export default { fetch: handleApi };
