import { test, expect } from '@playwright/test';
const profile = {version:2,professions:{it:{guided:{first:40,last:80,runs:2},legacy:{last:70,runs:1}}}};
test('saved attempts load and switch in all languages without overlapping text', async ({page}, info) => {
  await page.addInitScript(p => localStorage.setItem('synapkor_profile_v2', JSON.stringify(p)), profile);
  await page.goto('/?lang=en');
  const box=page.locator('#careerProfile');
  await expect(box).toContainText('Your practice attempts');
  await expect(box).toContainText('Guided');
  await expect(box).toContainText('Latest');
  await expect(box).not.toContainText('С подсказками');
  for (const [lang,title,mode] of [['kk','Оқу әрекеттеріңіз','Көмекпен'],['ru','Ваши учебные попытки','С подсказками'],['en','Your practice attempts','Guided']]) {
    await page.locator('.lang-btn[data-lang="'+lang+'"]').first().click();
    await expect(box).toContainText(title);
    await expect(box).toContainText(mode);
  }
  const heading = await box.locator('.profile-mode strong').first().boundingBox();
  const metrics = await box.locator('.profile-stats').first().boundingBox();
  expect(metrics?.y).toBeGreaterThanOrEqual(heading.y+heading.height);
  await page.setViewportSize({width:390,height:844});
  await box.scrollIntoViewIfNeeded();
  expect(await box.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('attempts-phone.png')});
});
test('IT advertises its actual seven stages', async ({page})=>{
  await page.goto('/?lang=en');
  await expect(page.locator('article').filter({has:page.locator('button[onclick*="it"]')}).first()).toContainText('7 steps');
});
