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
  const assessment = scenarioAssessment({
    module: 'safety', miniScores: fit.scores, accuracy: Math.max(0, 100 - errors * 15),
    violations: errors, events: sessionEvents, independent: independentRun
  });
  const score = assessment.score;
  const passed = !assessment.requiresRetry;
  setResultTexts({
    hardLabel: gameText('Практические упражнения', 'Practical exercises', 'Практикалық жаттығулар'), hard: assessment.practical + '%',
    handsLabel: gameText('Нарушения ТБ', 'Safety violations', 'Қауіпсіздік бұзушылықтары'), hands: String(assessment.criticalViolations),
    softLabel: gameText('Учебная проверка напряжения', 'Simulated voltage check', 'Оқу кернеу тексеруі'), soft: safetyState.voltageTested ? gameText('Выполнена', 'Completed', 'Орындалды') : gameText('Не выполнена', 'Incomplete', 'Орындалмады'),
    timeLabel: gameText('Время упражнения', 'Exercise duration', 'Жаттығу ұзақтығы'), time: state.timer + gameText(' сек', ' sec', ' сек'),
    grade: passed ? gameText('Упражнение пройдено без нарушений', 'Exercise completed without violations', 'Жаттығу бұзушылықсыз аяқталды') : gameText('Повторите упражнение', 'Retry the exercise', 'Жаттығуды қайталаңыз'),
    desc: passed
      ? gameText('Последовательность и практические задания выполнены без критических нарушений.', 'The sequence and practical tasks were completed without critical violations.', 'Әрекеттер реті мен практикалық тапсырмалар өрескел бұзушылықсыз орындалды.')
      : gameText('Нужна повторная практика. Высокие баллы других заданий не компенсируют нарушение безопасности.', 'Further practice is needed. High scores on other tasks do not offset a safety violation.', 'Қайта жаттығу қажет. Басқа тапсырмалардың жоғары балдары қауіпсіздік бұзушылығын өтемейді.'),
    praise: gameText('Результат учебной смены', 'Practice shift result', 'Оқу ауысымының нәтижесі'),
    badge: gameText('УЧЕБНАЯ СИМУЛЯЦИЯ', 'PRACTICE SCENARIO', 'ОҚУ СИМУЛЯЦИЯСЫ'),
    xp: '⚡ +' + Math.max(100, 750 - errors * 100) + ' XP',
    competencies: [
      ...assessment.strengths.map(item => assessmentDescriptor('safety', item.id).label + ': ' + item.score + '%')
    ]
  });
  showScreen('resultScreen');
  animateFitScore(score);

  const report = {
    module: 'safety',
    score,
    assessment,
    metrics: {
      violations: errors,
      voltage_tested: safetyState.voltageTested,
      lockout_applied: safetyState.lockoutApplied,
      valves_opened: safetyState.valvesOpened.filter(Boolean).length,
      total_time_sec: state.timer,
      mini_scores: { ...fit.scores },
      guidance_mode: assessment.mode
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
  const assessment = scenarioAssessment({ module: 'barista', miniScores: fit.scores, service, purchasing: result.purchasing, events: sessionEvents, independent: independentRun });
  const recommended = result.metBrief;
  setResultTexts({
    hardLabel: gameText('Техника приготовления', 'Drink technique', 'Сусын дайындау техникасы'), hard: accuracy + '%',
    handsLabel: gameText('Закупка по условиям', 'Purchasing requirements', 'Сатып алу талаптары'), hands: result.purchasing + '%',
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
    assessment,
    metrics: {
      step_accuracy_percent: accuracy,
      wrong_clicks: state.misclicks,
      total_time_sec: state.timer,
      conflict_choice: conflictLabels[state.conflictChoice] || 'none',
      conflict_response_sec: state.conflictResponseSec,
      budget_choice: state.budgetChoice || 'none',
      purchasing_percent: result.purchasing,
      service_percent: service,
      demand_kg: baristaOrder().demand,
      stock_kg: baristaOrder().stock,
      budget_tenge: baristaOrder().budget,
      mini_scores: { ...fit.scores },
      guidance_mode: assessment.mode
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

function reportModeText(mode) {
  return mode === 'independent'
    ? gameText('Самостоятельная попытка', 'Independent attempt', 'Өз бетінше орындалған әрекет')
    : gameText('Практика с подсказками', 'Guided practice', 'Көмекпен жаттығу');
}

function reportNextStep(report) {
  const a = report.assessment;
  if (a.criticalViolations) return gameText(
    'Повторите учебную смену безопасности без нарушений: перед действием проверьте обязательный предыдущий этап и сохраняйте блокировку.',
    'Repeat the safety exercise without violations: check each required preceding step before acting and maintain the lockout.',
    'Қауіпсіздік жаттығуын бұзушылықсыз қайталаңыз: әрекетке дейін міндетті алдыңғы қадамды тексеріп, бұғаттауды сақтаңыз.'
  );
  if (!a.practice.length && a.mode === 'guided') return gameText('Выполните новую попытку самостоятельно и сравните результаты упражнений.', 'Try a new attempt independently and compare your exercise results.', 'Жаңа әрекетті өз бетіңізше орындап, жаттығу нәтижелерін салыстырыңыз.');
  if (!a.practice.length) return gameText('Повторите сценарий и проверьте, удаётся ли сохранить результат без подсказок.', 'Repeat the scenario and check whether you can sustain the result without hints.', 'Сценарийді қайталап, көмексіз нәтижені сақтай алатыныңызды тексеріңіз.');
  return assessmentDescriptor(report.module, a.weakest.id).next;
}

function reportErrorEvidence(report) {
  const events = Array.isArray(report.events) ? report.events : [];
  const event = events.find(e => e && (String(e.action).startsWith('VIOLATION_') || e.action === 'TEST_VOLTAGE_LIVE_DANGER'));
  const safetyErrors = {
    VIOLATION_BREAKER_NO_PPE: ['Попытка переключения без СИЗ.', 'Attempted switching without PPE.', 'ЖҚҚ-сыз ауыстыру әрекеті.'],
    VIOLATION_LOTO_WHILE_POWER_ON: ['Попытка блокировки до отключения.', 'Attempted lockout before isolation.', 'Ажыратуға дейін бұғаттау әрекеті.'],
    VIOLATION_LOTO_NO_PPE: ['Попытка установки блокировки без СИЗ.', 'Attempted lockout without PPE.', 'ЖҚҚ-сыз бұғаттау әрекеті.'],
    VIOLATION_MEASUREMENT_BEFORE_LOCKOUT: ['Попытка измерения до блокировки.', 'Attempted measurement before lockout.', 'Бұғаттауға дейін өлшеу әрекеті.'],
    TEST_VOLTAGE_LIVE_DANGER: ['Учебная проверка обнаружила оставшееся напряжение.', 'The simulated check found remaining voltage.', 'Оқу тексеруі қалған кернеуді анықтады.'],
    VIOLATION_PRESSURE_STEP_OUT_OF_ORDER: ['Попытка сброса давления до обязательных проверок.', 'Attempted pressure release before required checks.', 'Міндетті тексерулерге дейін қысымды түсіру әрекеті.']
  };
  if (event && safetyErrors[event.action]) return gameText(...safetyErrors[event.action]);
  const wrongObjects = events.filter(e => e && String(e.action).startsWith('WRONG_OBJECT_')).length;
  if (wrongObjects) return gameText(`Выбор предмета вне текущего этапа: ${wrongObjects}.`, `Objects selected outside the current step: ${wrongObjects}.`, `Ағымдағы қадамға сәйкес емес затты таңдау: ${wrongObjects}.`);
  const a = report.assessment;
  if (a.practice.length) return gameText('Самое слабое упражнение: ', 'Lowest exercise result: ', 'Ең төмен жаттығу нәтижесі: ') + assessmentDescriptor(report.module, a.weakest.id).label + ' — ' + a.weakest.score + '%.';
  return gameText('Слабых упражнений по этой попытке не выявлено.', 'No weak exercise results were recorded in this attempt.', 'Бұл әрекетте әлсіз жаттығу нәтижелері тіркелмеді.');
}

function renderAssessmentEvidence(report) {
  const grid = document.querySelector('#resultScreen .result-grid-layout');
  if (!grid || !report.assessment) return;
  document.getElementById('assessmentEvidence')?.remove();
  const a = report.assessment;
  const screen = document.getElementById('resultScreen');
  if (screen) screen.setAttribute('data-outcome', a.requiresRetry ? 'practice' : 'complete');
  const titles = { safety: ['Инженер по безопасности', 'Safety engineer', 'Қауіпсіздік инженері'], barista: ['Бариста', 'Barista', 'Бариста'], it: ['IT-инженер', 'IT engineer', 'IT инженері'], doctor: ['Врач', 'Doctor', 'Дәрігер'] };
  const heading = document.getElementById('reportProfession');
  if (heading) heading.textContent = gameText(...titles[report.module]);
  const eyebrow = document.getElementById('reportEyebrow');
  if (eyebrow) eyebrow.textContent = gameText('ИТОГИ СМЕНЫ', 'SESSION REPORT', 'АУЫСЫМ ҚОРЫТЫНДЫСЫ');
  const subtitle = document.getElementById('reportSubtitle');
  if (subtitle) subtitle.textContent = gameText('Навыки, решения и следующий шаг.', 'Your skills, decisions and next step.', 'Дағдылар, шешімдер және келесі қадам.');
  const surveyToggle = document.getElementById('reportSurveyToggle');
  if (surveyToggle) surveyToggle.textContent = gameText('Помогите улучшить SynapKor · отзыв за 1 минуту', 'Help improve SynapKor · 1-minute feedback', 'SynapKor-ды жақсартыңыз · 1 минуттық пікір');
  const card = document.createElement('section');
  card.id = 'assessmentEvidence';
  card.className = 'report-card assessment-evidence';
  card.setAttribute('aria-labelledby', 'assessmentEvidenceTitle');
  const strengths = a.strengths.filter(item => ASSESSMENT_SKILLS[report.module].includes(item.id));
  const row = item => `<li class="evidence-skill" data-level="${item.score >= 80 ? 'strong' : 'practice'}"><div><span>${escapeHtml(assessmentDescriptor(report.module, item.id).label)}:</span> <strong>${item.score}%</strong></div><div class="evidence-track" aria-hidden="true"><span style="width:${item.score}%"></span></div></li>`;
  card.innerHTML = `<p class="assessment-mode">${reportModeText(a.mode)}</p>
    <h2 id="assessmentEvidenceTitle">${gameText('Что показала эта попытка', 'What this attempt showed', 'Бұл әрекет нені көрсетті')}</h2>
    ${a.requiresRetry ? `<p class="assessment-status" role="status">${a.criticalViolations
      ? gameText('Нарушена безопасность — требуется повторная практика', 'Safety violation — further practice required', 'Қауіпсіздік бұзылды — қайта жаттығу қажет')
      : gameText('Есть задания для повторной практики', 'Some tasks need further practice', 'Кейбір тапсырмаларды қайталау қажет')}</p>` : ''}
    <div class="assessment-columns"><div><h3>${gameText('Что получилось', 'Strengths in this attempt', 'Бұл әрекеттегі жетістіктер')}</h3>${strengths.length ? `<ul>${strengths.map(row).join('')}</ul>` : `<p>${gameText('Пока нет упражнений с результатом 80% или выше.', 'No exercise reached 80% yet.', 'Әзірге 80% не одан жоғары нәтиже жоқ.')}</p>`}</div>
    <div><h3>${gameText('Что потренировать', 'Needs practice', 'Нені жаттықтыру керек')}</h3>${a.practice.length ? `<ul>${a.practice.map(row).join('')}</ul>` : `<p>${gameText('Закрепите результат в самостоятельной попытке.', 'Consolidate the result in an independent attempt.', 'Нәтижені өз бетіңізше әрекетте бекітіңіз.')}</p>`}</div></div>
    <p class="assessment-observation">${escapeHtml(reportErrorEvidence(report))}</p>
    <p class="assessment-next"><strong>${gameText('Следующий шаг: ', 'Next step: ', 'Келесі қадам: ')}</strong>${escapeHtml(reportNextStep(report))}</p>
    <p class="profile-note">${gameText('Баллы относятся к этой учебной попытке и не оценивают профессиональную пригодность.', 'Scores describe this practice attempt and do not measure career aptitude.', 'Балдар осы оқу әрекетін сипаттайды және кәсіби жарамдылықты бағаламайды.')}</p>`;
  if (report.module === 'doctor') {
    const notice = document.createElement('p');
    notice.className = 'learning-notice';
    notice.textContent = gameText('Учебный сценарий ожидает проверки практикующим врачом.', 'This educational scenario awaits review by a practising clinician.', 'Бұл оқу сценарийі тәжірибелі дәрігердің тексеруін күтуде.');
    card.appendChild(notice);
  }
  grid.prepend(card);
  const badge = document.getElementById('resVerdictBadge');
  if (badge) badge.textContent = reportModeText(a.mode);
  if (a.requiresRetry) {
    const grade = document.getElementById('resVerdictGrade');
    if (grade) grade.textContent = gameText('Нужна повторная практика', 'Further practice needed', 'Қайта жаттығу қажет');
  }
  const competencies = document.getElementById('resCompetencies');
  if (competencies) competencies.textContent = a.strengths.length
    ? a.strengths.map(item => assessmentDescriptor(report.module, item.id).label + ': ' + item.score + '%').join(' · ')
    : gameText('Результаты упражнений показаны выше.', 'Exercise results are shown above.', 'Жаттығу нәтижелері жоғарыда көрсетілген.');
}

function showLocalDebrief(card, source, body, report) {
  const a = report.assessment;
  card.style.display = 'block';
  source.textContent = gameText('Разбор по результатам игры', 'Scenario feedback', 'Симуляция нәтижесін талдау');
  const summary = document.createElement('p');
  summary.textContent = report.module === 'barista' ? baristaPurchasingFeedback(report.metrics.budget_choice) : reportErrorEvidence(report);
  const evidence = document.createElement('p');
  evidence.textContent = gameText(
    `Ошибки и неудачные попытки: ${a.errors}. Действия с подсказкой: ${a.guidedActions}.`,
    `Mistakes and unsuccessful attempts: ${a.errors}. Guided actions: ${a.guidedActions}.`,
    `Қателер мен сәтсіз әрекеттер: ${a.errors}. Көмекпен жасалған әрекеттер: ${a.guidedActions}.`
  );
  const weighting = document.createElement('p');
  weighting.textContent = report.module === 'barista'
    ? gameText('Баллы: техника 55%, ответ гостю 25%, закупка 20%.', 'Scoring: technique 55%, customer response 25%, purchasing 20%.', 'Бағалау: техника 55%, қонаққа жауап 25%, сатып алу 20%.')
    : report.module === 'safety'
      ? gameText('Баллы: практические задания 70%, порядок действий 30%. Нарушение безопасности ограничивает результат до 59%.', 'Scoring: practical tasks 70%, procedure 30%. A safety violation caps the result at 59%.', 'Бағалау: практикалық тапсырмалар 70%, әрекеттер реті 30%. Қауіпсіздік бұзылса, нәтиже 59%-дан аспайды.')
      : gameText('Баллы: практические задания 60%, выбор предметов 10%, итоговое решение 20%, объяснение 10%.', 'Scoring: practical tasks 60%, object selection 10%, final decision 20%, explanation 10%.', 'Бағалау: практикалық тапсырмалар 60%, заттарды таңдау 10%, қорытынды шешім 20%, түсіндіру 10%.');
  const reflection = document.createElement('p');
  reflection.textContent = gameText('Какую часть этой работы вы хотели бы попробовать ещё раз?', 'Which part of this job would you like to try again?', 'Осы жұмыстың қай бөлігін тағы байқап көргіңіз келеді?');
  body.replaceChildren(summary, evidence, weighting, reflection);
}

async function requestAiFeedback(report) {
  if (!report.assessment) report.assessment = scenarioAssessment({ module: report.module, miniScores: report.metrics?.mini_scores || {}, accuracy: report.metrics?.step_accuracy_percent, events: report.events, independent: typeof independentRun !== 'undefined' && independentRun });
  renderAssessmentEvidence(report);
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
    source.innerText = gameText('Дополнение от Claude', 'Additional feedback from Claude', 'Claude қосымша пікірі');
    analysis.innerHTML = `
      <p>${escapeHtml(data.summary)}</p>
      ${Array.isArray(data.strengths) && data.strengths.length ? `<div><h5>${gameText('Что получилось', 'What went well', 'Не сәтті болды')}</h5><ul>${data.strengths.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
      ${Array.isArray(data.growth_areas) && data.growth_areas.length ? `<div><h5>${gameText('Над чем поработать', 'What to practise', 'Нені жаттықтыру керек')}</h5><ul>${data.growth_areas.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>` : ''}
      ${data.career_advice ? `<div><h5>${gameText('Для дальнейшего изучения', 'For further exploration', 'Әрі қарай зерттеуге')}</h5><p>${escapeHtml(data.career_advice)}</p></div>` : ''}
    `;
  } catch {
    // The local debrief is already visible.
  } finally {
    clearTimeout(timeout);
    if (feedbackRequest === request) feedbackRequest = null;
  }
}
