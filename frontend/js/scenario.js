// SynapKor — Data-driven scenario engine for profession modules (IT, Doctor, …).
//
// A scenario = a 3D scene + an ordered list of hands-on steps (click the right object in the
// right order) + a list of decisions shown in the bottom HUD (hard-skill check, communication).
// Each module file (it.js, doctor.js) calls registerScenario({...}); everything else —
// guide, HUD, hints, victory, report, backend payload — is handled here.
//
// Scenario definition:
// {
//   id, questTitle, arena: {minX,maxX,minZ,maxZ}, spawn: {x, z, eye, yaw, pitch},
//   labels: {objName: 'Label'}, labelOffsets: {objName: metres},
//   intro: {title, goal, plan: [], extra: []},
//   build(group), reset(), update(time, delta),
//   steps: [{ id, name, short, how, why, hint, popup, run(done) }],
//   completeBanner: {title, text},
//   decisions: [{ key, kind: 'hard'|'soft', stepLabel, questTitle, guideTask, guideHow, guideWhy,
//                 prompt: () => html, options: [{ id, text, score, label }] }],
//   victory: {title, text},
//   report: { stepsLabel, hardLabel, softLabel, timeLabel, grades: {top, mid, low},
//             descTop, descLow, competencies: (ctx) => [] }
// }

const SCENARIOS = {};

const scenarioState = {
  phase: 'idle',        // 'steps' | 'decision' | 'done'
  step: 0,
  decision: 0,
  answers: {},          // decision key -> option id
  answerTimes: {},      // decision key -> seconds spent
  phaseStartedAt: 0,
  group: null
};

function registerScenario(def) {
  SCENARIOS[def.id] = def;
  Object.assign(OBJECT_LABELS, def.labels || {});
  Object.assign(LABEL_OFFSETS, def.labelOffsets || {});
  INTRO_CONTENT[def.id] = def.intro;
  ARENA_BOUNDS[def.id] = def.arena;
}

function getActiveScenario() {
  return SCENARIOS[currentProfession] || null;
}

function scenarioNow() {
  return Math.round((Date.now() - sessionStartedAt) / 100) / 10;
}

// Removes the 3D rooms of all scenario modules (called by every module start).
function removeScenarioScenes() {
  if (!scene) return;
  Object.keys(SCENARIOS).forEach(id => {
    const old = scene.getObjectByName(id + 'Environment');
    if (old) scene.remove(old);
  });
  scenarioState.group = null;
}

function hideSafetyChrome() {
  document.getElementById('gameScreen').classList.remove('safety-mode');
  stopTransformerHum();
  ['safetyHudBar', 'safetyInventoryBar', 'telemetryLogPanel', 'multimeterHud'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// ================= START =================
function startScenario(id) {
  const def = SCENARIOS[id];
  if (!def) return;
  currentProfession = id;
  hideSafetyChrome();

  isActionInProgress = false;
  resetSafetyToolsUI();
  state.timer = 0;
  state.misclicks = 0;
  resetSessionEvents();
  Object.assign(scenarioState, { phase: 'steps', step: 0, decision: 0, answers: {}, answerTimes: {}, phaseStartedAt: Date.now() });
  if (def.reset) def.reset();

  document.getElementById('vrQuestTitle').innerText = def.questTitle;
  document.getElementById('vrTimer').innerText = '00:00';
  const victoryModal = document.getElementById('victoryModal');
  if (victoryModal) victoryModal.style.display = 'none';

  applyArenaBounds(id);
  player.pos.set(def.spawn.x, def.spawn.eye, def.spawn.z);
  player.baseEyeHeight = def.spawn.eye;
  player.yaw = def.spawn.yaw;
  player.pitch = def.spawn.pitch;

  showScreen('gameScreen');
  setTimeout(() => {
    initThreeFPS();
    if (scene) {
      ['baristaEnvironment', 'safetyEnvironment'].forEach(n => {
        const old = scene.getObjectByName(n);
        if (old) scene.remove(old);
      });
      removeScenarioScenes();
      interactiveObjects = [];
      hoveredObject = null;
      const group = new THREE.Group();
      group.name = id + 'Environment';
      scenarioState.group = group;
      def.build(group);
      group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(group);
      rebuildObjectLabels();
    }
    renderScenarioHUD();
    handleWindowResize();
  }, 100);

  sessionEvents.push({ t: 0, action: 'SESSION_START_' + id.toUpperCase(), ok: true });
  setGuideVisible(guideVisible);
  showIntro(id);

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timer++;
    const m = String(Math.floor(state.timer / 60)).padStart(2, '0');
    const s = String(state.timer % 60).padStart(2, '0');
    document.getElementById('vrTimer').innerText = `${m}:${s}`;
  }, 1000);
}

// ================= HANDS-ON STEPS =================
function scenarioCurrentStep() {
  const def = getActiveScenario();
  if (!def || scenarioState.phase !== 'steps') return null;
  return def.steps[scenarioState.step] || null;
}

function handleScenarioClick(name) {
  const def = getActiveScenario();
  if (!def || isActionInProgress) return;
  if (scenarioState.phase !== 'steps') {
    if (scenarioState.phase === 'decision') showGuideToast('Сейчас нужно выбрать ответ внизу экрана');
    return;
  }
  const step = scenarioCurrentStep();
  if (!step) return;

  if (name !== step.id) {
    state.misclicks++;
    sessionEvents.push({ t: scenarioNow(), action: `WRONG_OBJECT_${name}_EXPECTED_${step.id}`, ok: false });
    playTone(160, 'sawtooth', 0.25, 0.12);
    showGuideToast(`Сейчас нужен другой предмет: «${OBJECT_LABELS[step.id]}» — ${step.name.toLowerCase()}`);
    return;
  }

  isActionInProgress = true;
  const finish = () => {
    sessionEvents.push({ t: scenarioNow(), action: `STEP_DONE_${step.id}_${scenarioState.step + 1}`, ok: true });
    if (step.popup) showComboPopup(step.popup);
    scenarioState.step++;
    setTimeout(() => { isActionInProgress = false; }, 250);
    if (scenarioState.step >= def.steps.length) {
      renderScenarioStepsComplete();
      setTimeout(() => {
        if (currentProfession === def.id && document.getElementById('gameScreen').classList.contains('active')) {
          startScenarioDecision(0);
        }
      }, 1600);
    } else {
      renderScenarioHUD();
    }
  };
  animateHandPunch(() => step.run ? step.run(finish) : finish());
}

function renderScenarioHUD() {
  const def = getActiveScenario();
  const hud = document.getElementById('hudDockInner');
  if (!def || !hud || scenarioState.phase !== 'steps') return;
  const cur = def.steps[scenarioState.step];
  hud.innerHTML = `
    <div class="steps-bar">
      ${def.steps.map((s, idx) => `
        <div class="step-pill ${idx < scenarioState.step ? 'done' : (idx === scenarioState.step ? 'active' : '')}">
          ${idx < scenarioState.step ? '✓ ' : (idx + 1) + '. '}<span class="scn-pill-text">${s.short}</span>
        </div>`).join('')}
    </div>
    <div class="scn-goal">
      <div>
        <div class="scn-goal-label">ТЕКУЩАЯ ЦЕЛЬ</div>
        <div class="scn-goal-task">${cur ? cur.name : 'Готово'}</div>
      </div>
      <div class="scn-goal-hint">${cur ? 'Найдите «' + OBJECT_LABELS[cur.id] + '» и нажмите [E]' : ''}</div>
    </div>`;
}

function renderScenarioStepsComplete() {
  const def = getActiveScenario();
  const hud = document.getElementById('hudDockInner');
  if (!def || !hud) return;
  playSuccessChime();
  hud.innerHTML = `
    <div class="scn-complete">
      <h3>✨ ${def.completeBanner.title}</h3>
      <p>${def.completeBanner.text}</p>
    </div>`;
}

// ================= DECISIONS (bottom HUD) =================
function startScenarioDecision(idx) {
  const def = getActiveScenario();
  if (!def) return;
  const d = def.decisions[idx];
  scenarioState.phase = 'decision';
  scenarioState.decision = idx;
  scenarioState.phaseStartedAt = Date.now();
  document.getElementById('vrQuestTitle').innerText = d.questTitle;
  playTone(420, 'triangle', 0.25, 0.1);

  const hud = document.getElementById('hudDockInner');
  hud.innerHTML = `
    ${d.prompt()}
    <div>
      ${d.options.map((o, i) => `
        <div class="dialog-option" onclick="answerScenarioDecision('${o.id}')">
          <div class="dialog-tag">${i + 1}</div>
          <div>${o.text}</div>
        </div>`).join('')}
    </div>`;
}

function answerScenarioDecision(optionId) {
  const def = getActiveScenario();
  if (!def || scenarioState.phase !== 'decision') return;
  const d = def.decisions[scenarioState.decision];
  const opt = d.options.find(o => o.id === optionId);
  if (!opt) return;
  scenarioState.answers[d.key] = opt.id;
  scenarioState.answerTimes[d.key] = Math.round((Date.now() - scenarioState.phaseStartedAt) / 100) / 10;
  sessionEvents.push({ t: scenarioNow(), action: `DECISION_${d.key.toUpperCase()}_${opt.label}`, ok: opt.score >= 100 });
  playSuccessChime();

  if (scenarioState.decision + 1 < def.decisions.length) {
    startScenarioDecision(scenarioState.decision + 1);
  } else {
    finishScenario();
  }
}

// Keys 1–3 pick an answer while a decision is on screen
function handleScenarioKey(code) {
  const def = getActiveScenario();
  if (!def || scenarioState.phase !== 'decision') return;
  const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[code];
  const d = def.decisions[scenarioState.decision];
  if (n !== undefined && d.options[n]) answerScenarioDecision(d.options[n].id);
}

function finishScenario() {
  const def = getActiveScenario();
  scenarioState.phase = 'done';
  clearInterval(state.timerInterval);
  playVictoryFanfare();
  sessionEvents.push({ t: scenarioNow(), action: 'SCENARIO_COMPLETE', ok: true });
  document.getElementById('hudDockInner').innerHTML = '';
  document.getElementById('victoryTitle').innerText = def.victory.title;
  document.getElementById('victoryText').innerText = def.victory.text;
  document.getElementById('victoryModal').style.display = 'flex';
}

// ================= GUIDE / HINT INTEGRATION =================
function getScenarioGuideState(def) {
  const steps = [
    ...def.steps.map((s, i) => ({ task: s.name, done: scenarioState.phase !== 'steps' || i < scenarioState.step })),
    ...def.decisions.map(d => ({ task: d.stepLabel, done: scenarioState.answers[d.key] !== undefined }))
  ];
  if (scenarioState.phase === 'steps') {
    const s = def.steps[scenarioState.step];
    if (s) return { steps, idx: scenarioState.step, current: { task: s.name, how: s.how, why: s.why || '', target: s.id } };
    return { steps, idx: def.steps.length, current: { task: def.completeBanner.title, how: 'Сейчас появится следующее задание…', why: '', target: null } };
  }
  if (scenarioState.phase === 'decision') {
    const d = def.decisions[scenarioState.decision];
    return { steps, idx: def.steps.length + scenarioState.decision, current: { task: d.guideTask, how: d.guideHow, why: d.guideWhy || '', target: null } };
  }
  return { steps, idx: steps.length, current: { task: 'Симуляция завершена', how: 'Откройте отчёт по навыкам.', why: '', target: null } };
}

function getScenarioObjectHint(def, name) {
  const step = scenarioCurrentStep();
  if (step && step.id === name) return `${OBJECT_LABELS[name]}: [E] ${step.hint}`;
  return OBJECT_LABELS[name] || '[E] Взаимодействовать';
}

// ================= REPORT =================
function showScenarioReport(def) {
  const r = def.report;
  const accuracy = Math.max(0, 100 - state.misclicks * 5);
  const pct = (kind) => {
    const ds = def.decisions.filter(d => d.kind === kind);
    if (!ds.length) return 100;
    return Math.round(ds.reduce((sum, d) => {
      const o = d.options.find(x => x.id === scenarioState.answers[d.key]);
      return sum + (o ? o.score : 0);
    }, 0) / ds.length);
  };
  const hard = pct('hard');
  const soft = pct('soft');
  const score = Math.max(20, Math.min(99, Math.round(accuracy * 0.35 + hard * 0.4 + soft * 0.25)));
  const tier = score >= 85 ? 'top' : (score >= 60 ? 'mid' : 'low');
  const ctx = { accuracy, hard, soft, score, answers: scenarioState.answers };

  setResultTexts({
    hardLabel: r.stepsLabel, hard: accuracy + '%',
    handsLabel: r.hardLabel, hands: hard >= 100 ? 'Верно' : (hard >= 40 ? 'Частично' : 'Неверно'),
    softLabel: r.softLabel, soft: soft + '%',
    timeLabel: r.timeLabel, time: state.timer + ' сек',
    grade: r.grades[tier],
    desc: tier === 'top' ? r.descTop : r.descLow,
    praise: tier === 'top' ? 'Отличный результат симуляции' : (tier === 'mid' ? 'Хороший результат, есть зоны роста' : 'Симуляция завершена с замечаниями'),
    badge: tier === 'top' ? 'ВЕРДИКТ: РЕКОМЕНДОВАН' : (tier === 'mid' ? 'ВЕРДИКТ: С ОБУЧЕНИЕМ' : 'ВЕРДИКТ: НУЖНА ДОРАБОТКА'),
    xp: '⚡ +' + Math.max(100, score * 9) + ' XP',
    competencies: r.competencies(ctx)
  });
  const handsEl = document.getElementById('statHands');
  if (handsEl) handsEl.style.color = hard >= 100 ? 'var(--emerald-text)' : 'var(--rose)';
  showScreen('resultScreen');
  animateFitScore(score);

  const metrics = {
    step_accuracy_percent: accuracy,
    wrong_clicks: state.misclicks,
    total_time_sec: state.timer
  };
  def.decisions.forEach(d => {
    const o = d.options.find(x => x.id === scenarioState.answers[d.key]);
    metrics[d.key + '_choice'] = o ? o.label : 'none';
    metrics[d.key + '_correct'] = !!o && o.score >= 100;
    metrics[d.key + '_response_sec'] = scenarioState.answerTimes[d.key] || 0;
  });
  const report = { module: def.id, score, metrics, events: sessionEvents };
  postToHost({ type: 'session_complete', ...report });
  requestAiFeedback(report);
}

// ================= SMALL ANIMATION HELPERS =================
// Smoothly moves an object to a position (and optional rotation), then calls done.
function tweenObject(obj, to, ms, done) {
  const from = obj.position.clone();
  const fromRot = obj.rotation.clone();
  const start = performance.now();
  function tick(now) {
    const k = Math.min(1, (now - start) / ms);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    obj.position.set(
      from.x + (to.x - from.x) * e,
      from.y + (to.y - from.y) * e,
      from.z + (to.z - from.z) * e
    );
    if (to.rot) obj.rotation.set(
      fromRot.x + (to.rot[0] - fromRot.x) * e,
      fromRot.y + (to.rot[1] - fromRot.y) * e,
      fromRot.z + (to.rot[2] - fromRot.z) * e
    );
    if (k < 1) requestAnimationFrame(tick);
    else if (done) done();
  }
  requestAnimationFrame(tick);
}

// Re-draws a canvas texture in place (screens, vitals board)
function makeCanvasScreen(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return { canvas, ctx: canvas.getContext('2d'), tex };
}

function box(w, h, d, color, opts = {}) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.1 }, opts))
  );
}

function cyl(rt, rb, h, color, opts = {}, seg = 20) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, seg),
    new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0.1 }, opts))
  );
}

// Invisible, larger click target for small props (the raycaster still hits it)
function addHitbox(group, w, h, d, x = 0, y = 0, z = 0) {
  const hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(x, y, z);
  hit.castShadow = false;
  group.add(hit);
  return hit;
}

window.startScenario = startScenario;
window.answerScenarioDecision = answerScenarioDecision;
