import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());});
test('classroom links preserve language, mode, class and untimed preference',async({page})=>{
 await page.goto('/?lang=kk',{waitUntil:'domcontentloaded'});
 await page.locator('.classroom-tools summary').click();
 await page.locator('[name=profession]').selectOption('it');await page.locator('[name=mode]').selectOption('independent');
 await page.locator('[name=code]').fill('CLASS-42');await page.locator('[name=untimed]').check();await page.locator('.assignment-form button').click();
 const url=new URL(await page.locator('#assignmentLink').inputValue());expect(url.searchParams.get('lang')).toBe('kk');expect(url.searchParams.get('mode')).toBe('independent');expect(url.searchParams.get('untimed')).toBe('1');expect(url.searchParams.get('assignment')).toBe('CLASS-42');
});
test('pause freezes active time and settings survive a reload',async({page})=>{
 await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{showScreen('gameScreen');openSettings();});
 const before=await page.evaluate(()=>gameNow());await page.waitForTimeout(200);expect(await page.evaluate(()=>gameNow())).toBe(before);
 await page.getByLabel('Mute all sounds').check();await page.getByRole('button',{name:'Continue',exact:true}).click();
 expect(await page.evaluate(()=>isGamePaused())).toBe(false);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.home-settings').click();await expect(page.getByLabel('Mute all sounds')).toBeChecked();
});
test('invalid JSON backup shows a useful error without clearing progress',async({page})=>{
 await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});await page.evaluate(()=>saveCareerResult('it',70,'guided','real-run'));
 await page.locator('#learningHub input[type=file]').first().setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
 await expect(page.locator('#learningStatus')).toContainText('current progress is unchanged');expect(await page.evaluate(()=>loadCareerProfile().professions.it.guided.last)).toBe(70);
});
