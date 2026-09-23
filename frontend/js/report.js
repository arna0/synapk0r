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
  document.getElementById('victoryText').innerText = 'Вы приготовили напиток по стандарту, грамотно разрешили конфликт с гостем и рассчитали бюджет сырья.';
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
  set('resVerdictGrade', t.grade); set('resVerdictDesc', t.desc);
  set('resPraiseTitle', t.praise); set('resVerdictBadge', t.badge);
  set('resTotalXp', t.xp);
  const comp = document.getElementById('resCompetencies');
  if (comp) comp.innerHTML = t.competencies.map(c => '• ' + c).join('<br>');
}

function animateFitScore(score) {
  let cur = 0;
  const scoreEl = document.getElementById('resFitScore');
  const scoreIntv = setInterval(() => {
    cur += 2;
    if (cur >= score) {
      cur = score;
      clearInterval(scoreIntv);
    }
    if (scoreEl) scoreEl.innerText = cur + '%';
  }, 20);
}

function showSafetyReportScreen() {
  const errors = safetyState.errors;
  const score = Math.max(20, 99 - errors * 12);
  const passed = errors === 0;
  setResultTexts({
    hardLabel: 'Соблюдение регламента LOTO', hard: Math.max(0, 100 - errors * 15) + '%',
    handsLabel: 'Нарушения ТБ', hands: String(errors),
    softLabel: 'Проверка отсутствия напряжения', soft: safetyState.voltageTested ? 'Выполнена' : 'Нет',
    timeLabel: 'Время подготовки оборудования', time: state.timer + ' сек',
    grade: passed ? 'Инженер ТБ: допуск к работам' : (errors <= 2 ? 'Требуется повторный инструктаж' : 'Допуск не рекомендован'),
    desc: passed
      ? 'Правильная последовательность: СИЗ → отключение → LOTO → проверка напряжения → сброс давления.'
      : 'Регламент выполнен, но с нарушениями ТБ. Повторите последовательность операций без ошибок.',
    praise: passed ? 'Отличный результат симуляции' : 'Симуляция завершена с замечаниями',
    badge: passed ? 'ВЕРДИКТ: РЕКОМЕНДОВАН' : 'ВЕРДИКТ: НУЖНА ДОРАБОТКА',
    xp: '⚡ +' + Math.max(100, 750 - errors * 100) + ' XP',
    competencies: [
      'Использование диэлектрических СИЗ перед работой в электрощитовой',
      'Отключение рубильника 380В и установка блокировочного замка LOTO',
      'Контроль отсутствия напряжения мультиметром и сброс давления в контурах'
    ]
  });
  showScreen('resultScreen');
  animateFitScore(score);

  const report = {
    module: 'safety',
    score,
    metrics: {
      violations: errors,
      voltage_tested: safetyState.voltageTested,
      lockout_applied: safetyState.lockoutApplied,
      valves_opened: safetyState.valvesOpened.filter(Boolean).length,
      total_time_sec: state.timer
    },
    events: sessionEvents
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
  let score = 84;
  if (state.misclicks === 0) score += 10;
  else if (state.misclicks <= 2) score += 5;

  if (state.conflictChoice === 'B') score += 8;
  if (state.budgetChoice === 'optimal') score += 5;
  score = Math.min(score, 99);

  const accuracy = Math.max(0, 100 - state.misclicks * 2);
  const recommended = score >= 90;
  setResultTexts({
    hardLabel: 'Точность технологии (Hard Skills)', hard: accuracy + '%',
    handsLabel: 'Лишние действия (промахи)', hands: state.misclicks === 0 ? 'Нет' : String(state.misclicks),
    softLabel: 'Стрессоустойчивость и эмпатия (Soft Skills)', soft: state.conflictChoice === 'B' ? '100%' : (state.conflictChoice === 'C' ? '70%' : '40%'),
    timeLabel: 'Время полного цикла приготовления', time: state.timer + ' сек',
    grade: recommended ? 'Senior Barista / Shift Supervisor' : 'Junior Barista',
    desc: recommended
      ? 'Исключительная моторика рук, строгое соблюдение техкарты и грамотная деэскалация конфликта с клиентом.'
      : 'Техкарта выполнена. Рекомендуется поработать над точностью действий, общением с гостем и расчетом закупок.',
    praise: recommended ? 'Отличный результат симуляции' : 'Хороший результат, есть зоны роста',
    badge: recommended ? 'ВЕРДИКТ: РЕКОМЕНДОВАН' : 'ВЕРДИКТ: С ОБУЧЕНИЕМ',
    xp: '⚡ +950 XP',
    competencies: [
      'Соблюдение рабочего давления 9 бар и правильный расчет граммовки (18г)',
      state.conflictChoice === 'B' ? 'Быстрая деэскалация конфликтной ситуации с предложением комплимента' : 'Зона роста: деэскалация конфликта с гостем',
      state.budgetChoice === 'optimal' ? 'Точный расчет закупки сырья на 35 кг без дефицита и перерасхода бюджета' : 'Зона роста: расчет закупки сырья под недельный расход'
    ]
  });

  showScreen('resultScreen');
  animateFitScore(score);

  const conflictLabels = { A: 'Defensive', B: 'Apologized & Remade Fast', C: 'Call Manager' };
  const report = {
    module: 'barista',
    score,
    metrics: {
      step_accuracy_percent: accuracy,
      wrong_clicks: state.misclicks,
      total_time_sec: state.timer,
      conflict_choice: conflictLabels[state.conflictChoice] || 'none',
      conflict_response_sec: state.conflictResponseSec,
      budget_choice: state.budgetChoice || 'none'
    },
    events: sessionEvents
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
      inventory_calc_accuracy: state.budgetChoice === 'optimal' ? 100 : 60
    }
  });
  requestAiFeedback(report);
}

// ================= AI FEEDBACK (backend -> Claude) =================
let aiRequestSeq = 0;

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

async function requestAiFeedback(report) {
  if (typeof showSurvey === 'function') showSurvey(report);
  const card = document.getElementById('aiFeedbackCard');
  const body = document.getElementById('aiFeedbackBody');
  const source = document.getElementById('aiFeedbackSource');
  const apiBase = getApiBase();
  if (!card || apiBase === null) {
    if (card) card.style.display = 'none';
    return;
  }
  const seq = ++aiRequestSeq;
  card.style.display = 'block';
  source.innerText = '';
  body.innerHTML = '<div class="ai-card-loading">ИИ анализирует ваши действия…</div>';

  try {
    const res = await fetch(`${apiBase}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (seq !== aiRequestSeq) return; // a newer session already asked
    source.innerText = data.source === 'claude' ? 'Сгенерировано Claude' : 'ИИ недоступен · базовый разбор';
    body.innerHTML = `
      <p>${escapeHtml(data.summary)}</p>
      ${data.strengths && data.strengths.length ? `<div><h5>Что получилось</h5><ul>${data.strengths.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
      ${data.growth_areas && data.growth_areas.length ? `<div><h5>Над чем поработать</h5><ul>${data.growth_areas.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
      ${data.career_advice ? `<div><h5>Совет по профессии</h5><p>${escapeHtml(data.career_advice)}</p></div>` : ''}
    `;
  } catch (e) {
    // Static hosting (e.g. GitHub Pages) has no backend - hide the card quietly
    if (seq === aiRequestSeq) card.style.display = 'none';
    console.info('[SynapKor] AI feedback unavailable:', e.message);
  }
}
