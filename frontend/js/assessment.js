// Transparent practice scores: these describe one exercise, not career aptitude.
const ASSESSMENT_SKILLS = {
  it: ['priority', 'analysis', 'diagnosis', 'syntax', 'verification'],
  doctor: ['protocol', 'attention', 'hearing', 'diagnosis'],
  safety: ['vigilance', 'thoroughness', 'control', 'firmness'],
  barista: ['precision', 'timing', 'feel']
};

function assessmentPercent(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function scenarioAssessment(input = {}) {
  const events = Array.isArray(input.events) ? input.events.filter(e => e && typeof e.action === 'string') : [];
  const guidedActions = events.filter(e => e.action === 'GUIDED_ACTION').length;
  const mode = input.independent && !guidedActions && !events.some(e => e.action === 'GUIDE_REOPENED') ? 'independent' : 'guided';
  const miniScores = input.miniScores && typeof input.miniScores === 'object' ? input.miniScores : {};
  const exercises = (ASSESSMENT_SKILLS[input.module] || []).map(id => ({ id, score: assessmentPercent(miniScores[id]) }));
  const practical = exercises.length ? exercises.reduce((sum, item) => sum + item.score, 0) / exercises.length : 0;
  const components = [...exercises];
  let rawScore;
  let criticalViolations = 0;
  if (input.module === 'barista') {
    components.push({ id: 'service', score: assessmentPercent(input.service) }, { id: 'purchasing', score: assessmentPercent(input.purchasing) });
    rawScore = Math.round(practical) * 0.55 + assessmentPercent(input.service) * 0.25 + assessmentPercent(input.purchasing) * 0.2;
  } else if (input.module === 'safety') {
    components.push({ id: 'procedure', score: assessmentPercent(input.accuracy) });
    criticalViolations = Math.max(Number.isFinite(input.violations) ? Math.max(0, Math.floor(input.violations)) : 0,
      events.filter(e => e.action.startsWith('VIOLATION_') || e.action === 'TEST_VOLTAGE_LIVE_DANGER').length);
    // Giving away/removing the lock cannot be averaged into a successful safety result.
    if (typeof miniScores.firmness === 'number' && Number.isFinite(miniScores.firmness) && miniScores.firmness < 60) criticalViolations = Math.max(1, criticalViolations);
    rawScore = practical * 0.7 + assessmentPercent(input.accuracy) * 0.3;
  } else {
    components.push({ id: 'accuracy', score: assessmentPercent(input.accuracy) }, { id: 'hard', score: assessmentPercent(input.hard) }, { id: 'soft', score: assessmentPercent(input.soft) });
    rawScore = practical * 0.6 + assessmentPercent(input.accuracy) * 0.1 + assessmentPercent(input.hard) * 0.2 + assessmentPercent(input.soft) * 0.1;
  }
  const score = Math.round(Math.min(criticalViolations ? 59 : 100, rawScore));
  const ordered = [...components].sort((a, b) => a.score - b.score);
  const requiresRetry = criticalViolations > 0 || components.some(item => item.score < 60);
  return {
    version: 2, score, practical: Math.round(practical), mode, components,
    strengths: components.filter(item => item.score >= 80),
    practice: ordered.filter(item => item.score < 80), weakest: ordered[0] || null,
    requiresRetry, criticalViolations, guidedActions,
    errors: events.filter(e => e.ok === false).length,
    tier: score >= 85 && !requiresRetry ? 'top' : score >= 60 ? 'mid' : 'low'
  };
}

// Every next step names an action from the exercise that generated the evidence.
function assessmentDescriptor(module, id) {
  const descriptors = {
    priority: [['Приоритет инцидентов', 'Incident priority', 'Оқиға басымдығы'], ['Повторите сортировку сигналов: начните с проблемы, мешающей клиентам.', 'Repeat alert triage: start with the problem blocking customers.', 'Сигналдарды қайта сұрыптаңыз: алдымен клиенттерге кедергі келтіретін мәселені таңдаңыз.']],
    analysis: [['Анализ свидетельств', 'Evidence analysis', 'Деректерді талдау'], ['Сопоставьте сообщение журнала с наблюдаемым сбоем, прежде чем выбирать причину.', 'Match the log evidence to the observed failure before choosing a cause.', 'Себепті таңдамас бұрын журнал дерегін байқалған ақаумен салыстырыңыз.']],
    syntax: [['Команда восстановления', 'Recovery command', 'Қалпына келтіру командасы'], ['Соберите команду заново и проверьте действие, интерфейс и параметры перед запуском.', 'Rebuild the command and check its action, interface and arguments before running it.', 'Команданы қайта құрып, іске қоспас бұрын әрекетін, интерфейсін және параметрлерін тексеріңіз.']],
    verification: [['Проверка восстановления', 'Recovery verification', 'Қалпына келтіруді тексеру'], ['Проверьте и состояние сервиса, и клиентскую операцию после исправления.', 'After the repair, check both service health and the customer transaction.', 'Жөндеуден кейін қызмет күйін де, клиент операциясын да тексеріңіз.']],
    protocol: [['Порядок обработки рук', 'Hand hygiene sequence', 'Қол гигиенасының реті'], ['Повторите порядок обработки рук и проверьте пропущенный этап.', 'Repeat the hand hygiene sequence and check the missed step.', 'Қол гигиенасының ретін қайталап, өткізіп алған қадамды тексеріңіз.']],
    attention: [['Измерение пульса', 'Pulse measurement', 'Тамыр соғысын өлшеу'], ['Повторите измерение пульса, сверяя каждое нажатие с ритмом.', 'Repeat the pulse measurement, matching each tap to the rhythm.', 'Әр басуды ырғақпен сәйкестендіріп, тамыр соғысын қайта өлшеңіз.']],
    hearing: [['Измерение давления', 'Blood pressure measurement', 'Қан қысымын өлшеу'], ['Повторите измерение и отметьте начало и окончание слышимых тонов.', 'Repeat the measurement and mark when the audible sounds begin and end.', 'Өлшеуді қайталап, естілетін дыбыстардың басталуы мен аяқталуын белгілеңіз.']],
    vigilance: [['Поиск опасностей', 'Hazard recognition', 'Қауіпті анықтау'], ['Повторите осмотр площадки и отметьте все опасности до начала действий.', 'Repeat the site scan and identify every hazard before acting.', 'Алаңды қайта қарап, әрекетке дейін барлық қауіпті белгілеңіз.']],
    thoroughness: [['Полнота проверки прибором', 'Completeness of meter check', 'Аспаппен тексерудің толықтығы'], ['Повторите учебную проверку прибора и все точки измерения в указанном порядке.', 'Repeat the simulated meter check and every measurement point in the required order.', 'Симуляцияда аспапты және барлық өлшеу нүктесін көрсетілген ретпен қайта тексеріңіз.']],
    control: [['Контроль давления', 'Pressure control', 'Қысымды бақылау'], ['Повторите плавное снижение давления, следя за индикатором.', 'Repeat the gradual pressure reduction while watching the indicator.', 'Индикаторды бақылай отырып, қысымды біртіндеп төмендетуді қайталаңыз.']],
    firmness: [['Соблюдение блокировки', 'Maintaining lockout', 'Бұғаттауды сақтау'], ['Повторите ответ коллеге: сохраните блокировку и объясните безопасный следующий шаг.', 'Repeat the colleague response: keep the lockout and explain the safe next step.', 'Әріптеске жауапты қайталаңыз: бұғаттауды сақтап, келесі қауіпсіз қадамды түсіндіріңіз.']],
    precision: [['Дозировка кофе', 'Coffee dose', 'Кофе мөлшері'], ['Повторите дозировку и остановитесь на целевой массе.', 'Repeat dosing and stop at the target weight.', 'Мөлшерлеуді қайталап, мақсатты салмақта тоқтаңыз.']],
    timing: [['Экстракция кофе', 'Coffee extraction', 'Кофе экстракциясы'], ['Повторите экстракцию, сверяя цвет и время с диапазоном задания.', 'Repeat extraction and compare the colour and time with the exercise target range.', 'Экстракцияны қайталап, түс пен уақытты тапсырма аралығымен салыстырыңыз.']],
    feel: [['Подготовка молока', 'Milk preparation', 'Сүт дайындау'], ['Повторите работу с молоком, удерживая питчер в целевой зоне.', 'Repeat milk preparation while keeping the pitcher in the target zone.', 'Құмыраны мақсатты аймақта ұстап, сүт дайындауды қайталаңыз.']],
    service: [['Ответ гостю', 'Customer response', 'Қонаққа жауап'], ['Повторите ответ на жалобу: признайте проблему и предложите исправление.', 'Repeat the complaint response: acknowledge the problem and offer a remedy.', 'Шағымға жауапты қайталаңыз: мәселені мойындап, түзетуді ұсыныңыз.']],
    purchasing: [['Закупка', 'Purchasing', 'Сатып алу'], ['Вычтите остаток из спроса, затем проверьте стоимость заказа и резерв бюджета.', 'Subtract stock from demand, then check the order cost and remaining budget.', 'Сұраныстан қорды шегеріп, тапсырыс құнын және бюджет қалдығын тексеріңіз.']],
    accuracy: [['Выбор предметов', 'Object selection', 'Заттарды таңдау'], ['Перед взаимодействием сверьте предмет с текущей задачей.', 'Before interacting, match the object to the current task.', 'Әрекетке дейін затты ағымдағы тапсырмамен сәйкестендіріңіз.']],
    hard: [['Итоговое решение', 'Final decision', 'Қорытынды шешім'], ['Повторите итоговый выбор, опираясь на собранные данные и результат проверки.', 'Repeat the final choice using the collected evidence and verification result.', 'Жиналған деректер мен тексеру нәтижесіне сүйеніп, қорытынды таңдауды қайталаңыз.']],
    soft: [['Объяснение решения', 'Explaining the decision', 'Шешімді түсіндіру'], ['Объясните ситуацию понятными словами и назовите следующий шаг.', 'Explain the situation in plain language and name the next step.', 'Жағдайды түсінікті тілмен түсіндіріп, келесі қадамды атаңыз.']],
    procedure: [['Последовательность действий', 'Procedure sequence', 'Әрекеттер реті'], ['Повторите учебную последовательность без пропуска обязательных проверок.', 'Repeat the simulated sequence without skipping required checks.', 'Міндетті тексерулерді өткізбей, оқу ретін қайталаңыз.']]
  };
  descriptors.diagnosis = module === 'it'
    ? [['Определение причины', 'Root cause selection', 'Түпкі себепті анықтау'], ['Проверьте выбранную причину по журналам и состоянию сети до исправления.', 'Check the selected cause against logs and network state before repairing it.', 'Жөндеуден бұрын таңдалған себепті журналдармен және желі күйімен тексеріңіз.']]
    : [['Поиск признаков при аускультации', 'Recognising auscultation findings', 'Аускультация белгілерін анықтау'], ['Повторите сравнение зон и отметьте область с изменённым звуком.', 'Repeat the comparison of listening zones and identify the changed sound.', 'Тыңдау аймақтарын қайта салыстырып, дыбысы өзгерген жерді белгілеңіз.']];
  const entry = descriptors[id] || descriptors.accuracy;
  return { label: gameText(...entry[0]), next: gameText(...entry[1]) };
}
