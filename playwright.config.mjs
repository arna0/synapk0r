import { defineConfig } from '@playwright/test';

export default defineConfig({
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
    command: 'node backend/src/server.js',
    url: 'http://127.0.0.1:8787/api/health',
  },
});
