import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function openRoom(page, module = 'it') {
  await page.goto(`/?lang=en&module=${module}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Got it, start' }).click();
  await expect(page.locator('#threeCanvas canvas')).toBeVisible();
}

test('one objective exposes every step in a keyboard-accessible checklist', async ({ page }) => {
  await openRoom(page);
  const count = await page.evaluate(() => SCENARIOS.it.steps.length + SCENARIOS.it.decisions.length);
  await expect(page.locator('#guideStepCount')).toHaveText(`Step 1 of ${count}`);
  await expect(page.getByRole('progressbar', { name: 'Run progress' })).toHaveAttribute('aria-valuemax', String(count));
  await expect(page.locator('.scn-goal')).toBeHidden();
  await expect(page.locator('#guideSteps')).toBeHidden();
  await page.locator('#guideChecklistLabel').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#guideSteps li')).toHaveCount(count);
  await expect(page.locator('#guideSteps')).toBeVisible();
});

test('mini-game has a name, traps focus, labels port evidence and returns focus', async ({ page }) => {
  await openRoom(page);
  await page.locator('#guidedAction').focus();
  await page.evaluate(() => mgPorts(() => {}));
  const dialog = page.getByRole('dialog', { name: 'db-01, rear panel' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button').first()).toBeFocused();
  await expect(dialog.getByRole('button', { name: /eth\d: No link/ })).toHaveCount(1);
  await expect(dialog.locator('.mg-led').first()).toHaveCSS('animation-name', 'none');
  await dialog.getByRole('button').last().focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button').first()).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button').last()).toBeFocused();
  await page.keyboard.down('w');
  expect(await page.evaluate(() => player.keys.KeyW)).toBeFalsy();
  await page.keyboard.up('w');
  await page.evaluate(() => mgActive.close());
  await expect(page.locator('#guidedAction')).toBeFocused();
});

test('Doctor has a visible review boundary and keyboard textual lung observations', async ({ page }) => {
  await page.goto('/?lang=en&module=doctor', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#doctorLearningNotice')).toContainText('without clinical review');
  await page.getByRole('button', { name: 'Got it, start' }).click();
  await page.evaluate(() => mgLungs(() => {}));
  const dialog = page.getByRole('dialog', { name: 'Listening to the lungs' });
  for (const name of ['Upper left', 'Upper right', 'Middle left', 'Middle right', 'Lower left', 'Lower right']) {
    await dialog.getByRole('button', { name, exact: true }).focus();
    await page.keyboard.press('Enter');
  }
  await expect(dialog.getByRole('status')).toContainText('crackling sounds');
  await expect(dialog.getByRole('status')).toContainText('6/6');
  await page.evaluate(() => { mgActive.close(); mgBloodPressure(() => {}); });
  await page.getByRole('button', { name: 'Review the record without sound or a timer' }).click();
  await expect(page.getByRole('dialog', { name: 'Blood pressure record' })).toBeVisible();
  await page.getByRole('button', { name: '125/80 mmHg', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'matches the observation' })).toBeVisible();
});

test('live voltage persists until escalation and never completes the verification step', async ({ page }) => {
  await openRoom(page, 'safety');
  await page.evaluate(() => {
    safetyRun.voltageFault = true;
    mgVoltage(result => { window.voltageResult = result; });
  });
  await page.getByRole('button', { name: 'L3', exact: true }).click();
  await page.getByRole('button', { name: 'PE', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '231.4 V' })).toBeVisible();
  await page.getByRole('button', { name: 'Live — stop', exact: true }).focus();
  await page.keyboard.press('Enter');
  const escalation = page.getByRole('dialog', { name: 'Stop and escalate' });
  await expect(escalation).toBeVisible();
  expect(await page.evaluate(() => safetyRun.voltageFault)).toBe(true);
  await escalation.getByRole('button', { name: 'Remove the lock and continue the repair', exact: true }).click();
  await expect(escalation.getByRole('status')).toContainText('remains blocked');
  expect(await page.evaluate(() => window.voltageResult)).toBeUndefined();
  await escalation.getByRole('button', { name: 'Keep the lock, stop work, and notify the supervisor', exact: true }).click();
  await escalation.getByRole('button', { name: 'Acknowledge isolation and retest', exact: true }).click();
  expect(await page.evaluate(() => ({ result: window.voltageResult, fault: safetyRun.voltageFault, verified: safetyState.voltageTested, errors: safetyState.errors }))).toEqual({ result: 'fault', fault: false, verified: false, errors: 1 });
});
