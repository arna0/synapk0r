import {test,expect} from '@playwright/test';
test('IT resumes repaired scenes, changes active language, and freezes verified recovery time',async({page})=>{
 test.setTimeout(180000);await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
 await page.addInitScript(()=>localStorage.setItem('synapkor.lastItCase','release-config'));
 page.on('pageerror',error=>console.error('Recovery application error:',error.message));
 await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
   let run=ITIncident.createRun('network-link',gameNow()-12000);
   for(const [stage,choiceId] of [['triage','checkout-impact'],['evidence','network-unreachable'],['diagnose','disconnected-cable'],['repair','reconnect-eth0']])run=ITIncident.completeExercise(run,'it.'+stage,{correct:true,choiceId,score:100},gameNow());
   currentProfession='it';scenarioState.phase='steps';itRun=run;scenarioState.caseId='network-link';scenarioState.scenarioVersion=ITIncident.VERSION;scenarioState.step=4;sessionStartedAt=run.startedAt;saveScenarioCheckpoint();
 });
 await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Continue shift'}).click();
 await page.waitForFunction(()=>pendingCheckpoint===null && !!scenarioState.group?.parent,undefined,{timeout:30000});
 await expect(page.locator('#threeCanvas canvas')).toBeVisible();
 const restored=await page.evaluate(()=>({stage:itRun.stage,caseId:itRun.caseId,repaired:itRun.repaired,cable:itCableObj?.position.toArray(),expected:IT_PORT_POS,pending:!!pendingCheckpoint}));
 console.log('Restored fixture:',JSON.stringify(restored));
 expect(restored.cable[1]).toBeCloseTo(restored.expected.y,5);
 expect(await page.evaluate(()=>itRun.stage)).toBe(4);
 await page.locator('#gameScreen [data-settings-button]').click();await page.getByRole('button',{name:'Қаз',exact:true}).click();
 expect(await page.evaluate(()=>SCENARIOS.it.steps[0].name)).toContain('бағалаңыз');
 await page.getByRole('button',{name:'Жалғастыру',exact:true}).click();
 await page.evaluate(()=>{itRun=ITIncident.completeExercise(itRun,'it.verify',{correct:true,checks:['health','checkout'],score:100},gameNow());scenarioState.step=5;scenarioState.phase='decision';saveScenarioCheckpoint();});
 await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Continue shift'}).click();
 await page.waitForFunction(()=>pendingCheckpoint===null && !!scenarioState.group?.parent,undefined,{timeout:30000});
 await expect.poll(()=>page.evaluate(()=>scenarioState.phase==='decision'&&scenarioState.restorationTime!==null)).toBe(true);
 const time=await page.locator('#vrTimer').innerText();await page.waitForTimeout(1100);await expect(page.locator('#vrTimer')).toHaveText(time);expect(await page.evaluate(()=>itIncidentOpen)).toBe(false);
});
test('paused interruption cannot be answered with a hidden keyboard shortcut',async({page})=>{
 await page.goto('/?lang=en',{waitUntil:'domcontentloaded'});await page.evaluate(()=>{currentProfession='it';showScreen('gameScreen');showInterrupt(SCENARIOS.it);openSettings();});
 await page.keyboard.press('Digit1');await expect(page.locator('.interrupt-card')).toHaveCount(1);expect(await page.evaluate(()=>sessionEvents.some(e=>e.action==='INTERRUPT_HANDLED'||e.action==='INTERRUPT_POOR'))).toBe(false);
});
