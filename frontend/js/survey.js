// SynapKor — Post-session survey for validation (docs/VALIDATION.md).
// Consented feedback is queued locally. Publication requires a separate opt-in.
// Shared reviews: testers-opinion.html. Private device summary: index.html?survey=results

const SURVEY_KEY = 'synapkor_survey_v1';

const SURVEY_QUESTIONS = [
  { id: 'role', text: 'Кто вы?', type: 'choice', options: ['8–9 класс', '10–11 класс', 'Колледж', 'Вуз', 'Работаю'] },
  { id: 'before', text: 'Насколько хорошо вы представляли эту работу ДО симуляции?', type: 'scale', hyp: 'H1' },
  { id: 'clarity', text: 'Насколько понятно было, что делать?', type: 'scale' },
  { id: 'guide', text: 'Помог ли гид?', type: 'choice', options: ['Да', 'Частично', 'Нет'] },
  { id: 'no_help', text: 'Вы прошли без подсказок от других людей?', type: 'choice', options: ['Да', 'Нет'], hyp: 'H2' },
  { id: 'learned', text: 'Узнали что-то новое о профессии?', type: 'choice', options: ['Да', 'Нет'], hyp: 'H3' },
  { id: 'report_match', text: 'Насколько отчёт совпал с вашим ощущением?', type: 'scale' },
  { id: 'more', text: 'Хотели бы попробовать другие профессии так же?', type: 'choice', options: ['Да', 'Нет', 'Не знаю'] }
];

let surveyContext = null;
let surveyAnswers = {};

function loadSurveyResponses() {
  try { const rows = JSON.parse(localStorage.getItem(SURVEY_KEY) || '[]'); return Array.isArray(rows) ? rows.filter(row => row && typeof row === 'object') : []; } catch (e) { return []; }
}

function saveSurveyResponse(resp) {
  try {
    const all = loadSurveyResponses();
    all.push(resp);
    localStorage.setItem(SURVEY_KEY, JSON.stringify(all));
    return true;
  } catch (e) { return false; }
}

// Called when the report screen opens (from requestAiFeedback)
function showSurvey(report) {
  const card = document.getElementById('surveyCard');
  if (!card) return;
  surveyContext = {
    module: report.module,
    score: report.score,
    time_sec: report.metrics && report.metrics.total_time_sec,
    errors: report.metrics ? (report.metrics.wrong_clicks ?? report.metrics.violations ?? 0) : 0
  };
  surveyAnswers = {};
  card.style.display = 'block';
  card.innerHTML = `
    <div class="survey-head">
      <span class="survey-title">Анкета · 1 минута</span>
      <span class="survey-note">${gameText('По желанию. Ответы отправляются команде проекта приватно. Не указывайте имя или контакты.', 'Optional. Your feedback is sent privately to the project team. Please leave out names and contact details.', 'Қатысу ерікті. Жауаптарыңыз жоба тобына жеке жіберіледі. Атыңыз бен байланыс деректерін жазбаңыз.')}</span>
    </div>
    <div class="survey-list">
      ${SURVEY_QUESTIONS.map(q => `
        <div class="survey-q" data-q="${q.id}">
          <div class="survey-q-text">${q.text}</div>
          <div class="survey-opts">
            ${(q.type === 'scale' ? ['1', '2', '3', '4', '5'] : q.options).map(o =>
              `<button type="button" class="survey-opt" data-q="${q.id}" data-v="${o}">${o}</button>`).join('')}
          </div>
        </div>`).join('')}
      <textarea id="surveyComment" class="survey-comment" rows="2" maxlength="300" aria-label="${gameText('Ваш отзыв', 'Your feedback', 'Пікіріңіз')}" placeholder="Что понравилось или мешало? (необязательно)"></textarea>
      <label class="survey-note"><input type="checkbox" id="surveyPublish"> ${gameText('Также разрешаю публично показать все мои ответы и комментарий анонимно на странице Testers opinion.', 'Also publish all my answers and comment anonymously on Testers opinion.', 'Барлық жауаптарым мен пікірімді Testers opinion бетінде анонимді жариялауға да келісемін.')}</label>
    </div>
    <button type="button" class="btn-action survey-submit" id="surveySubmit" disabled>Отправить ответы</button>
  `;
  card.querySelectorAll('.survey-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      surveyAnswers[q] = btn.dataset.v;
      card.querySelectorAll(`.survey-opt[data-q="${q}"]`).forEach(b => b.classList.toggle('selected', b === btn));
      document.getElementById('surveySubmit').disabled =
        SURVEY_QUESTIONS.some(x => surveyAnswers[x.id] === undefined);
    });
  });
  document.getElementById('surveySubmit').addEventListener('click', submitSurvey);
}

function surveyText(ru, en, kk) {
  const lang = typeof getLanguage === 'function' ? getLanguage() : document.documentElement.lang;
  return lang === 'en' ? en : lang === 'kk' ? kk : ru;
}

function opinionPageUrl() {
  const url = new URL('testers-opinion.html', location.href);
  url.search = location.search;
  url.searchParams.delete('module'); url.searchParams.delete('survey');
  if (typeof getLanguage === 'function') url.searchParams.set('lang', getLanguage());
  return url.href;
}

async function sendSurvey(resp) {
  const base = getApiBase();
  if (base === null) throw new Error('No backend');
  const res = await fetch(base + '/api/survey', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resp), signal: AbortSignal.timeout(8000)
  });
  if (!res.ok || (await res.json()).ok !== true) throw new Error('Survey upload failed');
}

function markSurveySynced(id) {
  try {
    const rows = loadSurveyResponses();
    rows.forEach(row => { if (row.id === id) row.synced = true; });
    localStorage.setItem(SURVEY_KEY, JSON.stringify(rows));
  } catch { /* The server deduplicates by ID if a device cannot save this status. */ }
  window.dispatchEvent(new Event('survey-synced'));
}

let surveySyncPromise;
function syncSurveyQueue() {
  if (surveySyncPromise) return surveySyncPromise;
  if (!navigator.onLine) return Promise.resolve();
  surveySyncPromise = (async () => {
    // Legacy private rows had no upload consent. Only newly consented private rows retry.
    for (const row of loadSurveyResponses().filter(row => row.id && (row.uploadConsent === true || row.publish === true) && !row.synced).slice(0, 10)) {
      try { await sendSurvey(row); markSurveySynced(row.id); }
      catch { break; }
    }
  })().finally(() => { surveySyncPromise = null; });
  return surveySyncPromise;
}

async function submitSurvey() {
  const card = document.getElementById('surveyCard');
  const button = document.getElementById('surveySubmit');
  if (!surveyContext || !button || button.disabled || SURVEY_QUESTIONS.some(q => surveyAnswers[q.id] === undefined)) return;
  button.disabled = true;
  const resp = {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    publish: document.getElementById('surveyPublish')?.checked === true,
    uploadConsent: true, synced: false, at: new Date().toISOString(), ...surveyContext,
    answers: { ...surveyAnswers },
    comment: (document.getElementById('surveyComment').value || '').trim().slice(0, 300)
  };
  const localSaved = saveSurveyResponse(resp);
  card.innerHTML = '<div class="survey-thanks" role="status"></div>';
  const status = card.querySelector('.survey-thanks');
  const upload = async () => {
    status.textContent = surveyText('Сохраняем отзыв…', 'Saving your review…', 'Пікір сақталуда…');
    try {
      await sendSurvey(resp);
      markSurveySynced(resp.id);
      status.textContent = resp.publish
        ? surveyText('Спасибо! Отзыв опубликован.', 'Thank you! Your review is published.', 'Рақмет! Пікіріңіз жарияланды.')
        : surveyText('Спасибо! Ответы сохранены приватно для команды проекта.', 'Thank you! Your feedback was saved privately for the project team.', 'Рақмет! Жауаптарыңыз жоба тобы үшін жеке сақталды.');
      if (resp.publish) {
        const link = document.createElement('a');
        link.href = opinionPageUrl(); link.textContent = 'Testers opinion →'; link.className = 'testers-link';
        status.append(document.createElement('br'), link);
      }
    } catch {
      status.textContent = localSaved
        ? surveyText('Сохранено на устройстве. Отправим при подключении или следующем посещении.', 'Saved on this device. We’ll retry when connected or on your next visit.', 'Құрылғыда сақталды. Байланыс орнағанда немесе келесі кіргенде қайта жіберіледі.')
        : surveyText('Не удалось сохранить отзыв. Проверьте подключение и повторите.', 'Your review could not be saved. Check your connection and retry.', 'Пікір сақталмады. Байланысты тексеріп, қайталаңыз.');
      const retry = document.createElement('button');
      retry.type = 'button'; retry.className = 'btn-secondary';
      retry.textContent = surveyText('Повторить', 'Retry', 'Қайталау'); retry.onclick = upload;
      status.append(document.createElement('br'), retry);
    }
  };
  await upload();
}

window.addEventListener('online', syncSurveyQueue);
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.testers-link').forEach(link => {
    link.href = opinionPageUrl();
    link.addEventListener('click', () => { link.href = opinionPageUrl(); });
  });
  syncSurveyQueue();
});

// ---------- Team view: index.html?survey=results ----------
function summarizeSurvey(list) {
  const n = list.length;
  const count = (id, pred) => list.filter(r => r.answers && pred(r.answers[id])).length;
  const avg = id => {
    const v = list.map(r => Number(r.answers && r.answers[id])).filter(x => x >= 1);
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '—';
  };
  const byModule = {};
  list.forEach(r => { byModule[r.module] = (byModule[r.module] || 0) + 1; });
  return {
    n,
    byModule,
    h1: count('before', v => Number(v) <= 3),
    h2: count('no_help', v => v === 'Да'),
    h3: count('learned', v => v === 'Да'),
    more: count('more', v => v === 'Да'),
    clarity: avg('clarity'),
    reportMatch: avg('report_match'),
    guideYes: count('guide', v => v === 'Да'),
    guidePartly: count('guide', v => v === 'Частично')
  };
}

function showSurveyResults() {
  const list = loadSurveyResponses();
  const s = summarizeSurvey(list);
  const pct = k => s.n ? Math.round(k / s.n * 100) + '%' : '—';
  const wrap = document.createElement('div');
  wrap.className = 'survey-results';
  wrap.innerHTML = `
    <div class="survey-results-card">
      <h2>Результаты анкеты на этом устройстве</h2>
      <p class="survey-note">Всего ответов: <b>${s.n}</b> · по модулям: ${Object.entries(s.byModule).map(([m, c]) => `${m} — ${c}`).join(', ') || '—'}</p>
      <table class="survey-table">
        <tr><th>Гипотеза</th><th>Результат</th><th>Порог</th></tr>
        <tr><td>H1 · представление о работе ≤ 3 из 5</td><td>${s.h1} из ${s.n} (${pct(s.h1)})</td><td>≥ 60%</td></tr>
        <tr><td>H2 · прошли без помощи</td><td>${s.h2} из ${s.n} (${pct(s.h2)})</td><td>≥ 80%</td></tr>
        <tr><td>H3 · узнали новое о профессии</td><td>${s.h3} из ${s.n} (${pct(s.h3)})</td><td>≥ 50%</td></tr>
        <tr><td>Хотят попробовать другие профессии</td><td>${s.more} из ${s.n} (${pct(s.more)})</td><td>—</td></tr>
        <tr><td>Понятность (среднее, 1–5)</td><td>${s.clarity}</td><td>—</td></tr>
        <tr><td>Совпадение отчёта с ощущением (1–5)</td><td>${s.reportMatch}</td><td>—</td></tr>
        <tr><td>Гид помог: да / частично</td><td>${s.guideYes} / ${s.guidePartly}</td><td>—</td></tr>
      </table>
      <div class="survey-results-actions">
        <button type="button" class="btn-action" id="surveyCopy">Скопировать все ответы (JSON)</button>
        <button type="button" class="btn-secondary" id="surveyClose">Закрыть</button>
      </div>
      <textarea class="survey-json" id="surveyJson" readonly rows="6">${escapeHtml(JSON.stringify(list, null, 1))}</textarea>
    </div>`;
  document.getElementById('appContainer').appendChild(wrap);
  document.getElementById('surveyClose').onclick = () => wrap.remove();
  document.getElementById('surveyCopy').onclick = async () => {
    const ta = document.getElementById('surveyJson');
    try { await navigator.clipboard.writeText(ta.value); document.getElementById('surveyCopy').innerText = 'Скопировано'; }
    catch (e) { ta.select(); }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('appContainer') && new URLSearchParams(location.search).get('survey') === 'results') showSurveyResults();
});
