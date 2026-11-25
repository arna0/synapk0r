// SynapKor — Career path in Kazakhstan + the player's profession profile across modules.
// Data is static and sourced (see README, раздел «Что говорят данные»); results live on this device.

const CAREER_KZ = {
  safety: {
    name: 'Инженер по технике безопасности',
    ent: 'Математика + Физика',
    programs: ['B062 Электротехника и энергетика', 'B064 Механика и металлообработка'],
    college: 'После 9 класса — колледж по техническим специальностям (электрооборудование, монтаж), затем вуз по сокращённой программе.',
    fact: 'За 9 месяцев 2025 года на производстве в Казахстане погибли 133 человека. Почти в трети случаев причина — плохая организация работ (Комитет госинспекции труда).'
  },
  barista: {
    name: 'Бариста и ресторанный бизнес',
    ent: 'География + Иностранный язык',
    programs: ['B093 Ресторанное дело и гостиничный бизнес', 'B091 Туризм'],
    college: 'После 9 класса — колледж по направлению «Организация питания», параллельно — курсы бариста.',
    fact: 'HoReCa — одна из самых быстрых точек входа в работу: первые смены возможны уже во время учёбы.'
  },
  it: {
    name: 'IT-инженер',
    ent: 'Математика + Информатика',
    programs: ['B057 Информационные технологии', 'B058 Информационная безопасность'],
    college: 'После 9 класса — колледж по программированию или сетевому администрированию.',
    fact: 'Программисты — в списке дефицитных профессий Минтруда РК: 509 вакансий (май 2026).'
  },
  doctor: {
    name: 'Врач',
    ent: 'Биология + Химия',
    programs: ['BM086 Медицина', 'BM088 Педиатрия'],
    college: 'После 9 класса — медицинский колледж (сестринское дело), затем медицинский вуз.',
    fact: 'Врачей не хватает: на 448 вакансий педиатров — 139 резюме, на 300 вакансий реаниматологов — 75 (Минтруда РК, май 2026).'
  }
};

const CAREER_ACTIONS = {
  it: 'Сравните три записи: 09:01 — выкладка, 09:02 — нет настройки региона, 09:03 — ошибка 503. Запишите причину и строку, которая её подтверждает. Спросите IT-специалиста в школе, какие сигналы он проверяет первыми.',
  barista: 'С разрешения проведите короткое наблюдение в кафе. Спросите бариста, как команда распределяет заказы в час пик.',
  doctor: 'Узнайте, есть ли день открытых дверей в ближайшем медицинском колледже. Спросите, как студенты практикуют общение с пациентами.',
  safety: 'Спросите преподавателя технологии, какие учебные проекты знакомят с работой инженера по безопасности.'
};
const CAREER_ACTIVITIES = {
  it: ['Поиск причины сбоя', 'Работа с инструментами', 'Объяснение проблемы'],
  barista: ['Приготовление напитка', 'Распределение заказов', 'Общение с гостем'],
  doctor: ['Изучение карты', 'Измерения', 'Разговор с пациентом'],
  safety: ['Следование этапам', 'Работа с приборами', 'Поиск возможных нарушений']
};
const CAREER_INTEREST = ['Хочу попробовать ещё', 'Пока не уверен(а)', 'Хочу попробовать другое'];

function showCareerReflection(module) {
  const card = document.getElementById('careerReflection');
  if (!Object.hasOwn(CAREER_ACTIVITIES, module)) {
    card.hidden = true;
    return;
  }
  const activities = CAREER_ACTIVITIES[module];
  const previous = loadCareerProfile()[module]?.reflection || {};
  const options = items => '<option value="">Выберите вариант</option>' +
    items.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
  card.hidden = false;
  card.innerHTML = `
    <h3>Подходит ли вам такой рабочий день?</h3>
    <p>Ваши ответы сохраняются на этом устройстве и не меняют балл.</p>
    <form>
      <label>Что понравилось больше всего?<select name="enjoyed" required>${options(activities)}</select></label>
      <label>Что забрало больше всего сил?<select name="drained" required>${options([...activities, 'Ничего из списка'])}</select></label>
      <label>Попробовали бы вы это снова?<select name="again" required>${options(CAREER_INTEREST)}</select></label>
      <button type="submit" class="btn-action">Сохранить размышление</button>
      <p role="status"></p>
    </form>`;
  const form = card.querySelector('form');
  for (const key of ['enjoyed', 'drained', 'again']) form.elements.namedItem(key).value = previous[key] || '';
  form.addEventListener('submit', event => {
    event.preventDefault();
    const profile = loadCareerProfile();
    const choices = Object.fromEntries(new FormData(form));
    profile[module] = { ...profile[module], reflection: choices };
    const status = form.querySelector('[role="status"]');
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      status.textContent = 'Размышление сохранено на этом устройстве.';
    } catch {
      status.textContent = 'Не удалось сохранить ответы на этом устройстве.';
    }
  });
}

const CAREER_LABELS = { safety: 'Инженер ТБ', barista: 'Бариста', it: 'IT-инженер', doctor: 'Врач' };
const CAREER_START = { safety: "startSafetyVR()", barista: "startBaristaVR()", it: "startScenario('it')", doctor: "startScenario('doctor')" };
const PROFILE_KEY = 'synapkor_profile_v1';

function loadCareerProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    return profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
  } catch { return {}; }
}

function saveCareerResult(module) {
  try {
    const p = loadCareerProfile();
    const prev = p[module];
    p[module] = { ...prev, runs: (Number(prev?.runs) || 0) + 1 };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch (e) { /* storage unavailable */ }
}

// Report screen: "where to study in Kazakhstan" for this profession
function showCareerBlock(report) {
  const card = document.getElementById('careerCard');
  const c = CAREER_KZ[report.module];
  if (!card || !c) return;
  saveCareerResult(report.module);
  showCareerReflection(report.module);
  const tried = Object.keys(loadCareerProfile());
  const next = Object.keys(CAREER_KZ).filter(m => !tried.includes(m));
  card.style.display = 'block';
  card.innerHTML = `
    <div class="career-head">
      <span class="career-title">Путь в профессию в Казахстане</span>
      <span class="career-sub">${escapeHtml(c.name)}</span>
    </div>
    <div class="career-grid">
      <div class="career-item"><div class="career-label">Профильные предметы ЕНТ</div><div class="career-value">${escapeHtml(c.ent)}</div></div>
      <div class="career-item"><div class="career-label">Группы программ в вузах</div><div class="career-value">${c.programs.map(escapeHtml).join('<br>')}</div></div>
    </div>
    <p class="career-text">${escapeHtml(c.college)}</p>
    <p class="career-fact">${escapeHtml(c.fact)}</p>
    <div class="career-action"><strong>Что можно сделать на этой неделе</strong><p>${escapeHtml(CAREER_ACTIONS[report.module])}</p></div>
    ${next.length ? `<div class="career-next">Попробуйте другую профессию:
      ${next.map(m => `<button type="button" class="career-chip" onclick="${CAREER_START[m]}">${CAREER_LABELS[m]}</button>`).join('')}</div>` : ''}
  `;
}

// Home screen: completed scenarios in catalogue order.
function renderCareerProfile() {
  const box = document.getElementById('careerProfile');
  if (!box) return;
  const p = loadCareerProfile();
  const done = Object.keys(CAREER_LABELS).filter(m => p[m]);
  if (!done.length) { box.style.display = 'none'; return; }
  const missing = Object.keys(CAREER_LABELS).filter(m => !p[m]);
  box.style.display = 'flex';
  box.innerHTML = `
    <div class="section-head">
      <h2>Пройденные сценарии</h2>
      <span class="section-note">Пройдено ${done.length} из ${Object.keys(CAREER_LABELS).length}</span>
    </div>
    <div class="profile-rows">
      ${done.map(m => `
        <div class="profile-row">
          <span class="profile-name">${CAREER_LABELS[m]}</span>
          <span class="profile-best">${escapeHtml(CAREER_INTEREST.includes(p[m]?.reflection?.again) ? p[m].reflection.again : 'Завершено')}</span>
        </div>`).join('')}
    </div>
    <p class="profile-note">${missing.length
      ? 'Попробуйте ещё: ' + missing.map(m => `<button type="button" class="career-chip" onclick="${CAREER_START[m]}">${CAREER_LABELS[m]}</button>`).join(' ')
      : 'Вы попробовали все профессии. Обсудите с учителем, какие задания вам захотелось продолжить.'}</p>
  `;
}

window.addEventListener('DOMContentLoaded', renderCareerProfile);
