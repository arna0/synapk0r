// Targeted exercises are separate from assessed career attempts.
const PRACTICE_DRILLS_KEY = 'synapkor_drills_v1';
const PRACTICE_DRILLS_LIMIT = 120;
const PRACTICE_DRILL_ACTIONS = {
  barista: { precision: 'mgGrind', timing: 'mgShot', feel: 'mgSteam' },
  doctor: { protocol: 'mgHandRub', attention: 'mgPulse', hearing: 'mgBloodPressure', diagnosis: 'mgLungs' },
  safety: { vigilance: 'mgHazardScan', thoroughness: 'mgVoltage', control: 'mgValve', firmness: 'mgColleague' },
};
const PRACTICE_IT_STAGES = { priority: 'triage', analysis: 'evidence', diagnosis: 'diagnose', syntax: 'repair', verification: 'verify' };
let activePracticeDrill = null;

function drillAvailable(module, skill) {
  if (module === 'it') return Object.hasOwn(PRACTICE_IT_STAGES, skill)
    && typeof runScenarioExercise === 'function' && typeof itExercise === 'function';
  const name = PRACTICE_DRILL_ACTIONS[module]?.[skill];
  return typeof name === 'string' && typeof window[name] === 'function';
}

function practiceDrillHost() {
  return activePracticeDrill?.dialog.open ? activePracticeDrill.workspace : null;
}

// fitRecord calls this before touching assessment scores, events or difficulty.
function recordPracticeScore(trait, value) {
  if (!activePracticeDrill) return false;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const score = Math.max(0, Math.min(100, Math.round(value)));
    activePracticeDrill.score = activePracticeDrill.score === null ? score : Math.min(activePracticeDrill.score, score);
  }
  return true;
}

function loadPracticeDrills() {
  try {
    const rows = JSON.parse(localStorage.getItem(PRACTICE_DRILLS_KEY) || '[]');
    return Array.isArray(rows) ? rows.filter(row => row && typeof row.id === 'string'
      && drillAvailable(row.module, row.skill) && ['completed', 'cancelled'].includes(row.status)
      && (row.score === null || typeof row.score === 'number' && Number.isFinite(row.score) && row.score >= 0 && row.score <= 100)).slice(-PRACTICE_DRILLS_LIMIT) : [];
  } catch { return []; }
}

function savePracticeDrill(drill, status) {
  if (drill.recorded) return drill.saved;
  drill.recorded = true;
  const row = {
    id: drill.id, module: drill.module, skill: drill.skill,
    status, score: status === 'completed' ? drill.score : null,
    startedAt: drill.startedAt, finishedAt: new Date().toISOString(),
    variant: drill.variant || null, untimed: typeof gameSettings !== 'undefined' && gameSettings.untimed === true,
  };
  try {
    localStorage.setItem(PRACTICE_DRILLS_KEY, JSON.stringify([...loadPracticeDrills(), row].slice(-PRACTICE_DRILLS_LIMIT)));
    drill.saved = true;
  } catch { drill.saved = false; }
  return drill.saved;
}

function practiceSnapshot() {
  return {
    scores: fit.scores, scoreValues: { ...fit.scores }, module: fit.module,
    events: sessionEvents, misclicks: state.misclicks,
    level: adapt.level, lastMisclicks: adapt.lastMisclicks,
    safetyErrors: safetyState.errors, safetyRun,
    itRun, logAction, timers: new Set(runTimers), cleanups: new Set(runCleanups),
    paused: isGamePaused(),
  };
}

function restorePracticeState(drill) {
  if (drill.restored) return;
  drill.restored = true;
  const old = drill.snapshot;
  for (const timer of runTimers) if (!old.timers.has(timer)) {
    clearTimeout(timer); clearInterval(timer); runTimers.delete(timer);
  }
  for (const cleanup of runCleanups) if (!old.cleanups.has(cleanup)) {
    runCleanups.delete(cleanup); cleanup();
  }
  Object.keys(old.scores).forEach(key => delete old.scores[key]);
  Object.assign(old.scores, old.scoreValues);
  fit.scores = old.scores; fit.module = old.module;
  sessionEvents = old.events;
  state.misclicks = old.misclicks;
  adapt.level = old.level; adapt.lastMisclicks = old.lastMisclicks;
  safetyState.errors = old.safetyErrors;
  safetyRun = old.safetyRun;
  itRun = old.itRun;
  logAction = old.logAction;
  pauseGameClock(old.paused);
}

function renderPracticeChrome(drill) {
  const text = (selector, value) => { drill.dialog.querySelector(selector).textContent = value; };
  text('[data-drill-label]', gameText('Отдельная практика', 'Practice only', 'Жеке жаттығу'));
  text('#practiceDrillHeading', assessmentDescriptor(drill.module, drill.skill).label);
  text('[data-drill-notice]', gameText('Отработайте одно упражнение. Исходная оценка и число полных попыток не изменятся.', 'Practise one exercise. Your original assessment and completed attempt count stay unchanged.', 'Бір жаттығуды орындаңыз. Бастапқы баға мен толық әрекеттер саны өзгермейді.'));
  text('[data-drill-close]', gameText('Закрыть практику', 'Close practice', 'Жаттығуды жабу'));
  text('[data-drill-settings]', gameText('Пауза и настройки', 'Pause and settings', 'Үзіліс және баптаулар'));
  if (drill.completed) renderPracticeSummary(drill);
}

function renderPracticeSummary(drill) {
  const summary = drill.dialog.querySelector('[data-drill-summary]');
  summary.hidden = false;
  summary.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = gameText('Практика завершена', 'Practice complete', 'Жаттығу аяқталды');
  const score = document.createElement('p');
  score.className = 'practice-drill-score';
  score.textContent = `${drill.score}%`;
  const note = document.createElement('p');
  note.textContent = gameText('Это результат отдельного упражнения. Исходная оценка не изменена.', 'This is a separate exercise result. Your original assessment is unchanged.', 'Бұл — жеке жаттығудың нәтижесі. Бастапқы баға өзгерген жоқ.');
  const next = document.createElement('p');
  next.textContent = assessmentDescriptor(drill.module, drill.skill).next;
  const storage = document.createElement('p');
  storage.className = 'practice-drill-storage';
  storage.textContent = drill.saved
    ? gameText('Сохранено в отдельной истории практики на этом устройстве.', 'Saved in separate practice history on this device.', 'Осы құрылғыдағы жеке жаттығу тарихына сақталды.')
    : gameText('На этом устройстве не удалось сохранить историю практики.', 'Practice history could not be saved on this device.', 'Бұл құрылғыда жаттығу тарихын сақтау мүмкін болмады.');
  summary.append(heading, score, note, next, storage);
}

function finishPracticeDrill(drill) {
  if (activePracticeDrill !== drill || runNumber !== drill.run || drill.completed || drill.score === null) return;
  drill.completed = true;
  savePracticeDrill(drill, 'completed');
  drill.workspace.hidden = true;
  renderPracticeSummary(drill);
  drill.dialog.querySelector('[data-drill-close]').focus();
}

function closePracticeDrill() {
  const drill = activePracticeDrill;
  if (!drill || drill.closing) return;
  drill.closing = true;
  // A settings dialog may be above this native dialog in the top layer.
  if (document.getElementById('settingsDialog')?.open && typeof closeSettings === 'function') closeSettings();
  if (mgActive?.box && drill.workspace.contains(mgActive.box)) mgActive.close();
  drill.unregister?.();
  if (!drill.completed) savePracticeDrill(drill, 'cancelled');
  restorePracticeState(drill);
  if (drill.dialog.open) drill.dialog.close();
  drill.dialog.remove();
  activePracticeDrill = null;
  if (drill.returnFocus?.isConnected) drill.returnFocus.focus({ preventScroll: true });
}

function startPracticeDrill(module, skill) {
  if (activePracticeDrill || !drillAvailable(module, skill)
      || !document.getElementById('resultScreen')?.classList.contains('active')
      || document.getElementById('settingsDialog')?.open) return false;
  const dialog = document.createElement('dialog');
  dialog.id = 'practiceDrill';
  dialog.className = 'practice-drill';
  dialog.setAttribute('aria-labelledby', 'practiceDrillHeading');
  dialog.setAttribute('aria-describedby', 'practiceDrillNotice');
  dialog.innerHTML = `<header class="practice-drill-header"><div><p data-drill-label></p><h2 id="practiceDrillHeading"></h2></div>
    <button type="button" data-drill-close></button></header>
    <p id="practiceDrillNotice" data-drill-notice></p>
    <div class="practice-drill-tools"><button type="button" data-drill-settings></button></div>
    <div class="practice-drill-workspace"></div><section data-drill-summary role="status" aria-live="polite" hidden></section>`;
  const drill = {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `drill-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    module, skill, dialog, workspace: dialog.querySelector('.practice-drill-workspace'),
    snapshot: practiceSnapshot(), returnFocus: document.activeElement, run: runNumber,
    score: null, startedAt: new Date().toISOString(), completed: false, recorded: false,
  };
  activePracticeDrill = drill;
  sessionEvents = [];
  adapt.level = 1; adapt.lastMisclicks = state.misclicks;
  // Practice violations are exercise evidence, never host assessment telemetry.
  logAction = (action, timestamp, ok) => sessionEvents.push({ action, ok, t: 0 });
  safetyRun = { ...safetyRun, voltageFault: false, faultCleared: true };
  pauseGameClock(false);
  document.body.appendChild(dialog);
  renderPracticeChrome(drill);
  dialog.querySelector('[data-drill-close]').addEventListener('click', closePracticeDrill);
  dialog.querySelector('[data-drill-settings]').addEventListener('click', () => { if (typeof openSettings === 'function') openSettings(); });
  // Keep the toolbar in the same keyboard loop as the embedded exercise.
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(node => node.offsetParent !== null);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePracticeDrill(); });
  dialog.addEventListener('close', () => { if (!drill.closing) closePracticeDrill(); });
  drill.unregister = onRunEnd(closePracticeDrill);
  try {
    dialog.showModal();
    const done = () => finishPracticeDrill(drill);
    if (module === 'it') {
      const alternatives = ITIncident.CASES.filter(item => item.id !== itRun.caseId);
      const count = loadPracticeDrills().filter(row => row.module === 'it').length;
      const variant = alternatives[count % alternatives.length];
      drill.variant = variant.id;
      itRun = ITIncident.createRun(variant.id, gameNow());
      const stage = PRACTICE_IT_STAGES[skill];
      runScenarioExercise(`practice.it.${stage}`, { exercise: itExercise(stage) }, done);
    } else if (module === 'safety' && skill === 'control') mgValve(0, done);
    else window[PRACTICE_DRILL_ACTIONS[module][skill]](done);
  } catch (error) {
    closePracticeDrill();
    throw error;
  }
  return true;
}

window.addEventListener('synapkor:language', () => { if (activePracticeDrill) renderPracticeChrome(activePracticeDrill); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && activePracticeDrill && !activePracticeDrill.completed && typeof openSettings === 'function') openSettings();
});
