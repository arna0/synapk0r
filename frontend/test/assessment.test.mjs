import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = name => readFileSync(new URL('../js/' + name + '.js', import.meta.url), 'utf8');
const makeContext = () => {
  const values = new Map();
  const ctx = vm.createContext({
    window: { addEventListener() {} },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
  });
  vm.runInContext(source('assessment') + '\n' + source('career'), ctx);
  return { ctx, values, evaluate: code => vm.runInContext(code, ctx) };
};

test('each IT exercise changes the aggregate and a weak terminal cannot receive the top tier', () => {
  const { evaluate } = makeContext();
  const scores = { priority: 100, analysis: 100, diagnosis: 100, syntax: 100, verification: 100 };
  const assess = miniScores => evaluate(`scenarioAssessment(${JSON.stringify({ module: 'it', miniScores, accuracy: 100, hard: 100, soft: 100 })})`);
  assert.equal(assess(scores).score, 100);
  for (const id of Object.keys(scores)) assert.ok(assess({ ...scores, [id]: 0 }).score < 100, id);
  const terminal = assess({ ...scores, syntax: 40 });
  assert.equal(terminal.score, 93);
  assert.equal(terminal.weakest.id, 'syntax');
  assert.equal(terminal.requiresRetry, true);
  assert.notEqual(terminal.tier, 'top');
  assert.equal(assess({}).score, 40);
});

test('Doctor exercises all contribute and invalid or missing values earn no credit', () => {
  const { evaluate } = makeContext();
  const input = { module: 'doctor', miniScores: { protocol: 100, attention: 100, hearing: 100, diagnosis: 100 }, accuracy: 100, hard: 100, soft: 100 };
  for (const id of Object.keys(input.miniScores)) {
    const broken = { ...input, miniScores: { ...input.miniScores, [id]: null } };
    const result = evaluate(`scenarioAssessment(${JSON.stringify(broken)})`);
    assert.equal(result.score, 85);
    assert.equal(result.weakest.id, id);
  }
});

test('Safety violations override averaging and guidance is recorded without a score penalty', () => {
  const { evaluate } = makeContext();
  const input = { module: 'safety', miniScores: { vigilance: 100, thoroughness: 100, control: 100, firmness: 100 }, accuracy: 100, independent: true };
  const clean = evaluate(`scenarioAssessment(${JSON.stringify(input)})`);
  assert.equal(clean.score, 100);
  assert.equal(clean.mode, 'independent');
  const unsafe = evaluate(`scenarioAssessment(${JSON.stringify({ ...input, events: [{ action: 'VIOLATION_LOTO_WHILE_POWER_ON', ok: false }] })})`);
  assert.ok(unsafe.score < 60);
  assert.equal(unsafe.requiresRetry, true);
  assert.equal(unsafe.criticalViolations, 1);
  const guided = evaluate(`scenarioAssessment(${JSON.stringify({ ...input, events: [{ action: 'GUIDE_REOPENED' }] })})`);
  assert.equal(guided.mode, 'guided');
  assert.equal(guided.score, clean.score);
  const unrecorded = evaluate(`scenarioAssessment(${JSON.stringify({ ...input, miniScores: {} })})`);
  assert.equal(unrecorded.criticalViolations, 0, 'missing evidence is not a recorded violation');
  assert.equal(unrecorded.requiresRetry, true);
});

test('targeted report feedback names the weak exercise in all supported languages', () => {
  const { ctx, evaluate } = makeContext();
  vm.runInContext(source('session') + '\n' + source('report'), ctx);
  ctx.getLanguage = () => 'en';
  evaluate("var report = { module: 'it', events: [], assessment: scenarioAssessment({module:'it', miniScores:{priority:100,analysis:100,diagnosis:100,syntax:40,verification:100},accuracy:100,hard:100,soft:100}) }");
  assert.match(evaluate('reportNextStep(report)'), /Rebuild the command/);
  assert.match(evaluate('reportErrorEvidence(report)'), /Recovery command — 40%/);
  ctx.getLanguage = () => 'ru';
  assert.match(evaluate('reportNextStep(report)'), /Соберите команду/);
  ctx.getLanguage = () => 'kk';
  assert.match(evaluate('reportNextStep(report)'), /Команданы қайта/);
});

test('offline report puts mode and weak-exercise evidence before the score and keeps a local debrief', async () => {
  const { ctx, evaluate } = makeContext();
  const elements = new Map();
  const grid = { children: [{ id: 'score-card' }], prepend(element) { this.children.unshift(element); elements.set(element.id, element); } };
  const element = () => ({
    style: {}, textContent: '', innerHTML: '', children: [],
    setAttribute(name, value) { this[name] = value; },
    replaceChildren(...children) { this.children = children; },
    remove() { grid.children = grid.children.filter(child => child !== this); elements.delete(this.id); }
  });
  for (const id of ['resVerdictBadge', 'resVerdictGrade', 'resCompetencies', 'aiFeedbackCard', 'aiFeedbackBody', 'aiFeedbackSource']) elements.set(id, element());
  ctx.document = { querySelector: () => grid, getElementById: id => elements.get(id), createElement: element };
  ctx.getLanguage = () => 'en';
  ctx.getApiBase = () => null;
  ctx.fetch = () => { throw new Error('Offline feedback must not request a server'); };
  vm.runInContext(source('session') + '\n' + source('report'), ctx);
  ctx.showCareerBlock = () => {};
  evaluate("var report = { module:'it', metrics:{}, events:[], assessment:scenarioAssessment({module:'it',miniScores:{priority:100,analysis:100,diagnosis:100,syntax:40,verification:100},accuracy:100,hard:100,soft:100}) }");
  await evaluate('requestAiFeedback(report)');
  assert.equal(grid.children[0].id, 'assessmentEvidence');
  assert.equal(grid.children[1].id, 'score-card');
  assert.match(grid.children[0].innerHTML, /Guided practice/);
  assert.match(grid.children[0].innerHTML, /Recovery command.*40%/);
  assert.match(grid.children[0].innerHTML, /Rebuild the command/);
  assert.equal(elements.get('resVerdictGrade').textContent, 'Further practice needed');
  assert.equal(elements.get('aiFeedbackCard').style.display, 'block');
  assert.match(elements.get('aiFeedbackBody').children[0].textContent, /Recovery command — 40%/);
  await evaluate('requestAiFeedback(report)');
  assert.equal(grid.children.filter(child => child.id === 'assessmentEvidence').length, 1, 'report refresh replaces the existing evidence card');
});

test('legacy progress migrates without inventing first scores or guidance modes', () => {
  const { values, evaluate } = makeContext();
  const legacy = JSON.stringify({ it: { best: 99, last: 80, runs: 3, at: '2026-01-01T00:00:00.000Z' }, doctor: null, safety: { best: 'bad', last: {}, runs: -1 }, bogus: { best: 100 } });
  values.set('synapkor_profile_v1', legacy);
  const profile = evaluate('loadCareerProfile()');
  assert.equal(profile.version, 2);
  assert.equal(profile.professions.it.legacy.last, 80);
  assert.equal(profile.professions.it.legacy.runs, 3);
  assert.equal(profile.professions.it.guided, undefined);
  assert.equal(profile.professions.it.independent, undefined);
  assert.equal(profile.professions.doctor, undefined);
  assert.equal(values.get('synapkor_profile_v1'), legacy);
  assert.ok(values.has('synapkor_profile_v2'));
});

test('progress separates modes and preserves first/latest and attempt count per profession', () => {
  const { evaluate } = makeContext();
  evaluate("saveCareerResult('it', 40, 'guided', 'run-1'); saveCareerResult('it', 80, 'guided', 'run-2'); saveCareerResult('it', 60, 'independent', 'run-3'); saveCareerResult('it', 60, 'independent', 'run-3')");
  const profile = evaluate('loadCareerProfile()');
  assert.equal(profile.professions.it.guided.first, 40);
  assert.equal(profile.professions.it.guided.last, 80);
  assert.equal(profile.professions.it.guided.runs, 2);
  assert.equal(profile.professions.it.independent.first, 60);
  assert.equal(profile.professions.it.independent.runs, 1);
});

test('malformed stored profiles cannot create bogus progress or throw', () => {
  const { values, evaluate } = makeContext();
  for (const stored of ['null', '[]', '{', '{"version":2,"professions":{"it":{"guided":{"first":null,"last":100,"runs":3}}}}']) {
    values.set('synapkor_profile_v2', stored);
    assert.equal(Object.keys(evaluate('loadCareerProfile()').professions).length, 0);
  }
  assert.equal(evaluate("saveCareerResult('it', NaN, 'guided')"), false);
  assert.equal(evaluate("saveCareerResult('__proto__', 100, 'guided')"), false);
});

test('unavailable local storage leaves the report usable without claiming to save progress', () => {
  const { ctx, evaluate } = makeContext();
  ctx.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(Object.keys(evaluate('loadCareerProfile()').professions).length, 0);
  assert.equal(evaluate("saveCareerResult('it', 75, 'guided', 'run-1')"), false);
});

test('Barista remake records actual improvement while retaining the original assessment score', () => {
  const events = [];
  let advanced = false;
  const ctx = vm.createContext({
    state: { quest: 2, conflictChoice: '', quest2StartedAt: Date.now() },
    fit: { scores: { timing: 40 } }, sessionEvents: events, sessionStartedAt: Date.now(),
    playSuccessChime() {}, customerObj: null,
    mgShot(done) { events.push({ action: 'MINIGAME_TIMING_100', ok: true }); done(); }
  });
  vm.runInContext(source('barista'), ctx);
  ctx.startQuest3Management = () => { advanced = true; };
  vm.runInContext("handleConflictAnswer('B')", ctx);
  const remake = events.find(event => event.action === 'BARISTA_REMAKE');
  assert.equal(remake.ok, true);
  assert.equal(remake.before_score, 40);
  assert.equal(remake.after_score, 100);
  assert.equal(ctx.fit.scores.timing, 40);
  assert.equal(advanced, true);
});
