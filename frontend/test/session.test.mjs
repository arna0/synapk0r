import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = name => readFileSync(new URL('../js/' + name + '.js', import.meta.url), 'utf8');

test('Barista gives credit for the technique, customer response, and budget separately', () => {
  const ctx = vm.createContext({});
  vm.runInContext(script('session'), ctx);
  const score = values => vm.runInContext('baristaOutcome(' + values + ')', ctx);
  assert.equal(score("'B', 'optimal', { precision: 100, timing: 100, feel: 100 }").score, 100);
  assert.equal(score("'B', 'optimal', { precision: 100, timing: 100, feel: 100 }").metBrief, true);
  assert.equal(score("'A', 'high', { precision: 100, timing: 100, feel: 100 }").score, 55);
  assert.equal(score("'B', 'high', { precision: 100, timing: 100, feel: 100 }").metBrief, false);
  assert.equal(score("'A', 'high', {}").score, 0);
});

test('leaving a run cancels delayed work and clears UI and input', async () => {
  const removed = [];
  const overlay = { style: { display: 'flex' } };
  const ctx = vm.createContext({
    setTimeout, setInterval, clearTimeout, clearInterval,
    document: {
      getElementById: id => id === 'actionProgress' ? overlay : null,
      querySelectorAll: () => [{ remove: () => removed.push('overlay') }]
    },
    resetGameInputs: () => removed.push('input'),
    guideVisible: false,
    handsGroup: null,
    rightHand: null,
  });
  vm.runInContext(script('session'), ctx);
  vm.runInContext(`
    let called = 0;
    onRunEnd(() => called++);
    runLater(() => called += 10, 5);
    runEvery(() => called += 100, 5);
    endGameRun();
  `, ctx);
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(vm.runInContext('called', ctx), 1);
  assert.deepEqual(removed, ['input', 'overlay']);
  assert.equal(overlay.style.display, 'none');
});

test('completed lock schedules the colleague once and waits for active input to finish', () => {
  const ui = script('minigames');
  const start = ui.indexOf('function scheduleSafetyColleague');
  const end = ui.indexOf('// reset the profile', start);
  const callbacks = [];
  let encounters = 0;
  const ctx = vm.createContext({
    safetyRun: { colleagueDone: false },
    safetyState: { completed: false },
    isActionInProgress: true,
    mgActive: null,
    mgColleague: () => encounters++,
    runLater: callback => callbacks.push(callback),
  });
  vm.runInContext(ui.slice(start, end), ctx);
  vm.runInContext('scheduleSafetyColleague(); scheduleSafetyColleague();', ctx);
  assert.equal(callbacks.length, 1);
  callbacks.shift()();
  assert.equal(encounters, 0);
  ctx.isActionInProgress = false;
  callbacks.shift()();
  assert.equal(encounters, 1);
});

test('over-budget completion explains the outcome without a victory fanfare', () => {
  const element = () => ({ innerText: '', style: {} });
  const elements = { victoryTitle: element(), victoryText: element(), victoryModal: element() };
  let fanfares = 0;
  const ctx = vm.createContext({
    clearInterval, document: { getElementById: name => elements[name] },
    state: { conflictChoice: 'B', budgetChoice: 'high' },
    fit: { scores: { precision: 100, timing: 100, feel: 100 } },
    player: { pos: { set() {} } },
    getLanguage: () => 'en',
    playVictoryFanfare: () => fanfares++,
  });
  vm.runInContext(script('session') + '\n' + script('report'), ctx);
  vm.runInContext('triggerEpicVictory()', ctx);
  assert.equal(fanfares, 0);
  assert.equal(elements.victoryTitle.innerText, 'Shift complete');
  assert.match(elements.victoryText.innerText, /exceeded the budget/);
});
