// SynapKor backend: REST API for AI feedback + static hosting of the web client (../frontend).

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReport } from './validate.js';
import { aiConfigured, generateFeedback } from './feedback.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(here, '../../frontend');
const PORT = Number(process.env.PORT) || 8787;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

// Simple per-IP limit so a public demo can't burn the API budget
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN) || 20;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT_PER_MIN;
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  // CORS for the Flutter web build / GitHub Pages client
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes('*')) res.setHeader('Access-Control-Allow-Origin', '*');
    else if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, ai: aiConfigured() });
  });

  app.post('/api/report', async (req, res, next) => {
    if (rateLimited(req.ip)) return res.status(429).json({ error: 'Too many requests, try again in a minute' });
    const result = validateReport(req.body);
    if (!result.ok) return res.status(400).json({ error: result.error });
    try {
      res.json(await generateFeedback(result.report));
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // Web client
  app.use(express.static(FRONTEND_DIR));

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
    console.error('[server] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createApp().listen(PORT, () => {
    console.log(`SynapKor backend: http://localhost:${PORT}`);
    console.log(`AI feedback: ${aiConfigured() ? 'Claude API enabled' : 'no ANTHROPIC_API_KEY, rule-based fallback'}`);
  });
}
