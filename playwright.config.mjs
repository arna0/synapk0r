import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const surveyFile = join(mkdtempSync(join(tmpdir(), 'synapkor-browser-')), 'survey.jsonl');

export default defineConfig({
  // Cold software WebGL compilation on Windows takes 20–25 seconds per room.
  // Keep assertions at their normal 5-second deadline; allow whole user flows 60s.
  timeout: 60000,
  // Software WebGL scenes are expensive; keep CI resource measurements deterministic.
  workers: process.env.CI ? 1 : undefined,
  testDir: './frontend/test',
  testMatch: '**/*.spec.mjs',
  use: {
    baseURL: 'http://127.0.0.1:8787',
    viewport: { width: 1280, height: 720 },
    launchOptions: { args: ['--use-angle=swiftshader'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: process.env.TEST_CLOUD === '1' ? 'node scripts/serve-cloud.mjs' : 'node backend/src/server.js',
    env: { SURVEY_FILE: surveyFile, RATE_LIMIT_PER_MIN: '500', HOST: '127.0.0.1' },
    url: 'http://127.0.0.1:8787/api/health',
  },
});
