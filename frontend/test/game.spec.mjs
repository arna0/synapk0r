import { expect, test } from '@playwright/test';

const rooms = [
  ['barista', 'Barista shift'],
  ['safety', /engineer|workshop|safety/i],
  ['it', 'IT engineer on call'],
  ['doctor', /doctor|patient|clinic|appointment/i],
];

function canvasFillsViewport(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#threeCanvas canvas');
    const viewport = document.querySelector('#viewportWrap');
    if (!canvas || !viewport) return false;
    const a = canvas.getBoundingClientRect();
    const b = viewport.getBoundingClientRect();
    return Math.abs(a.width - b.width) <= 2 && Math.abs(a.height - b.height) <= 2;
  });
}

for (const [module, title] of rooms) {
  test(`${module} renders and returns to the home screen`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?lang=en&module=' + module);
    await expect(page.locator('#introTitle')).toHaveText(title);
    await page.getByRole('button', { name: 'Got it, start' }).click();
    await expect(page.locator('#threeCanvas canvas')).toBeVisible();
    await expect.poll(() => canvasFillsViewport(page)).toBe(true);
    await page.getByRole('button', { name: /Back to menu|✕/ }).first().click();
    await expect(page.locator('#homeScreen')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('device-mode resize keeps the Barista viewport and guided input synchronized', async ({ page }) => {
  await page.goto('/?lang=en&module=barista');
  await page.getByRole('button', { name: 'Got it, start' }).click();
  await expect(page.locator('#threeCanvas canvas')).toBeVisible();
  await expect.poll(() => canvasFillsViewport(page)).toBe(true);
  await page.locator('#gameBtnModeMobile').click();
  await expect(page.locator('#desktopAimHint')).toBeHidden();
  await expect.poll(() => canvasFillsViewport(page)).toBe(true);
  await page.locator('#gameBtnModeDesktop').click();
  await expect.poll(() => canvasFillsViewport(page)).toBe(true);
  await page.locator('#guidedAction').click();
  await expect(page.locator('#guideTask')).toContainText(/Grind/i);
  await page.locator('#guidedAction').click();
  await expect(page.getByRole('dialog').filter({ hasText: 'Grinding' })).toBeVisible();
  await page.getByRole('button', { name: /Back to menu|✕/ }).first().click();
  await expect(page.locator('#homeScreen')).toBeVisible();
  await expect(page.getByRole('dialog').filter({ hasText: 'Grinding' })).toHaveCount(0);
});
