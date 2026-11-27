import { expect, test } from '@playwright/test';

const modules = { safety: 'Safety engineer', it: 'IT engineer', doctor: 'Doctor', barista: 'Barista' };
const traits = {
  safety: { vigilance:85, thoroughness:0, control:58, firmness:100 },
  it: { priority:100, analysis:100, diagnosis:100, syntax:40, verification:100 },
  doctor: { protocol:90, attention:80, hearing:55, diagnosis:75 },
  barista: { precision:90, timing:100, feel:85 }
};

for (const [module, title] of Object.entries(modules)) {
  test(`${module} report has a clear responsive hierarchy and usable feedback`, async ({ page }, testInfo) => {
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    await page.route('**/api/report', route => route.fulfill({status:503, body:'{}'}));
    await page.goto('/?lang=en', {waitUntil:'domcontentloaded'});
    await page.evaluate(async ({module, scores}) => {
      currentProfession = module;
      sessionEvents = [{t:1,action:'GUIDED_ACTION',ok:true}];
      const assessment = scenarioAssessment({module,miniScores:scores,accuracy:80,hard:100,soft:100,service:100,purchasing:100,violations:module==='safety'?1:0,events:sessionEvents});
      setResultTexts({hardLabel:'Practical exercises',hard:assessment.practical+'%',handsLabel:'Decision accuracy',hands:'Correct',softLabel:'Communication',soft:'100%',timeLabel:'Session duration',time:'188 sec',grade:assessment.requiresRetry?'Further practice needed':'Shift goals met',desc:'Your exercise results show what to practise in the next session.',praise:'Practice result',badge:'Guided practice',xp:'+100 XP',competencies:[]});
      showScreen('resultScreen');
      animateFitScore(assessment.score);
      await requestAiFeedback({module,score:assessment.score,assessment,metrics:{mini_scores:scores,total_time_sec:188,budget_choice:'optimal'},events:sessionEvents});
    }, {module,scores:traits[module]});
    await expect(page.locator('#reportProfession')).toHaveText(title);
    await expect(page.locator('#assessmentEvidence')).toBeVisible();
    await expect(page.locator('.evidence-skill')).not.toHaveCount(0);
    await expect(page.locator('#reportSurvey')).not.toHaveAttribute('open','');
    const savedScore = await page.evaluate(module => loadCareerProfile().professions[module].guided.last, module);
    await expect(page.locator('#resFitScore')).toHaveText(savedScore + '%');
    await page.screenshot({path:testInfo.outputPath(`${module}-desktop.png`),fullPage:true});
    if (module === 'safety') {
      await page.locator('#resultScreen').evaluate(el => { el.scrollTop = 650; });
      await page.screenshot({path:testInfo.outputPath('safety-details.png'),fullPage:true});
      await page.locator('#resultScreen').evaluate(el => { el.scrollTop = 0; });
    }
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const score = await page.locator('.score-summary').boundingBox();
    const evidence = await page.locator('#assessmentEvidence').boundingBox();
    expect(evidence.y).toBeGreaterThan(score.y+score.height-1);
    await page.screenshot({path:testInfo.outputPath(`${module}-phone.png`),fullPage:true});
    await page.locator('#reportSurveyToggle').click();
    await expect(page.locator('#surveyPublish')).not.toBeChecked();
    await expect(page.locator('#surveySubmit')).toBeDisabled();
  });
}
