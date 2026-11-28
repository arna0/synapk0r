import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
const token='ab'.repeat(32), id='submission-test0001';
function fixture(rows,fetcher=async()=>({ok:true,json:async()=>({ok:true})})) {
 const data=new Map([['synapkor_survey_v1',JSON.stringify(rows)]]), calls=[];
 const context=vm.createContext({crypto:webcrypto,Uint8Array,Date,JSON,Map,Promise,Blob,URL,AbortSignal,Event,setTimeout,
  navigator:{onLine:true},document:{documentElement:{lang:'en'},getElementById:()=>null},location:{href:'https://example.test/',search:''},
  localStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)},
  window:{addEventListener(){},dispatchEvent(){}},confirm:()=>true,getApiBase:()=> 'https://api.example',
  fetch:async(url,options)=>{calls.push({url,options});return fetcher(url,options);}
 });
 vm.runInContext(readFileSync('frontend/js/survey.js','utf8'),context);vm.runInContext(readFileSync('frontend/js/privacy.js','utf8'),context);
 return {context,calls,rows:()=>JSON.parse(data.get('synapkor_survey_v1'))};
}
test('new device deletion receipt uses a random 256-bit capability',()=>{
 const f=fixture([]), first=f.context.createSurveyDeletionToken(),second=f.context.createSurveyDeletionToken();
 assert.match(first,/^[a-f0-9]{64}$/);assert.notEqual(first,second);
});
test('deletion removes the queue and does not allow a stale upload after confirmation',async()=>{
 const row={id,delete_token:token,uploadConsent:true,synced:false};const f=fixture([row]);
 await f.context.deleteDeviceFeedback(id);assert.equal(f.rows().length,0);assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].options.method,'DELETE');assert.deepEqual(JSON.parse(f.calls[0].options.body),{delete_token:token});
 await assert.rejects(f.context.sendSurvey(row),/cancelled/);await f.context.syncSurveyQueue();assert.equal(f.calls.length,1);
});
test('failed remote deletion keeps its key but stops automatic publication retries',async()=>{
 const f=fixture([{id,delete_token:token,publish:true}],async()=>{throw new Error('offline');});
 await assert.rejects(f.context.deleteDeviceFeedback(id),/not confirmed/);
 assert.equal(f.rows()[0].deletionPending,true);assert.equal(f.rows()[0].delete_token,token);
 await f.context.syncSurveyQueue();assert.equal(f.calls.length,1);
});
test('unconsented legacy private responses never upload and may be removed locally',async()=>{
 const f=fixture([{id,publish:false,answers:{}}]);await f.context.syncSurveyQueue();assert.equal(f.calls.length,0);
 await f.context.deleteDeviceFeedback(id);assert.equal(f.calls.length,0);assert.equal(f.rows().length,0);
});
test('deletion waits for an existing upload then deletes it and keeps unrelated feedback',async()=>{
 let finish;const response=new Promise(resolve=>{finish=resolve;});
 const row={id,delete_token:token,uploadConsent:true},other={id:'submission-other001',publish:false};
 const f=fixture([row,other],async(_,options)=>options.method==='POST'?response:{ok:true,json:async()=>({ok:true})});
 const upload=f.context.sendSurvey(row), deletion=f.context.deleteDeviceFeedback(id);
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(f.rows()[0].deletionPending,true);assert.equal(f.calls.length,1);
 finish({ok:true,json:async()=>({ok:true})});await upload;await deletion;
 assert.deepEqual(f.calls.map(call=>call.options.method),['POST','DELETE']);assert.equal(f.rows().length,1);assert.equal(f.rows()[0].id,other.id);
});
test('owner secret is used only as deletion authorization and cleared from the form',async()=>{
 const nodes=new Map();const node=id=>nodes.get(id)||nodes.set(id,{value:'',textContent:'',append(){},replaceChildren(){}}).get(id);
 const calls=[];const context=vm.createContext({document:{getElementById:node},window:{addEventListener(){}},getApiBase:()=>'',confirm:()=>true,AbortSignal,URLSearchParams,
  fetch:async(url,options={})=>{calls.push({url,options});return {ok:true,json:async()=>options.method==='DELETE'?{ok:true,deleted:true}:{reviews:[],total:0,hasMore:false}};}});
 vm.runInContext(readFileSync('frontend/js/moderation.js','utf8'),context);
 node('moderationSecret').value='private-owner-secret';node('moderationAccess').onsubmit({preventDefault(){}});assert.equal(node('moderationSecret').value,'');
 node('moderationId').value=id;node('moderationById').onsubmit({preventDefault(){}});await new Promise(resolve=>setTimeout(resolve,0));
 const deletion=calls.find(call=>call.options.method==='DELETE');assert.equal(deletion.options.headers.Authorization,'Bearer private-owner-secret');assert.equal(deletion.url.includes('private-owner-secret'),false);
 node('moderationLock').onclick();const before=calls.length;node('moderationById').onsubmit({preventDefault(){}});assert.equal(calls.length,before);
});
