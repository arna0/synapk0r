import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
test('active game time excludes pauses and repeated pause signals are idempotent',()=>{
 let time=1000;const c=vm.createContext({Date:{now:()=>time},setTimeout,setInterval,clearTimeout,clearInterval});
 vm.runInContext(fs.readFileSync(new URL('../js/session.js',import.meta.url),'utf8'),c);
 const run=s=>vm.runInContext(s,c);
 assert.equal(run('gameNow()'),1000);run('pauseGameClock(true)');time=4000;run('pauseGameClock(true)');assert.equal(run('gameNow()'),1000);
 run('pauseGameClock(false)');time=4500;assert.equal(run('gameNow()'),1500);run('pauseGameClock(false)');assert.equal(run('gameNow()'),1500);
});
test('run work waits through a pause and ends without leaking callbacks',async()=>{
 const c=vm.createContext({Date,setTimeout,setInterval,clearTimeout,clearInterval});vm.runInContext(fs.readFileSync(new URL('../js/session.js',import.meta.url),'utf8'),c);
 vm.runInContext('let called=0;pauseGameClock(true);runLater(()=>called++,10)',c);
 await new Promise(r=>setTimeout(r,35));assert.equal(vm.runInContext('called',c),0);
 vm.runInContext('pauseGameClock(false)',c);await new Promise(r=>setTimeout(r,35));assert.equal(vm.runInContext('called',c),1);
});
