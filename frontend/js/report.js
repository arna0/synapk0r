// SynapKor — Victory screen, skill report and backend AI feedback.

// ================= EPIC VICTORY TRIGGER =================
function triggerEpicVictory() {
  clearInterval(state.timerInterval);
  const result = baristaOutcome(state.conflictChoice, state.budgetChoice, fit.scores);
  if (result.metBrief) playVictoryFanfare();

  // Lock camera into cinematic angle
  player.pos.set(0.18, 1.45, 0.2);
  player.yaw = -0.2;
  player.pitch = -0.35;

  // Show Victory Overlay Modal (texts may have been replaced by the safety module)
  document.getElementById('victoryTitle').innerText = result.metBrief
    ? gameText('Цель смены выполнена', 'Shift goals met', 'Ауысым мақсаты орындалды')
    : gameText('Смена завершена', 'Shift complete', 'Ауысым аяқталды');
  document.getElementById('victoryText').innerText = baristaPurchasingFeedback(state.budgetChoice);
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
  set('scenarioScoreLabel', gameText('БАЛЛ СИМУЛЯЦИИ', 'SCENARIO SCORE', 'СИМУЛЯЦИЯ БАЛЫ'));
  set('reportFeedbackTitle', gameText('Разбор симуляции', 'Scenario debrief', 'Симуляция талдауы'));
  set('retryModeLabel', gameText('Самостоятельная попытка', 'Try independently', 'Өз бетіңізше орындау'));
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
    grade: passed ? gameText('Упражнение пройдено без нарушений', 'Exercise completed without violations', 'Жаттығу бұзушылықсыз аяқталды') : gameText('Повторите упражнение', 'Retry the exercise', 'Жаттығуды қайталаңыз'),
    desc: passed
      ? 'Правильная последовательность: СИЗ → отключение → LOTO → проверка напряжения → сброс давления.'
      : 'Регламент выполнен, но с нарушениями ТБ. Повторите последовательность операций без ошибок.',
    praise: passed ? 'Отличный результат симуляции' : 'Симуляция завершена с замечаниями',
    badge: gameText('УЧЕБНАЯ СИМУЛЯЦИЯ', 'PRACTICE SCENARIO', 'ОҚУ СИМУЛЯЦИЯСЫ'),
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
  const result = baristaOutcome(state.conflictChoice, state.budgetChoice, fit.scores);
  const { score, technique: accuracy, service } = result;
  const recommended = result.metBrief;
  setResultTexts({
    hardLabel: 'Точность технологии (Hard Skills)', hard: accuracy + '%',
    handsLabel: 'Лишние действия (промахи)', hands: state.misclicks === 0 ? 'Нет' : String(state.misclicks),
    softLabel: gameText('Решение по жалобе', 'Customer response', 'Қонаққа жауап'), soft: service + '%',
    timeLabel: gameText('Время смены', 'Shift duration', 'Ауысым ұзақтығы'), time: state.timer + ' сек',
    grade: recommended ? gameText('Цель смены выполнена', 'Shift goals met', 'Ауысым мақсаты орындалды') : gameText('Смена завершена', 'Shift complete', 'Ауысым аяқталды'),
    desc: baristaPurchasingFeedback(state.budgetChoice),
    praise: gameText('Результат симуляции', 'Scenario performance', 'Симуляция нәтижесі'),
    badge: gameText('СМЕНА БАРИСТА', 'BARISTA SHIFT', 'БАРИСТА АУЫСЫМЫ'),
    xp: '⚡ +' + score * 9 + ' XP',
    competencies: [
      gameText('Техника: ', 'Drink technique: ', 'Сусын дайындау: ') + accuracy + '%',
      gameText('Ответ гостю: ', 'Customer response: ', 'Қонаққа жауап: ') + service + '%',
      baristaPurchasingFeedback(state.budgetChoice)
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
let feedbackRequest = null;

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function baristaPurchasingFeedback(choice) {
  const order = baristaOrder();
  const [mass, price] = order.options[choice] ?? [0, 0];
  const reserve = order.budget - price;
  const shortage = order.demand - order.stock - mass;
  if (reserve < 0) {
    const overage = formatTenge(-reserve);
    return gameText(`Заказ превысил бюджет на ${overage}.`, `Your order exceeded the budget by ${overage}.`, `Тапсырыс бюджеттен ${overage} асып кетті.`);
  }
  if (shortage > 0) {
    return gameText(`До выполнения плана не хватает ${shortage} кг зерна.`, `Your order was ${shortage} kg short of weekly demand.`, `Апталық сұранысқа ${shortage} кг дән жетіспеді.`);
  }
  const saved = formatTenge(reserve);
  return gameText(`Заказ покрывает спрос. Резерв: ${saved}.`, `Your order covers demand. Reserve: ${saved}.`, `Тапсырыс сұранысты жабады. Резерв: ${saved}.`);
}

function showLocalDebrief(card, source, body, report) {
  const assisted = report.events.filter(event => event.action === 'GUIDED_ACTION').length;
  const openedGuide = report.events.some(event => event.action === 'GUIDE_REOPENED');
  const unsuccessful = report.events.filter(event => event.ok === false).length;
  const details = report.module === 'barista'
    ? baristaPurchasingFeedback(report.metrics.budget_choice)
    : gameText('Повторите этап, на котором возникли трудности.', 'Retry the step you found hardest.', 'Қиын болған қадамды қайталаңыз.');
  card.style.display = 'block';
  source.textContent = gameText('Разбор по результатам игры', 'Scenario feedback', 'Симуляция нәтижесін талдау');
  const summary = document.createElement('p');
  summary.textContent = details;
  const evidence = document.createElement('p');
  evidence.textContent = gameText(
    `Ошибки и неудачные попытки: ${unsuccessful}. Действия с подсказкой: ${assisted}.`,
    `Mistakes and unsuccessful attempts: ${unsuccessful}. Guided actions: ${assisted}.`,
    `Қателер мен сәтсіз әрекеттер: ${unsuccessful}. Көмекпен жасалған әрекеттер: ${assisted}.`
  );
  const reflection = document.createElement('p');
  reflection.textContent = gameText('Какую часть этой работы вы хотели бы попробовать ещё раз?', 'Which part of this job would you like to try again?', 'Осы жұмыстың қай бөлігін тағы байқап көргіңіз келеді?');
  const mode = document.createElement('p');
  mode.textContent = independentRun && !openedGuide
    ? gameText('Самостоятельная попытка', 'Independent attempt', 'Өз бетінше орындалған әрекет')
    : gameText('Практика с подсказками', 'Guided practice', 'Көмекпен жаттығу');
  body.replaceChildren(mode, summary, evidence, reflection);
}

async function requestAiFeedback(report) {
  if (typeof showCareerBlock === 'function') showCareerBlock(report);
  if (typeof showSurvey === 'function') showSurvey(report);
  const card = document.getElementById('aiFeedbackCard');
  const body = document.getElementById('aiFeedbackBody');
  const source = document.getElementById('aiFeedbackSource');
  const apiBase = getApiBase();
  if (!card) return;
  showLocalDebrief(card, source, body, report);
  if (apiBase === null || (apiBase === '' && location.hostname.endsWith('.github.io'))) return;
  const seq = ++aiRequestSeq;
  feedbackRequest?.abort();
  const request = new AbortController();
  feedbackRequest = request;
  const timeout = setTimeout(() => request.abort(), 4500);

  try {
    const res = await fetch(`${apiBase}/api/report`, {
      method: 'POST',
      signal: request.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...report, lang: typeof getLanguage === 'function' ? getLanguage() : 'ru' })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (seq !== aiRequestSeq || request.signal.aborted) return; // a newer session already asked
    if (data.source !== 'claude') return;
    const analysis = document.createElement('section');
    body.appendChild(analysis);
    source.innerText = data.source === 'claude' ? 'Сгенерировано Claude' : 'ИИ недоступен · базовый разбор';
    analysis.innerHTML = `
      <p>${escapeHtml(data.summary)}</p>
      ${data.strengths && data.strengths.length ? `<div><h5>Что получилось</h5><ul>${data.strengths.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
      ${data.growth_areas && data.growth_areas.length ? `<div><h5>Над чем поработать</h5><ul>${data.growth_areas.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
      ${data.career_advice ? `<div><h5>Совет по профессии</h5><p>${escapeHtml(data.career_advice)}</p></div>` : ''}
    `;
  } catch {
    // The local debrief is already visible.
  } finally {
    clearTimeout(timeout);
    if (feedbackRequest === request) feedbackRequest = null;
  }
}
