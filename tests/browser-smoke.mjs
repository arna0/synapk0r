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

async function finishChallenge(page, option, expectedDecision, evidence) {
  await page.locator('#introOverlay .btn-start').click();
  await chooseObject(page, 'serverDb'); // A wrong object gets a hint and leaves the step active.
  await page.locator('#guideToast.show').waitFor();
  await chooseObject(page, 'monitorDash');
  await chooseObject(page, 'terminal');
  await waitForText(page, evidence);
  assert.match(await page.locator('.case-log').textContent(), new RegExp(evidence));
  await page.getByRole('button', { name: option }).click();
  await page.locator('#victoryModal .btn-action').click();
  await page.locator('#localDebrief').waitFor();
  assert.equal(await page.locator('#statHands').textContent(), expectedDecision);
  assert.equal(await page.locator('#statSoft').textContent(), evidence);
  assert.equal(await page.evaluate(() => itWorldStatus), expectedDecision === 'Correct' ? 'working' : 'down');
}

async function openRoom(page, module) {
  await page.goto(`${base}/frontend/?module=${module}&lang=en`, { waitUntil: 'domcontentloaded' });
  await page.locator('#introOverlay.visible .btn-start').click();
  await page.waitForFunction((id) => {
    const room = scene?.getObjectByName(id + 'Environment');
    return room?.getObjectByName('roomAtmosphere') && renderer?.info.render.calls > 0;
  }, module);
}

async function playGuidedIncident(page) {
  await openRoom(page, 'it');
  await chooseObject(page, 'monitorDash');
  const alertChoices = page.locator('.mg-choice');
  for (const text of [/Checkout: 38%/, /db-01 not answering/, /disk 81% full/, /SSL certificate expires/]) {
    await alertChoices.filter({ hasText: text }).click();
  }
  await chooseObject(page, 'terminal');
  await page.getByRole('button', { name: /lost connection to db-01/ }).click();
  await chooseObject(page, 'serverDb');
  await page.locator('.mg-port.is-dead').click();
  await chooseObject(page, 'patchCable');
  await page.waitForFunction(() => itWorldStatus === 'working');
  await chooseObject(page, 'terminal');
  for (const text of ['sudo', 'systemctl', 'restart', 'shop-api']) {
    await page.getByRole('button', { name: text, exact: true }).click();
  }
  await chooseObject(page, 'monitorDash');
  await page.waitForFunction(() => itWorldStatus === 'restored');
  await page.locator('.scenario-option').nth(1).click();
  await page.locator('.scenario-option').nth(1).click();
  await page.locator('#victoryModal .btn-action').click();
  await page.locator('#itChallengeButton').waitFor();
  await page.locator('#localDebrief').waitFor();
}

async function checkRoomEffects(page) {
  await openRoom(page, 'barista');
  await chooseObject(page, 'portafilter');
  await page.waitForFunction(() => state.step === 1 && Math.abs(portafilterObj.position.x + 1.18) < 0.01);
  await page.screenshot({ path: `${screenshotDir}/barista-room.png` });

  await openRoom(page, 'doctor');
  await chooseObject(page, 'patientCard');
  await page.waitForFunction(() => scenarioState.step === 1);
  await page.screenshot({ path: `${screenshotDir}/doctor-room.png` });

  await openRoom(page, 'safety');
  await chooseObject(page, 'ppeStand');
  await page.locator('.mg').waitFor();
  // Leave during the hazard scan and confirm the next room starts clean.
  await page.locator('.btn-exit-vr').click();
  await page.locator('#homeScreen.active').waitFor();
  assert.equal(await page.locator('.mg').count(), 0);
  await openRoom(page, 'safety');
  await page.screenshot({ path: `${screenshotDir}/safety-room.png` });
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await desktop.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await desktop.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('**/api/**', route => route.abort());
  await page.goto(`${base}/frontend/?lang=en`, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: `${screenshotDir}/web-home.png` });
  await page.goto(`${base}/frontend/?module=it&variant=challenge&lang=en`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('introTitle').textContent === 'IT engineer on call: new incident');
  await finishChallenge(page, /backup server’s disk/, 'Wrong', 'PAYMENT_REGION');
  await waitForText(page.locator('#localImprovements'), 'The log shows PAYMENT_REGION was missing');
  await page.screenshot({ path: `${screenshotDir}/it-challenge-result.png`, fullPage: true });

  await page.locator('#resultScreen button').filter({ hasText: 'Try again' }).click();
  await finishChallenge(page, /All database connections are in use/, 'Correct', 'POOL_TIMEOUT');
  await waitForText(page.locator('#localStrengths'), 'You spotted that the database ran out of available connections');
  assert.equal(await page.locator('#localImprovements').getByText('The log shows PAYMENT_REGION was missing', { exact: false }).count(), 0);
  await page.locator('#resultScreen button').filter({ hasText: 'Try again' }).click();
  await finishChallenge(page, /read-only after failover/, 'Correct', 'READ_ONLY');
  await waitForText(page.locator('#localStrengths'), 'You linked the write failure');
  await playGuidedIncident(page);
  await checkRoomEffects(page);
  assert.deepEqual(errors, []);
  await desktop.close();

  const phone = await browser.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1 });
  await phone.route('https://fonts.googleapis.com/**', route => route.abort());
  const mobile = await phone.newPage();
  await mobile.goto(`${base}/frontend/?module=it&lang=kk`, { waitUntil: 'domcontentloaded' });
  const mobileErrors = [];
  mobile.on('pageerror', error => mobileErrors.push(error.message));
  const start = mobile.locator('#introOverlay.visible .btn-start');
  try {
    await start.tap();
  } catch (error) {
    console.error('Mobile start failed:', mobile.url(), mobileErrors);
    await mobile.screenshot({ path: `${screenshotDir}/mobile-launch-failure.png`, timeout: 5000 }).catch(() => {});
    throw error;
  }
  await mobile.waitForFunction(() => document.getElementById('guideTask').textContent === 'Мониторинг ескертуін оқыңыз');
  await mobile.screenshot({ path: `${screenshotDir}/it-kazakh-mobile.png` });
  console.log('Browser smoke passed: three IT cases, guided incident, four room launches, exit mid-action, Kazakh touch launch, and offline report.');
} finally {
  await browser.close();
}
