import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function context() {
  const values=new Map();
  const c=vm.createContext({window:{addEventListener(){}},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}});
  for(const file of ['assessment','learning-store','career']) vm.runInContext(fs.readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'),c);
  return {run:s=>vm.runInContext(s,c),values};
}
test('attempt records retain skill and case evidence and repeated reports do not add attempts',()=>{
  const {run}=context();
  run("saveCareerResult('it',73,'guided','s1',{skills:{syntax:40,analysis:90,unknown:100},caseId:'database-service',scenarioVersion:'it-3',scoringVersion:2,guidedActions:2,durationSec:120}); saveCareerResult('it',73,'guided','s1')");
  const p=run('loadCareerProfile()');
  assert.equal(p.professions.it.guided.runs,1);
  assert.equal(p.attempts.length,1);
  assert.equal(p.attempts[0].skills.syntax,40);
  assert.equal(p.attempts[0].skills.unknown,undefined);
  assert.equal(p.attempts[0].caseId,'database-service');
  assert.equal(p.attempts[0].guidedActions,2);
});
test('backups merge idempotently and invalid imports preserve current data',()=>{
  const {run,values}=context();
  run("saveCareerResult('doctor',60,'guided','s1')");
  const original=values.get('synapkor_profile_v2');
  assert.equal(run("importLearningBackup('{bad')").ok,false);
  assert.equal(values.get('synapkor_profile_v2'),original);
  assert.equal(run('importLearningBackup(JSON.stringify({format:"synapkor-learning",version:1,profile:loadCareerProfile()}))').ok,true);
  assert.equal(run('loadCareerProfile().professions.doctor.guided.runs'),1);
  const bad={format:'synapkor-learning',version:1,profile:{version:2,professions:{},attempts:[{id:'x',module:'__proto__',score:99,mode:'independent',at:'bad'}]}};
  assert.equal(run('importLearningBackup('+JSON.stringify(JSON.stringify(bad))+')').ok,true);
  assert.equal(run('loadCareerProfile().attempts.length'),1);
});
test('CSV escapes formulas and represents version, mode and all skills',()=>{
  const {run}=context();
  run("saveCareerResult('it',73,'independent','s1',{skills:{syntax:40},caseId:'=formula',scoringVersion:2})");
  const csv=run('learningCsv(loadCareerProfile().attempts)');
  assert.match(csv,/scoring_version/); assert.match(csv,/independent/); assert.match(csv,/syntax/); assert.match(csv,/'=formula/);
});
test('history is bounded without losing lifetime attempt counters',()=>{
  const {run}=context();
  run("for(let i=0;i<140;i++) saveCareerResult('barista',70,'guided','run'+i)");
  assert.equal(run('loadCareerProfile().attempts.length'),120);
  assert.equal(run('loadCareerProfile().professions.barista.guided.runs'),140);
});
