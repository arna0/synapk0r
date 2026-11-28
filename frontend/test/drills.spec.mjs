import { test, expect } from '@playwright/test';

async function report(page, module = 'doctor') {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto('/?lang=en', { waitUntil: 'domcontentloaded' });
  return page.evaluate(module => {
    localStorage.setItem('synapkor_profile_v2', JSON.stringify({ version: 2, professions: { doctor: { guided: { first: 41, last: 41, runs: 1 } } } }));
    showScreen('resultScreen');
    fit.module = module;
    fit.scores = { protocol: 25, attention: 65, analysis: 40 };
    sessionEvents = [{ action: 'ORIGINAL_ASSESSMENT', ok: false, t: 3 }];
    state.misclicks = 4;
    adapt.level = 1.2;
    adapt.lastMisclicks = 4;
    const snapshot = () => ({
      scores: JSON.stringify(fit.scores), events: JSON.stringify(sessionEvents),
      misclicks: state.misclicks, level: adapt.level, safetyErrors: safetyState.errors,
      itRun: JSON.stringify(itRun), timers: runTimers.size,
      profile: localStorage.getItem('synapkor_profile_v2'),
    });
    window.drillSnapshot = snapshot;
    return new Promise(resolve => setTimeout(() => resolve(snapshot()), 30));
  }, module);
}

test('targeted hand hygiene practice completes separately and preserves the assessed attempt', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await report(page);
  await page.evaluate(() => startPracticeDrill('doctor', 'protocol'));
  const drill = page.locator('#practiceDrill');
  await expect(drill).toBeVisible();
  await expect(drill).toContainText('Practice only');
  await expect(drill.getByRole('button', { name: 'Close practice', exact: true })).toBeVisible();
  expect(await drill.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await drill.getByRole('button').last().focus();
  await page.keyboard.press('Tab');
  await expect(drill.getByRole('button', { name: 'Close practice', exact: true })).toBeFocused();
  for (const name of [
    'Palm to palm',
    'Right palm over the back of the left, and the other way',
    'Palm to palm, fingers interlaced',
    'Backs of fingers to the opposite palm',
    'Rotational rubbing of the thumbs',
    'Fingertips against the palm',
  ]) await drill.getByRole('button', { name, exact: true }).click();
  await expect(drill.locator('[data-drill-summary]')).toContainText('100%');
  await expect(drill.locator('[data-drill-summary]')).toContainText('assessment is unchanged');
  await page.screenshot({ path: info.outputPath('practice-phone.png') });
  await drill.getByRole('button', { name: 'Close practice', exact: true }).click();
  await expect(drill).toHaveCount(0);
  expect(await page.evaluate(() => window.drillSnapshot())).toEqual(before);
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('synapkor_drills_v1')));
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ module: 'doctor', skill: 'protocol', score: 100, status: 'completed' });
});

test('cancelled drills clean up input and timers, preserve safety and keep settings pause separate', async ({ page }) => {
  const before = await report(page, 'safety');
  await page.evaluate(() => startPracticeDrill('safety', 'thoroughness'));
  const drill = page.locator('#practiceDrill');
  await expect(drill).toBeVisible();
  await drill.getByRole('button', { name: 'Pause and settings', exact: true }).click();
  await expect(page.locator('#settingsDialog')).toBeVisible();
  expect(await page.evaluate(() => isGamePaused())).toBe(true);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await drill.getByRole('button', { name: 'It’s dead', exact: true }).click();
  await drill.getByRole('button', { name: 'Close practice', exact: true }).click();
  await page.waitForTimeout(1800);
  expect(await page.evaluate(() => ({ ...window.drillSnapshot(), active: mgActive, paused: isGamePaused() }))).toEqual({ ...before, active: null, paused: false });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('synapkor_drills_v1'))[0].status)).toBe('cancelled');
});

test('IT practice uses a different incident while preserving the original case and report', async ({ page }) => {
  const before = await report(page, 'it');
  const caseId = await page.evaluate(() => {
    localStorage.setItem('synapkor_drills_v1', JSON.stringify(Array.from({ length: 120 }, (_, index) => ({ id: 'seed-' + index, module: 'it', skill: 'analysis', score: 50, status: 'completed' }))));
    return itRun.caseId;
  });
  await page.evaluate(() => startPracticeDrill('it', 'diagnosis'));
  expect(await page.evaluate(() => itRun.caseId)).not.toBe(caseId);
  const correctText = await page.evaluate(() => itExercise('diagnose').options.find(option => option.correct).text);
  await page.locator('#practiceDrill').getByRole('button', { name: correctText, exact: true }).click();
  await expect(page.locator('[data-drill-summary]')).toContainText('100%');
  await page.locator('#practiceDrill').getByRole('button', { name: 'Close practice', exact: true }).click();
  expect(await page.evaluate(() => window.drillSnapshot())).toEqual(before);
  expect(await page.evaluate(() => loadPracticeDrills().length)).toBe(120);
  expect(await page.evaluate(() => loadPracticeDrills()[0].id)).toBe('seed-1');
  expect(await page.evaluate(() => drillAvailable('doctor', 'soft'))).toBe(false);
  await page.evaluate(() => showScreen('homeScreen'));
  expect(await page.evaluate(() => startPracticeDrill('doctor', 'protocol'))).toBe(false);
});

test('saved attempts fit desktop and phone, and a real report practice button launches its exercise', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('synapkor_profile_v2', JSON.stringify({ version: 2, professions: {
    it: { guided: { first: 40, last: 80, runs: 2 }, legacy: { last: 70, runs: 1 } },
    doctor: { independent: { first: 62, last: 84, runs: 3 } },
    barista: { guided: { first: 50, last: 65, runs: 2 } },
    safety: { independent: { first: 70, last: 90, runs: 2 } },
  } })));
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.goto('/?lang=en', { waitUntil: 'domcontentloaded' });
  const profile = page.locator('#careerProfile');
  await expect(profile).toContainText('Your practice attempts');
  for (const [width, height, name] of [[1280, 720, 'desktop'], [390, 844, 'phone']]) {
    await page.setViewportSize({ width, height });
    await profile.scrollIntoViewIfNeeded();
    expect(await profile.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    const heading = await profile.locator('.profile-mode strong').first().boundingBox();
    const metrics = await profile.locator('.profile-stats').first().boundingBox();
    expect(metrics.y).toBeGreaterThanOrEqual(heading.y + heading.height);
    await profile.screenshot({ path: info.outputPath(`saved-attempts-${name}.png`) });
  }
  await page.evaluate(() => {
    showScreen('resultScreen');
    fit.module = 'doctor';
    fit.scores = { protocol: 25, attention: 90, hearing: 90, diagnosis: 90 };
    const assessment = scenarioAssessment({ module: 'doctor', miniScores: fit.scores, accuracy: 90, hard: 90, soft: 90, events: [] });
    renderAssessmentEvidence({ module: 'doctor', assessment, metrics: {}, events: [], score: assessment.score });
  });
  const launcher = page.getByRole('button', { name: 'Practise: Hand hygiene sequence', exact: true });
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.locator('#practiceDrill')).toBeVisible();
  await expect(page.locator('#practiceDrill .mg-title')).toHaveText('Hand rub');
  await page.locator('#practiceDrill').getByRole('button', { name: 'Close practice', exact: true }).click();
  await expect(launcher).toBeFocused();
});
