import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const code = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
function resolve(url, override) {
  const location = new URL(url); const window = {}; window.parent = window;
  if (override !== undefined) window.SYNAPKOR_API_BASE = override;
  const ctx = vm.createContext({ URL, URLSearchParams, location, window, console: { warn() {} } });
  vm.runInContext(code, ctx); return vm.runInContext('getApiBase()', ctx);
}
test('GitHub Pages uses the production API automatically', () => assert.equal(resolve('https://arna0.github.io/synapk0r/frontend/'), 'https://synapkor-api.epictitan2048.chatgpt.site'));
test('local and mobile retain their existing API behavior', () => {
  assert.equal(resolve('http://127.0.0.1:8787/'), ''); assert.equal(resolve('file:///assets/index.html'), null);
  assert.equal(resolve('file:///assets/index.html', 'https://custom.example/'), 'https://custom.example');
});
test('arbitrary query parameters cannot send reviews to a third party', () => assert.equal(resolve('https://arna0.github.io/synapk0r/?api=https://untrusted.example'), 'https://synapkor-api.epictitan2048.chatgpt.site'));
