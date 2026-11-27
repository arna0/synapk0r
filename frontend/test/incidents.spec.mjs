import { expect, test } from '@playwright/test';

test('three IT incidents require different repairs and verified checkout; weak repairs affect the report', async ({ page }, testInfo) => {
  test.setTimeout(600000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.addLocatorHandler(page.locator('.interrupt-card'), async card => {
    await card.getByRole('button', { name: /5/ }).click();
  });
  const cases = [
    ['network-link', /Network is unreachable/, /network cable is disconnected/, /Reconnect and secure/],
    ['database-service', /Connection refused/, /PostgreSQL is stopped/, /sudo systemctl start postgresql/],
    ['release-config', /password authentication failed/, /incorrect credentials to a running database/, /approved shop-api rollback/]
  ];
  async function openExercise() {
    await expect(page.locator('.mg')).toHaveCount(0);
    // A queued manager call may consume the attempted action before the exercise opens.
    await expect(async () => {
      if (await page.locator('.mg').count()) return;
      await page.locator('#guidedAction').click();
      await expect(page.locator('.mg')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20000 });
  }
  async function choose(pattern) {
    await page.locator('.mg').getByRole('button', { name: pattern }).click();
  }
  for (const [index, [caseId, evidence, diagnosis, repair]] of cases.entries()) {
    await page.goto('/?lang=en&module=it', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Got it, start' }).click();
    await expect.poll(() => page.evaluate(() => scenarioState.caseId)).toBe(caseId);
    if (index === 0) {
      await expect(page.locator('#threeCanvas canvas')).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('it-initial-play.png'), fullPage: true });
    }
    await openExercise();
    await choose(/Customers cannot pay/);
    await openExercise();
    await choose(evidence);
    await openExercise();
    await choose(diagnosis);
    await openExercise();
    if (index === 0) {
      for (let attempt = 0; attempt < 3; attempt++) await choose(/Restart shop-api without addressing/);
      await expect(page.locator('.mg-hint')).toContainText(/does not fix/);
      expect(await page.evaluate(() => itRun.repaired)).toBe(false);
    }
    await choose(repair);
    await openExercise();
    await choose(/Service and database are ready/);
    expect(await page.evaluate(() => scenarioState.restorationTime)).toBeNull();
    await choose(/Order created and persisted/);
    // Completion includes mini-game feedback and the recovery banner before the decision.
    await expect(page.locator('.scn-code')).toBeVisible({ timeout: 15000 });
    const restored = await page.evaluate(() => scenarioState.restorationTime);
    expect(restored).toBeGreaterThan(0);
    // The code review occurs after recovery, so spending time here must not extend it.
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => state.timer)).toBe(restored);
    await page.locator('.dialog-option').filter({ hasText: /if not orders: return 0/ }).click();
    await page.locator('.dialog-option').filter({ hasText: /test order was created and persisted/ }).click();
    await expect(page.locator('#victoryModal')).toBeVisible();
    await page.locator('#victoryModal button').click();
    await expect(page.locator('#resultScreen')).toBeVisible();
    await expect(page.locator('#statTime')).toHaveText(restored + ' sec');
    await expect(page.locator('#assessmentEvidence')).toContainText('Guided practice');
    if (index === 0) {
      await expect(page.locator('#resVerdictGrade')).toHaveText('Further practice needed');
      await expect(page.locator('#assessmentEvidence')).toContainText('Recovery command: 40%');
      await expect(page.locator('.assessment-next')).toContainText(/command|repair/i);
    } else {
      await expect(page.locator('#resFitScore')).toHaveText('100%');
    }
    await page.screenshot({ path: testInfo.outputPath(caseId + '-report.png'), fullPage: true });
  }
  expect(errors).toEqual([]);
});
