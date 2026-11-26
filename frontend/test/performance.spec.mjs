import { expect, test } from '@playwright/test';

test('restarting rooms releases GPU resources and the menu stops rendering', async ({ page }) => {
  test.setTimeout(150000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto('/?lang=en&module=barista', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#threeCanvas canvas')).toBeVisible();
  const samples = [];
  for (let i = 0; i < 3; i++) {
    await expect.poll(() => page.evaluate(() => !!scene.getObjectByName('baristaEnvironment')?.getObjectByName('roomDetails'))).toBe(true);
    // Wait for the one delayed texture pass, so every sample measures the same scene.
    await page.waitForTimeout(1800);
    samples.push(await page.evaluate(() => ({ geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures })));
    if (i < 2) {
      await page.evaluate(() => { exitToHome(); startBaristaVR(); });
      await page.waitForTimeout(150);
    }
  }
  expect(samples[2].geometries - samples[1].geometries).toBeLessThanOrEqual(3);
  expect(samples[2].textures - samples[1].textures).toBeLessThanOrEqual(3);
  await page.evaluate(() => {
    window.renderCallsAfterMenu = 0;
    const original = renderer.render.bind(renderer);
    renderer.render = (...args) => { window.renderCallsAfterMenu++; return original(...args); };
    exitToHome();
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.renderCallsAfterMenu)).toBeLessThanOrEqual(1);
  await page.evaluate(() => startScenario('it'));
  await expect.poll(() => page.evaluate(() => window.renderCallsAfterMenu)).toBeGreaterThan(1);
  expect(errors).toEqual([]);
  console.log('GPU allocations across restarts:', JSON.stringify(samples));
});
