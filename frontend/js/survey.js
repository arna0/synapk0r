// SynapKor — Post-session survey for validation (docs/VALIDATION.md).
// Answers are kept on this device (localStorage) and, when the backend is reachable,
// also sent to POST /api/survey. Summary for the team: open index.html?survey=results

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
  try { return JSON.parse(localStorage.getItem(SURVEY_KEY) || '[]'); } catch (e) { return []; }
}

function saveSurveyResponse(resp) {
  try {
    const all = loadSurveyResponses();
    all.push(resp);
    localStorage.setItem(SURVEY_KEY, JSON.stringify(all));
  } catch (e) { /* storage unavailable: backend copy only */ }
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
      <span class="survey-note">Помогает нам улучшить симулятор</span>
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
      <textarea id="surveyComment" class="survey-comment" rows="2" maxlength="300" placeholder="Что понравилось или мешало? (необязательно)"></textarea>
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

async function submitSurvey() {
  const card = document.getElementById('surveyCard');
  const resp = {
    at: new Date().toISOString(),
    ...surveyContext,
    answers: { ...surveyAnswers },
    comment: (document.getElementById('surveyComment').value || '').trim().slice(0, 300)
  };
  saveSurveyResponse(resp);
  card.innerHTML = '<div class="survey-thanks">Спасибо! Ответы сохранены.</div>';

  const apiBase = getApiBase();
  if (apiBase === null) return;
  try {
    await fetch(`${apiBase}/api/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resp)
    });
  } catch (e) {
    console.info('[SynapKor] survey kept locally only:', e.message);
  }
}

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
  if (new URLSearchParams(location.search).get('survey') === 'results') showSurveyResults();
});
