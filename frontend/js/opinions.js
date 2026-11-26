// User comments are always rendered as text, never as markup.
const opinionLang = new URLSearchParams(location.search).get('lang') || 'en';
document.documentElement.lang = ['ru', 'kk'].includes(opinionLang) ? opinionLang : 'en';
const ot = (en, ru, kk) => opinionLang === 'ru' ? ru : opinionLang === 'kk' ? kk : en;
const opinionNames = {
  safety: ot('Safety engineer', 'Инженер по ТБ', 'Қауіпсіздік инженері'),
  barista: ot('Barista', 'Бариста', 'Бариста'),
  it: ot('IT specialist', 'IT-специалист', 'IT маманы'),
  doctor: ot('Doctor', 'Врач', 'Дәрігер')
};
const questionNames = ['Who are you?', 'Understanding before playing (1–5)', 'Clarity (1–5)', 'Did the guide help?', 'Completed without outside help?', 'Learned something new?', 'Report accuracy (1–5)', 'Want to try more professions?'];
const kkQuestions = ['Сіз кімсіз?', 'Ойынға дейінгі түсінік (1–5)', 'Түсініктілік (1–5)', 'Гид көмектесті ме?', 'Өзге адамдардың көмегінсіз өттіңіз бе?', 'Жаңа нәрсе білдіңіз бе?', 'Есеп сәйкестігі (1–5)', 'Басқа мамандықтарды көргіңіз келе ме?'];
const translatedAnswers = {
  'Да': ot('Yes', 'Да', 'Иә'), 'Нет': ot('No', 'Нет', 'Жоқ'), 'Частично': ot('Partly', 'Частично', 'Ішінара'),
  'Не знаю': ot('Not sure', 'Не знаю', 'Білмеймін'), '8–9 класс': ot('Grades 8–9', '8–9 класс', '8–9 сынып'),
  '10–11 класс': ot('Grades 10–11', '10–11 класс', '10–11 сынып'), 'Колледж': ot('College', 'Колледж', 'Колледж'),
  'Вуз': ot('University', 'Вуз', 'ЖОО'), 'Работаю': ot('Working', 'Работаю', 'Жұмыс істеймін')
};
const statusEl = document.getElementById('opinionStatus');
const listEl = document.getElementById('opinionList');
const moreEl = document.getElementById('opinionMore');
const refreshEl = document.getElementById('opinionRefresh');
const filterEl = document.getElementById('opinionModule');
let opinionPage = 0;
let opinionSnapshot;
let opinionRequest;
const displayedReviews = new Set();
function textElement(tag, value) { const el = document.createElement(tag); el.textContent = value; return el; }
function renderOpinion(row) {
  const card = document.createElement('article'); card.className = 'opinion-card';
  const header = document.createElement('header');
  header.append(textElement('h2', opinionNames[row.module] || row.module));
  const date = new Date(row.at);
  const time = textElement('time', Number.isNaN(date.valueOf()) ? '' : date.toLocaleDateString(document.documentElement.lang, { dateStyle: 'medium' }));
  if (!Number.isNaN(date.valueOf())) time.dateTime = date.toISOString();
  header.append(time); card.append(header);
  card.append(textElement('blockquote', row.comment || ot('Survey completed without a written comment.', 'Анкета без текстового комментария.', 'Мәтіндік пікірсіз сауалнама.')));
  const details = document.createElement('details');
  details.append(textElement('summary', ot('View all survey answers', 'Все ответы анкеты', 'Барлық жауаптар')));
  const dl = document.createElement('dl');
  SURVEY_QUESTIONS.forEach((q, i) => {
    const label = opinionLang === 'ru' ? q.text : opinionLang === 'kk' ? kkQuestions[i] : questionNames[i];
    const value = row.answers?.[q.id] || '—';
    dl.append(textElement('dt', label), textElement('dd', translatedAnswers[value] || value));
  });
  details.append(dl); card.append(details); return card;
}
async function loadOpinions(reset = false) {
  opinionRequest?.abort();
  const request = new AbortController(); opinionRequest = request;
  let timeout;
  const nextPage = reset ? 1 : opinionPage + 1;
  if (reset) { listEl.replaceChildren(); displayedReviews.clear(); opinionPage = 0; opinionSnapshot = undefined; }
  listEl.setAttribute('aria-busy', 'true'); refreshEl.disabled = true; moreEl.disabled = true;
  statusEl.textContent = ot('Loading reviews…', 'Загрузка отзывов…', 'Пікірлер жүктелуде…');
  try {
    // Public reading must not wait behind uploads on a slow connection.
    syncSurveyQueue();
    timeout = setTimeout(() => request.abort(), 10000);
    const base = getApiBase(); if (base === null) throw new Error('No backend');
    const query = new URLSearchParams({ page: String(nextPage), module: filterEl.value });
    if (opinionSnapshot !== undefined) query.set('snapshot', opinionSnapshot);
    const res = await fetch(base + '/api/reviews?' + query, { signal: request.signal, cache: 'no-store' });
    if (!res.ok) throw new Error('Reviews unavailable');
    const data = await res.json();
    if (!Array.isArray(data.reviews)) throw new Error('Invalid reviews');
    if (opinionRequest !== request) return;
    for (const row of data.reviews) {
      if (displayedReviews.has(row.id)) continue;
      displayedReviews.add(row.id); listEl.append(renderOpinion(row));
    }
    opinionPage = nextPage;
    opinionSnapshot = data.snapshot;
    moreEl.hidden = !data.hasMore;
    statusEl.textContent = data.total ? data.total + ' ' + ot('reviews', 'отзывов', 'пікір') : ot('No reviews yet. Yours can be the first.', 'Отзывов пока нет. Ваш может стать первым.', 'Әзірге пікір жоқ. Бірінші болыңыз.');
  } catch {
    if (opinionRequest !== request) return;
    moreEl.hidden = opinionPage === 0;
    statusEl.textContent = ot('Shared reviews are unavailable. Check your connection and press Refresh. This page needs the SynapKor backend.', 'Общие отзывы недоступны. Проверьте подключение и нажмите «Обновить». Для страницы нужен сервер SynapKor.', 'Ортақ пікірлер қолжетімсіз. Байланысты тексеріп, «Жаңарту» түймесін басыңыз. SynapKor сервері қажет.');
  } finally {
    clearTimeout(timeout);
    if (opinionRequest === request) { listEl.setAttribute('aria-busy', 'false'); refreshEl.disabled = false; moreEl.disabled = false; }
  }
}
document.getElementById('opinionsIntro').textContent = ot('Anonymous answers and reviews from the post-simulation survey.', 'Анонимные ответы и отзывы после прохождения симуляций.', 'Симуляциядан кейінгі анонимді жауаптар мен пікірлер.');
document.getElementById('opinionsEyebrow').textContent = ot('From the people who tried it', 'От тех, кто попробовал', 'Сынап көргендердің пікірі');
document.getElementById('opinionFilterLabel').textContent = ot('Simulation', 'Симуляция', 'Симуляция');
filterEl.options[0].textContent = ot('All simulations', 'Все симуляции', 'Барлық симуляциялар');
for (const option of [...filterEl.options].slice(1)) option.textContent = opinionNames[option.value];
refreshEl.textContent = ot('Refresh', 'Обновить', 'Жаңарту');
moreEl.textContent = ot('Load more', 'Ещё отзывы', 'Тағы пікірлер');
document.getElementById('opinionsFooter').textContent = ot('Finish a simulation and complete its survey to add your opinion.', 'Завершите симуляцию и заполните анкету, чтобы добавить отзыв.', 'Пікір қосу үшін симуляцияны аяқтап, сауалнаманы толтырыңыз.');
const backUrl = new URL('index.html', location.href); backUrl.search = location.search;
backUrl.searchParams.delete('module'); backUrl.searchParams.delete('survey');
document.getElementById('opinionsBack').href = backUrl.href;
refreshEl.onclick = () => loadOpinions(true);
filterEl.onchange = () => loadOpinions(true);
moreEl.onclick = () => loadOpinions();
window.addEventListener('survey-synced', () => loadOpinions(true));
window.addEventListener('online', () => loadOpinions(true));
const languageEl = document.getElementById('opinionsLanguage');
languageEl.value = document.documentElement.lang;
languageEl.onchange = () => {
  const url = new URL(location.href); url.searchParams.set('lang', languageEl.value); location.assign(url);
};
loadOpinions(true);
