import { expect, test } from '@playwright/test';

const answers = { role: '10–11 класс', before: '2', clarity: '5', guide: 'Да', no_help: 'Да', learned: 'Да', report_match: '4', more: 'Да' };
async function fillSurvey(page, comment, publish = true) {
  await page.goto('/?lang=en', { waitUntil: 'domcontentloaded' });
  // Set up the same report card that each completed module renders.
  await page.evaluate(() => {
    showScreen('resultScreen');
    showSurvey({ module: 'barista', score: 84, metrics: { total_time_sec: 60, wrong_clicks: 1 } });
  });
  await page.locator('#reportSurveyToggle').click();
  await expect(page.locator('#surveySubmit')).toBeDisabled();
  for (const [id, value] of Object.entries(answers)) await page.locator(`button.survey-opt[data-q="${id}"][data-v="${value}"]`).click();
  await page.locator('#surveyComment').fill(comment);
  await expect(page.locator('#surveyPublish')).not.toBeChecked();
  if (publish) await page.locator('#surveyPublish').check();
  await page.locator('#surveySubmit').click();
}

test('feedback is private by default and stays private after an offline retry', async ({ page, request }) => {
  const comment = 'Private feedback ' + Date.now();
  await page.route('**/api/survey', route => route.fulfill({ status: 503, body: '{}' }));
  await fillSurvey(page, comment, false);
  await expect(page.locator('.survey-thanks')).toContainText('Saved on this device');
  await page.unroute('**/api/survey');
  await page.reload();
  await expect.poll(() => page.evaluate(text => loadSurveyResponses().find(row => row.comment === text)?.synced, comment)).toBe(true);
  const reviews = await (await request.get('/api/reviews')).json();
  expect(reviews.reviews.some(row => row.comment === comment)).toBe(false);
  expect(await page.evaluate(text => loadSurveyResponses().find(row => row.comment === text).publish, comment)).toBe(false);
});

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
});

test('slow queued uploads do not block public reading and language switching works', async ({ page }) => {
  await page.addInitScript((answers) => {
    localStorage.setItem('synapkor_survey_v1', JSON.stringify([{ id: crypto.randomUUID(), module: 'barista', publish: true, synced: false, answers }]));
  }, answers);
  await page.route('**/api/survey', async route => {
    await new Promise(resolve => setTimeout(resolve, 4000));
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }).catch(() => {});
  });
  await page.goto('/testers-opinion.html?lang=en', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#opinionList')).toHaveAttribute('aria-busy', 'false', { timeout: 2500 });
  await page.locator('#opinionsLanguage').selectOption('kk');
  await expect(page.locator('html')).toHaveAttribute('lang', 'kk');
  await expect(page.locator('#opinionRefresh')).toHaveText('Жаңарту');
});

test('submission appears for a second visitor, renders text safely, and retains all answers', async ({ page, browser }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const comment = 'Review ' + Date.now() + ' <img src=x onerror="window.reviewInjected=true">';
  await fillSurvey(page, comment);
  await expect(page.locator('.survey-thanks')).toContainText('Your review is published');
  await page.locator('.survey-thanks .testers-link').click();
  await expect(page).toHaveURL(/testers-opinion.html.*lang=en/);
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto('http://127.0.0.1:8787/testers-opinion.html?lang=en');
  const card = publicPage.locator('.opinion-card').filter({ hasText: comment });
  await expect(card).toBeVisible();
  await expect(card.locator('img')).toHaveCount(0);
  await card.locator('summary').click();
  await expect(card.locator('dd')).toHaveCount(8);
  await expect(card.locator('dl')).toContainText('Grades 10–11');
  expect(await publicPage.evaluate(() => window.reviewInjected)).toBeUndefined();
  await publicPage.locator('#opinionModule').selectOption('doctor');
  await expect(publicPage.locator('.opinion-card').filter({ hasText: comment })).toHaveCount(0);
  await publicPage.locator('#opinionsBack').click();
  await expect(publicPage.locator('#homeScreen')).toBeVisible();
  expect(errors).toEqual([]);
  await visitor.close();
});

test('failed upload stays queued and a later visit retries it once', async ({ page }) => {
  const comment = 'Offline queue ' + Date.now();
  await page.route('**/api/survey', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Temporarily unavailable"}' }));
  await fillSurvey(page, comment);
  await expect(page.locator('.survey-thanks')).toContainText('Saved on this device');
  await expect(page.locator('.survey-thanks')).not.toContainText('published');
  expect(await page.evaluate(() => loadSurveyResponses().find(row => row.comment.startsWith('Offline queue')).synced)).toBe(false);
  await page.unroute('**/api/survey');
  await page.goto('/testers-opinion.html?lang=en');
  await expect(page.locator('.opinion-card').filter({ hasText: comment })).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.opinion-card').filter({ hasText: comment })).toHaveCount(1);
  expect(await page.evaluate(() => loadSurveyResponses().find(row => row.comment.startsWith('Offline queue')).synced)).toBe(true);
});

test('unavailable reviews show a retry state, then recover, with no phone overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/reviews?*', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
  await page.goto('/testers-opinion.html?lang=en');
  await expect(page.locator('#opinionStatus')).toContainText('unavailable');
  await expect(page.locator('#opinionRefresh')).toBeEnabled();
  await page.unroute('**/api/reviews?*');
  await page.locator('#opinionRefresh').click();
  await expect(page.locator('#opinionStatus')).not.toContainText('unavailable');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('homepage motion responds to pointer and respects reduced motion', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('.hero-stage').hover({ position: { x: 30, y: 30 } });
  await expect.poll(() => page.locator('.hero-stage').evaluate(el => el.style.getPropertyValue('--stage-x'))).not.toBe('');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.stage-window')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.stage-float').first()).toHaveCSS('animation-name', 'none');
});

test('every page of reviews remains reachable by scrolling and loading more', async ({ page, request }) => {
  const batch = 'pagination-' + Date.now();
  for (let i = 0; i < 21; i++) {
    const response = await request.post('/api/survey', { data: { id: batch + '-' + i, module: 'doctor', publish: true, answers, comment: batch + ' review ' + i } });
    expect(response.status()).toBe(201);
  }
  await page.goto('/testers-opinion.html?lang=en');
  await page.locator('#opinionModule').selectOption('doctor');
  await expect(page.locator('.opinion-card').filter({ hasText: batch })).toHaveCount(20);
  await page.locator('#opinionMore').click();
  await expect(page.locator('.opinion-card').filter({ hasText: batch })).toHaveCount(21);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.locator('#opinionMore')).toBeHidden();
});
