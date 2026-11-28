// Resume at a completed-stage boundary; an unfinished mini-game starts again.
const CHECKPOINT_KEY='synapkor_checkpoint_v1';
let pendingCheckpoint=null;
function loadScenarioCheckpoint() {
  try {
    const c=JSON.parse(localStorage.getItem(CHECKPOINT_KEY)||'null');
    if(!c || c.version!==1 || !['it','doctor'].includes(c.module) || !['steps','decision'].includes(c.phase) || !Number.isFinite(c.elapsed) || c.elapsed<0 || c.elapsed>86400 || !Number.isInteger(c.step) || c.step<0 || c.step>SCENARIOS[c.module].steps.length || !Number.isInteger(c.decision) || c.decision<0 || c.decision>=SCENARIOS[c.module].decisions.length || Date.now()-Date.parse(c.at)>7*86400000 || !Number.isFinite(Date.parse(c.at)))return null;
    if(c.scenarioVersion!==(c.module==='it'?ITIncident.VERSION:SCENARIOS.doctor.version||'doctor-1'))return null;
    if(c.module==='it'&&!ITIncident.CASES.some(v=>v.id===c.caseId))return null;
    if(!Array.isArray(c.events)||c.events.length>1000)return null;
    if(c.module==='it') {
      let verified=ITIncident.createRun(c.caseId,0);
      for(const stage of ITIncident.STAGES.slice(0,c.step))verified=ITIncident.completeExercise(verified,'it.'+stage,c.it?.results?.[stage],c.elapsed*1000);
      if(verified.stage!==Math.min(c.step,5))return null;
    }
    return c;
  }catch{return null;}
}
function saveScenarioCheckpoint() {
  if (typeof practiceDrillHost === 'function' && practiceDrillHost()) return;
  if(pendingCheckpoint || !['it','doctor'].includes(currentProfession) || !['steps','decision'].includes(scenarioState.phase))return;
  const c={version:1,module:currentProfession,at:new Date().toISOString(),phase:scenarioState.phase,step:scenarioState.step,decision:scenarioState.decision,answers:scenarioState.answers,answerTimes:scenarioState.answerTimes,
    scenarioVersion:scenarioState.scenarioVersion,caseId:scenarioState.caseId,elapsed:scenarioNow(),independent:independentRun,untimed:gameSettings.untimed||untimedUsed,misclicks:state.misclicks,
    sessionId:sessionIdentifier,skills:{...fit.scores},events:sessionEvents.slice(-1000),it:currentProfession==='it'?itRun:null};
  try{localStorage.setItem(CHECKPOINT_KEY,JSON.stringify(c));}catch{}
}
function clearScenarioCheckpoint(module=currentProfession) {
  try{if(loadScenarioCheckpoint()?.module===module)localStorage.removeItem(CHECKPOINT_KEY);}catch{}
}
function resumeScenarioCheckpoint() {
  const c=loadScenarioCheckpoint();if(!c)return;
  pendingCheckpoint=c;startScenario(c.module);
  // startScenario resets mechanics synchronously, before the deferred room build.
  pendingCheckpoint=c;
  independentRun=c.independent===true;gameSettings.untimed=c.untimed===true;untimedUsed=c.untimed===true;
  sessionStartedAt=gameNow()-c.elapsed*1000;
  if(typeof c.sessionId==='string' && c.sessionId.length<=120) sessionIdentifier=c.sessionId;
  sessionEvents=c.events.filter(e=>e&&typeof e.action==='string'&&Number.isFinite(e.t)&&typeof e.ok==='boolean').map(e=>({t:e.t,action:e.action.slice(0,120),ok:e.ok}));
  sessionEvents.push({t:c.elapsed,action:'SESSION_RESUMED',ok:true});
  state.misclicks=Number.isInteger(c.misclicks)&&c.misclicks>=0?Math.min(100000,c.misclicks):0;
  fit.scores={};for(const id of ASSESSMENT_SKILLS[c.module])if(careerScore(c.skills?.[id]))fit.scores[id]=c.skills[id];
  Object.assign(scenarioState,{step:c.step,phase:c.phase,decision:c.decision,caseId:c.caseId,scenarioVersion:c.scenarioVersion,answers:{},answerTimes:{}});
  for(const d of SCENARIOS[c.module].decisions) {
    if(d.options.some(o=>o.id===c.answers?.[d.key]))scenarioState.answers[d.key]=c.answers[d.key];
    if(Number.isFinite(c.answerTimes?.[d.key]))scenarioState.answerTimes[d.key]=Math.max(0,c.answerTimes[d.key]);
  }
  if(c.module==='it') {
    let restored=ITIncident.createRun(c.caseId,sessionStartedAt);
    for(const stage of ITIncident.STAGES.slice(0,c.step))restored=ITIncident.completeExercise(restored,'it.'+stage,c.it?.results?.[stage],sessionStartedAt+(c.it?.restoredAt-c.it?.startedAt||c.elapsed*1000));
    itRun=restored;itIncidentOpen=itRun.restoredAt===null;
    Object.assign(SCENARIOS.it,createItScenario());registerScenario(SCENARIOS.it);
  }
  document.getElementById('introOverlay')?.classList.remove('visible');
  setGuideVisible(!independentRun);
}
function restoreCheckpointScene() {
  const c=pendingCheckpoint;if(!c || currentProfession!==c.module)return;pendingCheckpoint=null;
  if(c.module==='doctor') {
    Object.assign(docVitals,{temp:c.step>=3?'38.4 °C  ↑':null,spo2:c.step>=4?'94 %  ↓':null,bp:c.step>=5?'125/80 · п. 96':null,lungs:c.step>=6?'хрипы справа ↓':null});
    drawDocCard(c.step>=1);drawDocVitals();
  } else {
    itIncidentOpen=itRun.restoredAt===null;
    if(itRun.repaired) {
      if(itCableObj && itRun.caseId==='network-link') {itCableObj.position.set(IT_PORT_POS.x,IT_PORT_POS.y,IT_PORT_POS.z);itCableObj.rotation.set(0,0,0);}
      if(itDbLed) {itDbLed.material.color.setHex(0x22C55E);itDbLed.material.emissive.setHex(0x22C55E);}
    }
    drawItDashboard(itRun.restoredAt!==null?'ok':c.step>0?'details':'alert');
    if(c.step>=2)drawItTerminal(c.step>=4?'restart':c.step>=3?'diagnosis':'logs');
    if(itRun.restoredAt!==null) {
      scenarioState.restorationTime=ITIncident.restorationSeconds(itRun);state.timer=scenarioState.restorationTime;
      clearInterval(state.timerInterval);
      document.getElementById('vrTimer').innerText=String(Math.floor(state.timer/60)).padStart(2,'0')+':'+String(state.timer%60).padStart(2,'0');
    }
  }
  isActionInProgress=false;interruptAt=-1;
  if(c.phase==='decision'||c.step>=SCENARIOS[c.module].steps.length)startScenarioDecision(c.decision);else renderScenarioHUD();
  renderGuide(true);
}
function renderCheckpointBanner() {
  const box=document.getElementById('checkpointBanner');if(!box)return;
  const c=loadScenarioCheckpoint();box.hidden=!c;
  if(c)box.innerHTML=`<strong>${gameText('Незавершённая смена','Unfinished shift','Аяқталмаған ауысым')} · ${careerLabel(c.module)}</strong><p>${gameText('Продолжите с последнего завершённого этапа. Незавершённое упражнение начнётся заново.','Continue from the last completed stage. An unfinished exercise starts again.','Соңғы аяқталған кезеңнен жалғастырыңыз. Аяқталмаған жаттығу қайта басталады.')}</p><button type="button" class="btn-action" onclick="resumeScenarioCheckpoint()">${gameText('Продолжить смену','Continue shift','Ауысымды жалғастыру')}</button>`;
}
window.addEventListener('DOMContentLoaded',renderCheckpointBanner);
window.addEventListener('synapkor:language',renderCheckpointBanner);
