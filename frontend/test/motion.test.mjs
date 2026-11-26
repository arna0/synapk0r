import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function motionHarness() {
  let now = 0, id = 0;
  const frames = new Map(), cleanups = new Set();
  const vector = (x = 0, y = 0, z = 0) => ({ x, y, z, set(x, y, z) { Object.assign(this, { x, y, z }); } });
  const obj = { position: vector(), rotation: vector(), scale: vector(1, 1, 1) };
  const hand = { position: vector(0, -.3, -.55), rotation: vector(.1, 0, 0) };
  const ctx = vm.createContext({
    runNumber: 1, obj, rightHand: hand, handsGroup: { userData: {} },
    performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    onRunEnd: cleanup => { cleanups.add(cleanup); return () => cleanups.delete(cleanup); }
  });
  vm.runInContext(readFileSync(new URL('../js/effects.js', import.meta.url), 'utf8'), ctx);
  const tick = time => { now = time; const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback(now)); };
  const cancel = () => { ctx.runNumber++; for (const cleanup of [...cleanups]) cleanup(); cleanups.clear(); };
  return { ctx, obj, hand, tick, cancel, frames };
}

test('an interrupted tool transfer never mutates a restarted scene or invokes completion', () => {
  const h = motionHarness();
  vm.runInContext('let completed = 0; animateProp(obj, {position:[2, 3, 4]}, 600, () => completed++, .1)', h.ctx);
  h.tick(200); const position = { ...h.obj.position };
  h.cancel(); h.tick(900);
  assert.deepEqual(h.obj.position, position);
  assert.equal(vm.runInContext('completed', h.ctx), 0);
  assert.equal(h.frames.size, 0);
});

test('different display rates land at the same pose and complete exactly once', () => {
  for (const interval of [1000 / 30, 1000 / 60, 1000 / 120]) {
    const h = motionHarness();
    vm.runInContext('let completed = 0; animateProp(obj, {position:[2, 3, 4],rotation:[0, 1, 0]}, 600, () => completed++, .1)', h.ctx);
    for (let time = 0; time < 650; time += interval) h.tick(time);
    assert.deepEqual([h.obj.position.x, h.obj.position.y, h.obj.position.z], [2, 3, 4]);
    assert.equal(h.obj.rotation.y, 1);
    assert.equal(vm.runInContext('completed', h.ctx), 1);
  }
});

test('leaving during a hand action restores its neutral pose and cancels the callback', () => {
  const h = motionHarness();
  vm.runInContext('let completed = 0; animateHandPunch(() => completed++)', h.ctx);
  h.tick(160); h.cancel(); h.tick(600);
  assert.deepEqual([h.hand.position.y, h.hand.position.z, h.hand.rotation.x], [-.3, -.55, .1]);
  assert.equal(vm.runInContext('completed', h.ctx), 0);
  assert.equal(h.frames.size, 0);
});
