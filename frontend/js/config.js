// SynapKor — runtime configuration.

// Where the backend API lives. Resolved at call time so a host (Flutter) can inject it later.
//  - served by backend/ (npm start): same origin, '' -> /api/report
//  - ?api=https://host in the URL, or window.SYNAPKOR_API_BASE set by the host app
//  - file:// (bundled in the mobile app) without an injected base: AI feedback is skipped
function getApiBase() {
  const fromQuery = apiFromQuery();
  if (fromQuery) return fromQuery;
  if (typeof window.SYNAPKOR_API_BASE === 'string') return window.SYNAPKOR_API_BASE.replace(/\/$/, '');
  return location.protocol.startsWith('http') ? '' : null;
}

// ?api= may only point at hosts listed here, so a crafted link can't send a player's
// session log to someone else's server. Add your deployed backend's origin to this list.
const ALLOWED_API_ORIGINS = ['http://localhost:8787', 'http://127.0.0.1:8787'];

function apiFromQuery() {
  const raw = new URLSearchParams(location.search).get('api');
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (ALLOWED_API_ORIGINS.includes(url.origin)) return url.origin;
    // Embedded in the SynapKor web app (Flutter iframe): the host app chose the backend
    if (window.parent !== window && /^https?:$/.test(url.protocol)) return url.origin;
  } catch (e) { /* not a URL */ }
  console.warn('[config] ?api= ignored: not in ALLOWED_API_ORIGINS');
  return null;
}
