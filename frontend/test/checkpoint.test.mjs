import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=n=>fs.readFileSync(new URL('../js/'+n+'.js',import.meta.url),'utf8');
function setup() {const values=new Map();const c=vm.createContext({window:{addEventListener(){}},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},SCENARIOS:{it:{steps:Array(5),decisions:Array(2)},doctor:{steps:Array(6),decisions:Array(2)}}});vm.runInContext(read('incident-data')+read('checkpoint'),c);return {values,run:s=>vm.runInContext(s,c)};}
test('checkpoint keeps only supported, current scenarios and valid completed-stage evidence',()=>{
 const {run,values}=setup();
 const c={version:1,module:'it',phase:'steps',step:1,decision:0,scenarioVersion:'it-incidents-2',caseId:'network-link',elapsed:12,at:new Date().toISOString(),events:[],it:{results:{triage:{correct:true,choiceId:'checkout-impact'}}}};
 values.set('synapkor_checkpoint_v1',JSON.stringify(c));assert.equal(run('loadScenarioCheckpoint().step'),1);
 c.it.results.triage.choiceId='fake';values.set('synapkor_checkpoint_v1',JSON.stringify(c));assert.equal(run('loadScenarioCheckpoint()'),null);
 c.module='barista';values.set('synapkor_checkpoint_v1',JSON.stringify(c));assert.equal(run('loadScenarioCheckpoint()'),null);
});
test('corrupt or expired checkpoints never prevent opening the simulator',()=>{
 const {run,values}=setup();for(const value of ['{bad','null',JSON.stringify({version:1,module:'it',phase:'steps',step:1,decision:0,elapsed:1,at:'2000-01-01'})]){values.set('synapkor_checkpoint_v1',value);assert.equal(run('loadScenarioCheckpoint()'),null);}
});
