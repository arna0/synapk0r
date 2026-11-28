// The active clock freezes during both manual and background pauses.
let gamePausedAt = null, gamePausedTotal = 0;
function gameNow() { return (gamePausedAt ?? Date.now()) - gamePausedTotal; }
function isGamePaused() { return gamePausedAt !== null; }
function pauseGameClock(paused) {
  if(paused && gamePausedAt===null) gamePausedAt=Date.now();
  else if(!paused && gamePausedAt!==null) {gamePausedTotal+=Date.now()-gamePausedAt;gamePausedAt=null;}
}
// Cancel asynchronous gameplay work when a new run starts or the player leaves.
let runNumber = 0;
let independentRun = false;
let untimedUsed = false;
let baristaReplay = false;
const runTimers = new Set();
const runCleanups = new Set();

function onRunEnd(cleanup) {
  runCleanups.add(cleanup);
  return () => runCleanups.delete(cleanup);
}

function runLater(callback, delay) {
  const deadline=gameNow()+Math.max(0,delay);
  const timer=setInterval(()=>{
    if(isGamePaused() || gameNow()<deadline)return;
    clearInterval(timer);runTimers.delete(timer);callback();
  },Math.max(1,Math.min(delay,50)));
  runTimers.add(timer);return timer;
}
function runEvery(callback,delay) {
  const timer=setInterval(()=>{if(!isGamePaused())callback();},delay);
  runTimers.add(timer);return timer;
}

function endGameRun() {
  pauseGameClock(false);
  if (typeof closeSettings === 'function') closeSettings();
  runNumber++;
  independentRun = false;
  untimedUsed = typeof gameSettings!=='undefined' && gameSettings.untimed;
  baristaReplay = false;
  guideVisible = true;
  for (const timer of runTimers) {
    clearTimeout(timer);
    clearInterval(timer);
  }
  runTimers.clear();
  for (const cleanup of runCleanups) cleanup();
  runCleanups.clear();
  if (typeof mgActive !== 'undefined' && mgActive) mgActive.close();
  if (typeof feedbackRequest !== 'undefined') feedbackRequest?.abort();
  resetGameInputs();
  if (handsGroup) handsGroup.userData.animating = false;
  if (rightHand) rightHand.position.z = -0.55;
  if (document.pointerLockElement) document.exitPointerLock?.();
  for (const id of ['actionProgress', 'victoryModal']) {
    const element = document.getElementById(id);
    if (element) element.style.display = 'none';
  }
  document.getElementById('guideToast')?.classList.remove('show');
  document.getElementById('comboPopup')?.classList.remove('active');
  document.querySelectorAll('.quick-action, .interrupt-card').forEach(element => element.remove());
}

const gameTextVariants = new Map();
function gameText(ru, en, kk) {
  const entry={ru,en,kk};
  for(const value of [ru,en,kk]) if(typeof value==='string')gameTextVariants.set(value,entry);
  const lang = typeof getLanguage === 'function' ? getLanguage() : 'ru';
  return lang === 'en' ? en : lang === 'kk' ? kk : ru;
}

function baristaOutcome(conflict, budget, miniScores) {
  const skills = ['precision', 'timing', 'feel'];
  const technique = Math.round(skills.reduce((sum, skill) => sum + (miniScores[skill] ?? 0), 0) / skills.length);
  const service = conflict === 'B' ? 100 : conflict === 'C' ? 50 : 0;
  const purchasing = budget === 'optimal' ? 100 : 0;
  const score = Math.round(technique * 0.55 + service * 0.25 + purchasing * 0.2);
  return { technique, service, purchasing, score, metBrief: technique >= 75 && service === 100 && purchasing === 100 };
}

function baristaOrder() {
  return baristaReplay
    ? { budget: 145000, demand: 55, stock: 10, options: { low: [25, 65000], optimal: [45, 115000], high: [60, 155000] } }
    : { budget: 120000, demand: 40, stock: 5, options: { low: [15, 45000], optimal: [35, 90000], high: [55, 135000] } };
}

function formatTenge(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
}

function extractionOutcome(seconds) {
  if (seconds < 25) return 'under';
  if (seconds > 30) return 'over';
  return 'in-range';
}

function meterExerciseOutcome({ decision, hasFault, observedFault, complete }) {
  if (decision === 'live') return observedFault ? 'fault' : 'retry';
  if (hasFault || !complete) return 'retry';
  return 'ok';
}
