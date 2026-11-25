// SynapKor — Victory screen, skill report and backend AI feedback.

// ================= EPIC VICTORY TRIGGER =================
function triggerEpicVictory() {
  clearInterval(state.timerInterval);
  playVictoryFanfare();

  // Lock camera into cinematic angle
  player.pos.set(0.18, 1.45, 0.2);
  player.yaw = -0.2;
  player.pitch = -0.35;

  // Show Victory Overlay Modal (texts may have been replaced by the safety module)
  document.getElementById('victoryTitle').innerText = 'Симуляция успешно пройдена!';
  document.getElementById('victoryText').innerText = 'Вы приготовили напиток и приняли решения. В отчёте видно, как вы справились с каждым заданием.';
  const victoryModal = document.getElementById('victoryModal');
  if (victoryModal) victoryModal.style.display = 'flex';
}

function setResultTexts(t) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set('statHardLabel', t.hardLabel); set('statHard', t.hard);
  set('statHandsLabel', t.handsLabel); set('statHands', t.hands);
  const handsEl = document.getElementById('statHands');
  if (handsEl) handsEl.style.color = 'var(--emerald-text)';
  set('statSoftLabel', t.softLabel); set('statSoft', t.soft);
  set('statTimeLabel', t.timeLabel); set('statTime', t.time);
  set('resPraiseTitle', 'Результат сценария');
  set('resTotalXp', t.xp);
}

function renderScenarioScore(score) {
  document.getElementById('resFitScore').textContent = score + '%';
}

// Recipe execution, communication and purchasing are separate parts of the run.
function evaluateBaristaRun(misclicks, conflictChoice, budgetChoice, priority) {
  const procedure = Math.max(0, 100 - misclicks * 2);
  const guest = { A: 0, B: 100, C: 50 }[conflictChoice] ?? 0;
  const inventory = budgetChoice === 'optimal' ? 100 : 0;
  const service = priority === 'guest' ? 65 : priority === 'queue' ? 40 : priority === 'coordinate' ? 100 : guest;
  return { procedure, guest, inventory, service, score: Math.round(procedure * 0.5 + guest * 0.15 + service * 0.10 + inventory * 0.25) };
}

function showSafetyReportScreen() {
  const errors = safetyState.errors;
  const score = Math.max(20, 99 - errors * 12);
  setResultTexts({
    hardLabel: 'Соблюдение регламента LOTO', hard: Math.max(0, 100 - errors * 15) + '%',
    handsLabel: 'Нарушения ТБ', hands: String(errors),
    softLabel: 'Проверка отсутствия напряжения', soft: safetyState.voltageTested ? 'Выполнена' : 'Нет',
    timeLabel: 'Время подготовки оборудования', time: state.timer + ' сек',
    xp: '⚡ +' + Math.max(100, 750 - errors * 100) + ' XP'
  });
  showScreen('resultScreen');
  renderScenarioScore(score);

  const report = {
    module: 'safety',
    score,
    metrics: {
      violations: errors,
      voltage_tested: safetyState.voltageTested,
      lockout_applied: safetyState.lockoutApplied,
      valves_opened: safetyState.valvesOpened.filter(Boolean).length,
      hints_shown: getGuideHintCount(),
      total_time_sec: state.timer
    },
    events: sessionEvents,
    observations: [[errors === 0, 'В сценарии не зафиксировано нарушений порядка.', 'Повторите сценарий и проверьте порядок действий до начала каждого этапа.']]
  };
  postToHost({ type: 'session_complete', ...report });
  requestAiFeedback(report);
}

function showAIReportScreen() {
  const scn = getActiveScenario();
  if (scn) {
    showScenarioReport(scn);
    return;
  }
  if (currentProfession === 'safety') {
    showSafetyReportScreen();
    return;
  }
  const { procedure: accuracy, guest, inventory, score } = evaluateBaristaRun(
    state.misclicks, state.conflictChoice, state.budgetChoice, cafeServicePriority
  );
  setResultTexts({
    hardLabel: 'Точность действий по рецепту', hard: accuracy + '%',
    handsLabel: 'Решение по закупке', hands: inventory ? 'Верно' : 'Неверно',
    softLabel: 'Ответ гостю', soft: guest === 100 ? 'Верно' : guest === 50 ? 'Частично' : 'Неверно',
    timeLabel: 'Время сценария', time: state.timer + ' сек',
    xp: '⚡ +' + score * 9 + ' XP'
  });

  showScreen('resultScreen');
  renderScenarioScore(score);

  const conflictLabels = { A: 'Defensive', B: 'Apologized & Remade Fast', C: 'Call Manager' };
  const report = {
    module: 'barista',
    score,
    metrics: {
      step_accuracy_percent: accuracy,
      wrong_clicks: state.misclicks,
      hints_shown: getGuideHintCount(),
      total_time_sec: state.timer,
      conflict_choice: conflictLabels[state.conflictChoice] || 'none',
      conflict_response_sec: state.conflictResponseSec,
      service_priority: cafeServicePriority || 'none',
      budget_choice: state.budgetChoice || 'none'
    },
    events: sessionEvents,
    observations: [
      [cafeServicePriority === 'coordinate', CAFE_SERVICE_OPTIONS.coordinate[1], CAFE_SERVICE_OPTIONS[cafeServicePriority]?.[1] || ''],
      [accuracy === 100, 'Рецепт выполнен без лишних действий.', 'При повторе сначала найдите нужный предмет, затем действуйте.'],
      [guest === 100, 'Вы извинились и предложили переделать напиток.', 'В ответе гостю стоило признать ошибку и предложить переделать напиток.'],
      [inventory === 100, 'Выбран заказ, покрывающий расход в пределах бюджета.', 'Заказ должен покрывать недельные 35 кг и укладываться в бюджет.']
    ]
  };
  // Legacy shape kept for the Flutter FpsTelemetrySession model
  postToHost({
    type: 'session_complete',
    ...report,
    view_mode: 'First-Person 3D VR',
    fps_metrics: {
      step_accuracy_percent: accuracy,
      extra_actions_detected: state.misclicks > 2,
      total_preparation_time_sec: state.timer
    },
    soft_skills: {
      conflict_resolution_choice: conflictLabels[state.conflictChoice] || 'Defensive',
      response_time_sec: state.conflictResponseSec
    },
    management: {
      inventory_calc_accuracy: inventory
    }
  });
  requestAiFeedback(report);
}

// ================= AI FEEDBACK (backend -> Claude) =================
let aiRequestSeq = 0;

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function renderReportList(container, items) {
  container.replaceChildren(...items.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
}

async function requestAiFeedback(report) {
  const seq = ++aiRequestSeq;
  if (typeof showCareerBlock === 'function') showCareerBlock(report);
  if (typeof showSurvey === 'function') showSurvey(report);

  const hints = Number(report.metrics.hints_shown) || 0;
  document.getElementById('statHints').textContent = String(hints);
  const retry = document.getElementById('itChallengeButton');
  retry.hidden = report.module !== 'it' || report.metrics.scenario_variant === 'challenge';

  const observations = report.observations || [];
  const successes = observations.filter(([ok]) => ok).map(([, text]) => text);
  const improvements = observations.filter(([ok]) => !ok).map(([, text]) => text);
  renderReportList(document.getElementById('localStrengths'), successes.length ? successes : ['Сценарий завершён.']);
  renderReportList(document.getElementById('localImprovements'), improvements.length ? improvements : ['Попробуйте повторить задание с меньшим числом подсказок.']);

  const card = document.getElementById('aiFeedbackCard');
  const body = document.getElementById('aiFeedbackBody');
  const source = document.getElementById('aiFeedbackSource');
  card.style.display = 'none';

  const apiBase = getApiBase();
  if (apiBase === null || report.metrics.scenario_variant === 'challenge') return;
  const { observations: localObservations, ...payload } = report;
  try {
    const res = await fetch(`${apiBase}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({ ...payload, lang: getLanguage() })
    });
    if (!res.ok || seq !== aiRequestSeq) return;
    const data = await res.json();
    if (seq !== aiRequestSeq || !document.getElementById('resultScreen').classList.contains('active') ||
        data.source !== 'claude' || typeof data.summary !== 'string') return;
    source.textContent = 'Сгенерировано Claude';
    body.innerHTML = `
      <p>${escapeHtml(data.summary)}</p>
      ${data.strengths?.length ? `<div><h5>Что получилось</h5><ul>${data.strengths.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
      ${data.growth_areas?.length ? `<div><h5>Над чем поработать</h5><ul>${data.growth_areas.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
      ${data.career_advice ? `<div><h5>Следующий шаг</h5><p>${escapeHtml(data.career_advice)}</p></div>` : ''}
    `;
    card.style.display = 'block';
  } catch {
    // The local debrief remains available.
  }
}
