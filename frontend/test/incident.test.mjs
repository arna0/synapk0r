import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../js/incident-data.js', import.meta.url), 'utf8'), context);
const incident = vm.runInContext('ITIncident', context);

test('rotation has three distinct causes and never repeats the previous incident', () => {
  let last;
  const seen = new Set();
  for (let i = 0; i < 9; i++) {
    const next = incident.nextCase(last);
    assert.notEqual(next.id, last);
    seen.add(next.repairId);
    last = next.id;
  }
  assert.equal(seen.size, 3);
  for (const data of incident.CASES) {
    assert.match(data.logs[data.evidenceIndex], /unreachable|refused|authentication failed/);
  }
});

test('each case requires its own cause and repair followed by both restoration checks', () => {
  for (const data of incident.CASES) {
    let run = incident.createRun(data.id, 1000);
    const complete = (id, choiceId, extra = {}) => incident.completeExercise(run, id, { correct: true, choiceId, ...extra }, 61000);
    assert.equal(complete('it.repair', data.repairId), run, 'cannot skip diagnosis');
    run = complete('it.triage', 'checkout-impact');
    assert.equal(complete('it.evidence', 'checkout-503'), run, 'symptom is not causal evidence');
    run = complete('it.evidence', data.evidenceId);
    assert.equal(complete('it.diagnose', 'guess'), run);
    run = complete('it.diagnose', data.diagnosisId);
    assert.equal(complete('it.repair', incident.nextCase(data.id).repairId), run, 'different incident needs different repair');
    run = complete('it.repair', data.repairId);
    assert.equal(run.repaired, true);
    assert.equal(incident.restorationSeconds(run), null);
    assert.equal(complete('it.verify', 'health-only', { checks: ['health'] }), run);
    run = complete('it.verify', 'checkout', { checks: ['health', 'checkout'] });
    assert.equal(run.stage, 5);
    assert.equal(incident.restorationSeconds(run), 60);
    assert.equal(incident.completeExercise(run, 'it.verify', { correct: true, checks: ['health', 'checkout'] }, 99000), run, 'timer cannot change after recovery');
  }
});

test('scenario callbacks cannot advance a replacement run or complete a step twice', () => {
  const completions = [];
  const context = vm.createContext({
    window: {}, document: { getElementById: () => null },
    currentProfession: 'it', runNumber: 1, isActionInProgress: false,
    state: { misclicks: 0 }, sessionStartedAt: Date.now(), sessionEvents: [],
    animateHandPunch: callback => callback(),
    runScenarioExercise: (_id, _context, done) => completions.push(done),
    runLater() {},
  });
  vm.runInContext(readFileSync(new URL('../js/scenario.js', import.meta.url), 'utf8'), context);
  vm.runInContext(`
    SCENARIOS.it = { id: 'it', steps: [
      { id: 'terminal', stepId: 'repair', exerciseId: 'it.repair' },
      { id: 'monitorDash', stepId: 'verify', exerciseId: 'it.verify' }
    ], acceptExercise: () => true };
    scenarioState.phase = 'steps';
    handleScenarioClick('terminal');
    runNumber++;
  `, context);
  completions.shift()({ correct: true });
  assert.equal(vm.runInContext('scenarioState.step', context), 0);
  assert.equal(context.sessionEvents.length, 0);
  vm.runInContext("isActionInProgress = false; handleScenarioClick('terminal');", context);
  const finish = completions.shift();
  finish({ correct: true });
  finish({ correct: true });
  assert.equal(vm.runInContext('scenarioState.step', context), 1);
  assert.equal(context.sessionEvents.length, 1);
});

test('reading the briefing is excluded from session and IT restoration time', () => {
  const definitions = {};
  let now = 90000;
  const classes = new Set(['visible']);
  const overlay = { dataset: { profession: 'it' }, classList: { contains: name => classes.has(name), remove: name => classes.delete(name) } };
  const timer = { innerText: '' };
  const context = vm.createContext({
    Date: { now: () => now }, sessionStartedAt: 0, state: { timer: 90 },
    gameText: (ru, en) => en,
    registerScenario: definition => { definitions[definition.id] = definition; },
    getActiveScenario: () => definitions.it,
    document: { getElementById: id => id === 'introOverlay' ? overlay : id === 'vrTimer' ? timer : { checked: false } }
  });
  for (const name of ['incident-data', 'it']) vm.runInContext(readFileSync(new URL('../js/' + name + '.js', import.meta.url), 'utf8'), context);
  const guide = readFileSync(new URL('../js/guide.js', import.meta.url), 'utf8');
  vm.runInContext(guide.slice(guide.indexOf('function closeIntro()')), context);
  vm.runInContext('closeIntro()', context);
  assert.equal(context.sessionStartedAt, 90000);
  assert.equal(vm.runInContext('itRun.startedAt', context), 90000);
  assert.equal(context.state.timer, 0);
  assert.equal(timer.innerText, '00:00');
  now = 100000;
  vm.runInContext('closeIntro()', context);
  assert.equal(context.sessionStartedAt, 90000, 'closing an already closed briefing must not reset the clock');
  assert.equal(vm.runInContext('ITIncident.restorationSeconds({ ...itRun, restoredAt: Date.now() })', context), 10);
});
