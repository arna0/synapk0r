import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, devices } from 'playwright';

const base = process.env.SYNAPKOR_TEST_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({
  headless: process.env.SYNAPKOR_HEADED !== '1',
  args: ['--enable-unsafe-swiftshader']
});
const screenshotDir = process.env.SYNAPKOR_SCREENSHOTS || 'screenshots';
await mkdir(screenshotDir, { recursive: true });

async function waitForText(locator, expected) {
  await locator.getByText(expected, { exact: false }).first().waitFor();
}

async function chooseObject(page, name) {
  // Aim at a known 3D object and send the same interaction input a player uses.
  await page.waitForFunction((objectName) => !isActionInProgress && interactiveObjects.some(obj => obj.name === objectName), name);
  await page.evaluate((objectName) => {
    const target = interactiveObjects.find(obj => obj.name === objectName);
    hoveredObject = target;
    triggerCenterInteraction();
  }, name);
}

async function finishChallenge(page, option, expectedDecision) {
  await page.locator('#introOverlay .btn-start').click();
  await chooseObject(page, 'serverDb'); // A wrong object gets a hint and leaves the step active.
  await page.locator('#guideToast.show').waitFor();
  await chooseObject(page, 'monitorDash');
  await chooseObject(page, 'terminal');
  await page.locator('.case-log').waitFor();
  await page.getByRole('button', { name: option }).click();
  await page.locator('#victoryModal .btn-action').click();
  await page.locator('#localDebrief').waitFor();
  assert.equal(await page.locator('#statHands').textContent(), expectedDecision);
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await desktop.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.abort());
  await page.goto(`${base}/frontend/?lang=en`, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: `${screenshotDir}/web-home.png` });
  await page.goto(`${base}/frontend/?module=it&variant=challenge&lang=en`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('introTitle').textContent === 'IT engineer on call: new incident');
  await finishChallenge(page, /backup server’s disk/, 'Wrong');
  await waitForText(page.locator('#localImprovements'), 'The log shows PAYMENT_REGION was missing');
  await page.screenshot({ path: `${screenshotDir}/it-challenge-result.png`, fullPage: true });

  await page.locator('#resultScreen button').filter({ hasText: 'Try again' }).click();
  await finishChallenge(page, /new release is missing PAYMENT_REGION/, 'Correct');
  await waitForText(page.locator('#localStrengths'), 'You linked the outage to PAYMENT_REGION');
  assert.equal(await page.locator('#localImprovements').getByText('The log shows PAYMENT_REGION was missing', { exact: false }).count(), 0);
  assert.deepEqual(errors, []);

  const phone = await browser.newContext(devices['Pixel 7']);
  const mobile = await phone.newPage();
  await mobile.goto(`${base}/frontend/?module=it&lang=kk`, { waitUntil: 'domcontentloaded' });
  await mobile.locator('#introOverlay .btn-start').tap();
  await mobile.waitForFunction(() => document.getElementById('guideTask').textContent === 'Мониторинг ескертуін оқыңыз');
  await mobile.screenshot({ path: `${screenshotDir}/it-kazakh-mobile.png` });
  console.log('Browser smoke passed: desktop wrong answer and replay, Kazakh mobile launch, offline report.');
} finally {
  await browser.close();
}
