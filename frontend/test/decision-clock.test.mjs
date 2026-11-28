import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('switching untimed on and off never imposes a hidden deadline',()=>{
 let now=0,tick;const fill={style:{}},label={};const bar={querySelector:s=>s.includes('fill')?fill:label,classList:{toggle(){}}};
 const c=vm.createContext({startScenarioDecision(){},clearInterval(){},decisionTimer:0,document:{getElementById:()=>({prepend(){}}),createElement:()=>bar},gameSettings:{untimed:false},secondsFor:()=>35,gameNow:()=>now,runEvery:fn=>{tick=fn;return 1;},state:{misclicks:0},adapt:{},sessionEvents:[],scenarioNow:()=>now/1000,showGuideToast(){},gameText:(ru,en)=>en});
 const s=fs.readFileSync(new URL('../js/dynamics.js',import.meta.url),'utf8');vm.runInContext(s.slice(s.indexOf('const _startScenarioDecision'),s.indexOf('const _answerScenarioDecision')),c);
 vm.runInContext('startScenarioDecision(0)',c);now=10000;tick();c.gameSettings.untimed=true;now=100000;tick();assert.equal(c.state.misclicks,0);
 c.gameSettings.untimed=false;now=100100;tick();assert.equal(c.state.misclicks,0);now=130000;tick();assert.equal(c.state.misclicks,1);now=140000;tick();assert.equal(c.state.misclicks,1);
});
