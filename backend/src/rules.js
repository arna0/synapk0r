// Rule-based feedback used when Claude is not configured or the request fails.
// Same response shape as the AI feedback: { summary, strengths, growth_areas, career_advice }.

const EXERCISE_NAMES = {
  priority: ['Приоритет инцидентов', 'Incident priority', 'Оқиға басымдығы'],
  analysis: ['Анализ свидетельств', 'Evidence analysis', 'Деректерді талдау'],
  diagnosis: ['Определение причины / признаков', 'Identifying causes or findings', 'Себептерді не белгілерді анықтау'],
  syntax: ['Команда восстановления', 'Recovery command', 'Қалпына келтіру командасы'],
  verification: ['Проверка восстановления', 'Recovery verification', 'Қалпына келтіруді тексеру'],
  protocol: ['Порядок обработки рук', 'Hand hygiene sequence', 'Қол гигиенасының реті'],
  attention: ['Внимание к деталям', 'Attention to detail', 'Бөлшектерге назар'],
  hearing: ['Измерение давления', 'Blood pressure measurement', 'Қан қысымын өлшеу'],
  vigilance: ['Поиск опасностей', 'Hazard recognition', 'Қауіпті анықтау'],
  thoroughness: ['Полнота проверки прибором', 'Completeness of meter check', 'Аспаппен тексерудің толықтығы'],
  control: ['Контроль давления', 'Pressure control', 'Қысымды бақылау'],
  firmness: ['Соблюдение блокировки', 'Maintaining lockout', 'Бұғаттауды сақтау'],
  precision: ['Дозировка кофе', 'Coffee dose', 'Кофе мөлшері'],
  timing: ['Экстракция кофе', 'Coffee extraction', 'Кофе экстракциясы'],
  feel: ['Подготовка молока', 'Milk preparation', 'Сүт дайындау'],
  service: ['Ответ гостю', 'Customer response', 'Қонаққа жауап'],
  purchasing: ['Закупка', 'Purchasing', 'Сатып алу'],
  hard: ['Итоговое решение', 'Final decision', 'Қорытынды шешім'],
  soft: ['Объяснение решения', 'Explaining the decision', 'Шешімді түсіндіру']
};

function measuredFeedback({ module, score, metrics, events = [], lang }) {
  const t = (...values) => values[lang === 'en' ? 1 : lang === 'kk' ? 2 : 0];
  const exercises = Object.entries(metrics.mini_scores || {}).filter(([id, value]) => Object.hasOwn(EXERCISE_NAMES, id) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100);
  if (!exercises.length) return null;
  if (module === 'barista') {
    if (Number.isFinite(metrics.service_percent)) exercises.push(['service', metrics.service_percent]);
    if (Number.isFinite(metrics.purchasing_percent)) exercises.push(['purchasing', metrics.purchasing_percent]);
  } else if (module === 'it' || module === 'doctor') {
    const hard = metrics[module === 'it' ? 'code_correct' : 'diagnosis_correct'];
    if (typeof hard === 'boolean') exercises.push(['hard', hard ? 100 : 0]);
    if (typeof metrics.comms_correct === 'boolean') exercises.push(['soft', metrics.comms_correct ? 100 : 0]);
  }
  exercises.sort((a, b) => a[1] - b[1]);
  const describe = ([id, value]) => `${t(...EXERCISE_NAMES[id])}: ${value}%`;
  const weak = exercises.filter(([, value]) => value < 80);
  const violations = module === 'safety' ? Math.max(Number(metrics.violations) || 0, events.filter(e => e.action?.startsWith('VIOLATION_') || e.action === 'TEST_VOLTAGE_LIVE_DANGER').length, metrics.mini_scores.firmness < 60 ? 1 : 0) : 0;
  const next = violations
    ? t('Повторите учебную последовательность без нарушения блокировки и обязательных проверок.', 'Repeat the simulated sequence without violating lockout or skipping required checks.', 'Бұғаттауды бұзбай және міндетті тексерулерді өткізбей, оқу ретін қайталаңыз.')
    : weak.length
      ? t(`Повторите упражнение «${t(...EXERCISE_NAMES[weak[0][0]])}» и проверьте причину ошибки перед действием.`, `Repeat “${t(...EXERCISE_NAMES[weak[0][0]])}” and check the reason for the error before acting.`, `«${t(...EXERCISE_NAMES[weak[0][0]])}» жаттығуын қайталап, әрекетке дейін қате себебін тексеріңіз.`)
      : t('Повторите сценарий самостоятельно и сравните результаты упражнений.', 'Repeat the scenario independently and compare exercise results.', 'Сценарийді өз бетіңізше қайталап, жаттығу нәтижелерін салыстырыңыз.');
  const mode = metrics.guidance_mode === 'independent' ? t('Самостоятельная попытка', 'Independent attempt', 'Өз бетінше әрекет') : metrics.guidance_mode === 'guided' ? t('Практика с подсказками', 'Guided practice', 'Көмекпен жаттығу') : t('Режим не указан', 'Mode not recorded', 'Режим көрсетілмеген');
  return {
    summary: `${mode}. ${t(`Балл упражнения: ${score}.`, `Exercise score: ${score}.`, `Жаттығу балы: ${score}.`)}${violations ? ' ' + t(`Нарушений безопасности: ${violations}; нужна повторная практика.`, `Safety violations: ${violations}; further practice is required.`, `Қауіпсіздік бұзушылықтары: ${violations}; қайта жаттығу қажет.`) : ''}`,
    strengths: exercises.filter(([, value]) => value >= 80).slice(0, 3).map(describe),
    growth_areas: [...weak.slice(0, 2).map(describe), next],
    career_advice: next
  };
}

export function ruleBasedFeedback(report) {
  const { module, score, metrics } = report;
  const measured = measuredFeedback(report);
  if (measured) return measured;
  if (module === 'safety') return safetyFeedback(score, metrics);
  if (module === 'it') return itFeedback(score, metrics);
  if (module === 'doctor') return doctorFeedback(score, metrics);
  return baristaFeedback(score, metrics);
}

function safetyFeedback(score, m) {
  const violations = Number(m.violations) || 0;
  const strengths = [];
  const growth = [];

  if (violations === 0) strengths.push('Процедура LOTO выполнена без единого нарушения ТБ.');
  if (m.voltage_tested) strengths.push('Отсутствие напряжения проверено прибором, а не «на глаз».');
  if (m.lockout_applied) strengths.push('Рубильник заблокирован замком — никто не включит питание во время работ.');

  if (violations > 0) growth.push(`Нарушений ТБ: ${violations}. Порядок всегда один: СИЗ → отключение → замок → замер → сброс давления.`);
  if ((Number(m.total_time_sec) || 0) > 240) growth.push('Подготовка заняла больше 4 минут — отработайте последовательность до автоматизма.');
  if (growth.length === 0) growth.push('Попробуйте пройти сценарий быстрее, сохранив ноль ошибок.');

  return {
    summary: violations === 0
      ? `Оборудование подготовлено к ремонту по регламенту, итоговый балл ${score}.`
      : `Регламент выполнен, но с нарушениями ТБ (${violations}), итоговый балл ${score}.`,
    strengths,
    growth_areas: growth,
    career_advice: violations === 0
      ? 'Повторите учебный сценарий самостоятельно и проверьте соблюдение каждого обязательного этапа.'
      : 'В промышленной безопасности цена ошибки высока. Если профессия интересна, начните с изучения правил LOTO и повторите симуляцию.'
  };
}

function baristaFeedback(score, m) {
  const wrong = Number(m.wrong_clicks) || 0;
  const strengths = [];
  const growth = [];

  if (wrong === 0) strengths.push('Техкарта Iced Oat Latte выполнена точно, без лишних действий.');
  else if (wrong <= 2) strengths.push('Напиток приготовлен почти без ошибок в последовательности.');
  if (m.conflict_choice === 'Apologized & Remade Fast') strengths.push('С недовольным гостем выбран лучший вариант: извиниться и быстро исправить.');
  if (m.budget_choice === 'optimal') strengths.push('Закупка зерна рассчитана без дефицита и без выхода за бюджет.');

  if (wrong > 2) growth.push(`Лишних действий: ${wrong}. Сначала найдите нужный предмет, потом действуйте.`);
  if (m.conflict_choice && m.conflict_choice !== 'Apologized & Remade Fast') growth.push('В конфликте с гостем лучше признать ошибку и предложить решение, чем спорить или перекладывать.');
  if (m.budget_choice && m.budget_choice !== 'optimal') growth.push('Вычтите имеющийся запас из спроса текущего задания и проверьте стоимость заказа по его бюджету.');
  if (growth.length === 0) growth.push('Попробуйте сократить время приготовления, сохранив точность.');

  return {
    summary: `Смена бариста завершена, итоговый балл ${score}.`,
    strengths,
    growth_areas: growth,
    career_advice: score >= 90
      ? 'Повторите смену самостоятельно, проверяя отдельно технику, ответ гостю и закупку.'
      : 'Повторите упражнение, которое вызвало трудности: приготовление, ответ гостю или расчёт закупки.'
  };
}

// Shared shape of the scenario modules (it, doctor): steps in 3D + two decisions (hard / soft).
function scenarioFeedback(score, m, t) {
  const wrong = Number(m.wrong_clicks) || 0;
  const strengths = [];
  const growth = [];

  if (wrong === 0) strengths.push(t.stepsPerfect);
  else if (wrong <= 2) strengths.push(t.stepsGood);
  if (m[t.hardKey + '_correct'] === true) strengths.push(t.hardOk);
  if (m.comms_correct === true) strengths.push(t.softOk);

  if (wrong > 2) growth.push(`Лишних действий: ${wrong}. ${t.stepsTip}`);
  if (m[t.hardKey + '_correct'] === false) growth.push(t.hardTip);
  if (m.comms_correct === false) growth.push(t.softTip);
  if (growth.length === 0) growth.push('Попробуйте пройти сценарий быстрее, сохранив точность.');

  return {
    summary: `${t.title}, итоговый балл ${score}.`,
    strengths,
    growth_areas: growth,
    career_advice: score >= 85 ? t.adviceTop : t.adviceLow
  };
}

function itFeedback(score, m) {
  return scenarioFeedback(score, m, {
    title: 'Дежурство IT-инженера завершено',
    hardKey: 'code',
    stepsPerfect: 'Инцидент разобран строго по порядку: алерт → логи → причина → исправление → проверка.',
    stepsGood: 'Инцидент разобран почти без лишних действий.',
    hardOk: 'Баг в коде исправлен правильно: проверка пустого списка вместо сокрытия ошибки.',
    softOk: 'Сбой объяснён заказчику простыми словами, с причиной и планом.',
    stepsTip: 'Идите по плану диагностики: сначала факты (мониторинг, логи), потом действия.',
    hardTip: 'Исправляйте причину ошибки (деление на ноль при пустом списке), а не прячьте её.',
    softTip: 'С бизнесом говорите без жаргона: что случилось, что уже сделано и как не допустить повторения.',
    adviceTop: 'Повторите другой вариант инцидента самостоятельно: соберите свидетельства, исправьте причину и проверьте результат.',
    adviceLow: 'Если IT интересно, начните с основ Linux и Python и повторите симуляцию.'
  });
}

function doctorFeedback(score, m) {
  return scenarioFeedback(score, m, {
    title: 'Приём врача-терапевта завершён',
    hardKey: 'diagnosis',
    stepsPerfect: 'Осмотр проведён по стандарту: жалобы, гигиена рук, все показатели и аускультация.',
    stepsGood: 'Осмотр проведён почти без ошибок в порядке действий.',
    hardOk: 'Симптомы связаны верно: подозрение на пневмонию подтверждается рентгеном и анализами.',
    softOk: 'С пациентом вы говорили честно и бережно, объяснили план.',
    stepsTip: 'Порядок осмотра важен: сначала жалобы и гигиена рук, потом измерения.',
    hardTip: 'Не угадывайте диагноз: при температуре, низкой сатурации и хрипах нужно обследование.',
    softTip: 'Встревоженному пациенту нужны спокойствие и понятный план, без отмахивания и запугивания.',
    adviceTop: 'Повторите учебный осмотр самостоятельно и объясните, какие наблюдения обосновывают итоговый выбор.',
    adviceLow: 'Если медицина интересна, начните с основ анатомии и первой помощи и повторите симуляцию.'
  });
}
