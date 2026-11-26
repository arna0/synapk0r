// Local QA only. Production uses the hosting platform's persistent D1 binding.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createApp } from '../backend/src/server.js';
import { handleApi } from '../cloud/worker.js';
import { database } from '../cloud/test/database.mjs';
const args = process.argv.slice(2);
const argument = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const port = Number(argument('--port', '8787'));
const host = argument('--host', '127.0.0.1');
const DB = database(); const app = createApp();
const server = createServer(async (req, res) => {
  if (!req.url.startsWith('/api/')) return app(req, res);
  try {
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const request = new Request(`${protocol}://${req.headers.host}` + req.url, {
      method: req.method, headers: req.headers,
      ...(!['GET', 'HEAD'].includes(req.method) ? { body: Readable.toWeb(req), duplex: 'half' } : {})
    });
    const response = await handleApi(request, { DB, RATE_LIMIT_PER_MIN: process.env.RATE_LIMIT_PER_MIN || '20' });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end(); }
});
server.listen(port, host, () => console.log(`SynapKor cloud preview: http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { DB.close(); process.exit(0); }));
