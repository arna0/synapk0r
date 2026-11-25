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

async function clickSceneObject(page, name) {
  const point = await page.evaluate(objectName => {
    const object = interactiveObjects.find(item => item.name === objectName);
    const projected = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).project(camera);
    const bounds = renderer.domElement.getBoundingClientRect();
    const centerX = ((projected.x + 1) * bounds.width) / 2 + bounds.left;
    const centerY = ((1 - projected.y) * bounds.height) / 2 + bounds.top;
    const sample = new THREE.Vector2();
    for (const offset of [0, 8, -8, 16, -16, 24, -24, 32, -32]) {
      for (const dx of [0, 8, -8, 16, -16, 24, -24, 32, -32]) {
        const x = Math.round(centerX + dx);
        const y = Math.round(centerY + offset);
        if (document.elementFromPoint(x, y) !== renderer.domElement) continue;
        sample.set(((x - bounds.left) / bounds.width) * 2 - 1, 1 - ((y - bounds.top) / bounds.height) * 2);
        if (getSceneInteractionTarget(sample) === object) return { x, y };
      }
    }
    return null;
  }, name);
  assert.ok(point, `No unobstructed click target found for ${name}`);
  await page.mouse.click(point.x, point.y);
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
  const recoveryOptions = {
    PAYMENT_REGION: 'Roll back to the last working release',
    POOL_TIMEOUT: 'Reduce load on the booking service',
    READ_ONLY: 'Route writes to the writable node'
  };
  if (evidence === 'PAYMENT_REGION') {
    await page.getByRole('button', { name: recoveryOptions.POOL_TIMEOUT }).click();
    await waitForText(page.locator('#itRecoveryStatus'), 'The outage persists');
    assert.equal(await page.evaluate(() => itWorldStatus), 'down');
  }
  await page.getByRole('button', { name: recoveryOptions[evidence] }).click();
  await waitForText(page.locator('#victoryModal'), 'HTTP 200');
  await page.locator('#victoryModal .btn-action').click();
  await page.locator('#localDebrief').waitFor();
  assert.equal(await page.locator('#statHands').textContent(), expectedDecision);
  assert.equal(await page.locator('#statSoft').textContent(), evidence);
  assert.equal(await page.evaluate(() => itWorldStatus), 'restored');
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
  await page.screenshot({ path: `${screenshotDir}/it-server-room.png` });
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
  await page.getByRole('button', { name: 'Capture mouse' }).click();
  await waitForText(page.locator('#desktopAimHint'), 'Mouse capture unavailable');
  await clickSceneObject(page, 'portafilter');
  await page.waitForFunction(() => state.step === 1 && Math.abs(portafilterObj.position.x + 1.18) < 0.01);
  await page.screenshot({ path: `${screenshotDir}/barista-room.png` });
  await page.evaluate(() => startQuest2Conflict());
  await page.getByRole('button', { name: 'Serve the two queued orders first' }).click();
  await waitForText(page.locator('.service-outcome'), 'waited without an explanation');
  await page.screenshot({ path: `${screenshotDir}/cafe-tradeoff.png` });
  await page.getByRole('button', { name: /Sorry about the mistake/ }).click();
  await page.locator('.dialog-option').filter({ hasText: /90[ ,]000/ }).click();
  await page.locator('#victoryModal .btn-action').click();
  const form = page.locator('#careerReflection form');
  const score = await page.locator('#resFitScore').textContent();
  await form.locator('[name=enjoyed]').selectOption('Приготовление напитка');
  await form.locator('[name=drained]').selectOption('Распределение заказов');
  await form.locator('[name=again]').selectOption('Хочу попробовать ещё');
  await form.getByRole('button', { name: 'Save reflection' }).click();
  await waitForText(form, 'Reflection saved on this device');
  assert.equal(await page.locator('#resFitScore').textContent(), score);
  await page.screenshot({ path: `${screenshotDir}/career-reflection.png`, fullPage: true });
  await page.locator('#resultScreen button').filter({ hasText: 'Main menu' }).click();
  await waitForText(page.locator('#careerProfile'), 'I’d try this again');

  await openRoom(page, 'doctor');
  const details = page.locator('#guideDetails');
  assert.equal(await details.getAttribute('open'), null);
  await details.locator('summary').focus();
  await page.keyboard.press('Space');
  await page.locator('#guideHow').waitFor();
  await page.keyboard.press('Space');
  assert.equal(await details.getAttribute('open'), null);
  await page.evaluate(() => { interruptAt = 1; });
  await chooseObject(page, 'patientCard');
  await page.waitForFunction(() => scenarioState.step === 1);
  await page.locator('.interrupt-card').waitFor();
  await page.screenshot({ path: `${screenshotDir}/doctor-room.png` });

  // Stay on the same document so navigation cannot hide leaked overlays or listeners.
  await page.locator('.btn-exit-vr').click();
  await page.locator('#homeScreen.active').waitFor();
  assert.equal(await page.locator('.interrupt-card').count(), 0);
  await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Safety engineer', exact: true }) })
    .getByRole('button', { name: 'Start simulation' }).click();
  await page.locator('#introOverlay.visible .btn-start').click();
  assert.equal(await page.locator('.interrupt-card').count(), 0);
  await chooseObject(page, 'ppeStand');
  await page.locator('.mg').waitFor();
  // Leave during the hazard scan and confirm the next room starts clean.
  await page.locator('.btn-exit-vr').click();
  await page.locator('#homeScreen.active').waitFor();
  assert.equal(await page.locator('.mg').count(), 0);
  await openRoom(page, 'safety');
  await page.evaluate(() => operateValve(0));
  await waitForText(page.locator('#safetyAlertBanner'), 'The valve stayed closed');
  assert.deepEqual(await page.evaluate(() => ({ errors: safetyState.errors, open: safetyState.valvesOpened[0] })), { errors: 1, open: false });
  await page.screenshot({ path: `${screenshotDir}/safety-room.png` });
}

try {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ...(process.env.SYNAPKOR_RECORD_VIDEO === '1' && {
      recordVideo: { dir: `${screenshotDir}/video`, size: { width: 960, height: 540 } }
    })
  });
  await desktop.addInitScript(() => {
    Element.prototype.requestPointerLock = () =>
      Promise.reject(new DOMException('Pointer capture unavailable in test', 'NotAllowedError'));
  });
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
  console.log('Browser smoke passed: three IT cases, guided incident, four room launches, real 3D click after capture rejection, keyboard guide, clinic-to-safety cleanup, exit mid-action, Kazakh touch launch, offline report, café priorities, local reflection, and the safety checklist guard.');
} finally {
  await browser.close();
}
