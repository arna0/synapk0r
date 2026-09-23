// Rule-based feedback used when Claude is not configured or the request fails.
// Same response shape as the AI feedback: { summary, strengths, growth_areas, career_advice }.

export function ruleBasedFeedback({ module, score, metrics }) {
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
      ? 'Внимательность к порядку действий — ключевое качество инженера по охране труда. Эта профессия может вам подойти.'
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
  if (m.budget_choice && m.budget_choice !== 'optimal') growth.push('Закупка должна покрывать недельный расход (35 кг) и оставаться в пределах бюджета.');
  if (growth.length === 0) growth.push('Попробуйте сократить время приготовления, сохранив точность.');

  return {
    summary: `Смена бариста завершена, итоговый балл ${score}.`,
    strengths,
    growth_areas: growth,
    career_advice: score >= 90
      ? 'Вы уверенно справились и с руками, и с гостем, и с цифрами — работа бариста вам, вероятно, подойдёт.'
      : 'Базовые навыки есть. Если профессия интересна, потренируйтесь в общении с гостями и расчёте закупок.'
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
    adviceTop: 'У вас системное мышление и спокойствие при сбоях — профессии DevOps и инженера поддержки вам могут подойти.',
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
    adviceTop: 'Вы внимательны к деталям и к людям — медицина может вам подойти. Следующий шаг: биология и химия на профильном уровне.',
    adviceLow: 'Если медицина интересна, начните с основ анатомии и первой помощи и повторите симуляцию.'
  });
}
