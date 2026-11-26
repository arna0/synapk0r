import { expect, test } from '@playwright/test';

test('the recipe transfers finish in order, and restarting cancels an active transfer', async ({ page }) => {
  test.setTimeout(90000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto('/?lang=en&module=barista', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#threeCanvas canvas')).toBeVisible();
  // Focus on tool choreography; each skill mini-game has its own input path.
  await page.evaluate(() => { showActionProgressBar = (_title, _duration, done) => done(); });
  for (let i = 0; i < 6; i++) {
    await page.evaluate(step => new Promise(resolve => executeStepAction(step, resolve)), i);
    expect(await page.evaluate(() => state.step)).toBe(i + 1);
  }
  expect(await page.evaluate(() => [pitcherObj.position.x, pitcherObj.rotation.z, cupObj.position.x, cupObj.position.z])).toEqual([.20, 0, 0, .12]);
  await page.evaluate(() => {
    startBaristaVR();
    window.cancelledTransferCompleted = false;
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    animateProp(cupObj, { position: [1, 2, 3] }, 1200, () => { window.cancelledTransferCompleted = true; });
    exitToHome(); startScenario('doctor');
  });
  await expect.poll(() => page.evaluate(() => !!scene.getObjectByName('doctorEnvironment'))).toBe(true);
  await page.waitForTimeout(1300);
  expect(await page.evaluate(() => window.cancelledTransferCompleted)).toBe(false);
  // Doctor and IT use the same smooth, cancellable transfer helper.
  await page.evaluate(() => new Promise(resolve => tweenObject(docTools.thermometer, { x: 0, y: 1.4, z: .2 }, 400, resolve)));
  expect(await page.evaluate(() => docTools.thermometer.position.y)).toBe(1.4);
  expect(errors).toEqual([]);
});
