// SynapKor — runtime configuration.

// Where the backend API lives. Resolved at call time so a host (Flutter) can inject it later.
//  - served by backend/ (npm start): same origin, '' -> /api/report
//  - ?api=https://host in the URL, or window.SYNAPKOR_API_BASE set by the host app
//  - file:// (bundled in the mobile app) without an injected base: AI feedback is skipped
function getApiBase() {
  const fromQuery = new URLSearchParams(location.search).get('api');
  if (fromQuery) return fromQuery.replace(/\/$/, '');
  if (typeof window.SYNAPKOR_API_BASE === 'string') return window.SYNAPKOR_API_BASE.replace(/\/$/, '');
  return location.protocol.startsWith('http') ? '' : null;
}
