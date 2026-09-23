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

const CAREER_LABELS = { safety: 'Инженер ТБ', barista: 'Бариста', it: 'IT-инженер', doctor: 'Врач' };
const CAREER_START = { safety: "startSafetyVR()", barista: "startBaristaVR()", it: "startScenario('it')", doctor: "startScenario('doctor')" };
const PROFILE_KEY = 'synapkor_profile_v1';

function loadCareerProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch (e) { return {}; }
}

function saveCareerResult(module, score) {
  try {
    const p = loadCareerProfile();
    const prev = p[module];
    p[module] = { best: Math.max(score, prev ? prev.best : 0), last: score, runs: (prev ? prev.runs : 0) + 1, at: new Date().toISOString() };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch (e) { /* storage unavailable */ }
}

// Report screen: "where to study in Kazakhstan" for this profession
function showCareerBlock(report) {
  const card = document.getElementById('careerCard');
  const c = CAREER_KZ[report.module];
  if (!card || !c) return;
  saveCareerResult(report.module, report.score);
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
    ${next.length ? `<div class="career-next">Сравните себя в другой профессии:
      ${next.map(m => `<button type="button" class="career-chip" onclick="${CAREER_START[m]}">${CAREER_LABELS[m]}</button>`).join('')}</div>` : ''}
  `;
}

// Home screen: the player's results across professions, best fit first
function renderCareerProfile() {
  const box = document.getElementById('careerProfile');
  if (!box) return;
  const p = loadCareerProfile();
  const done = Object.entries(p).filter(([m]) => CAREER_LABELS[m]).sort((a, b) => b[1].best - a[1].best);
  if (!done.length) { box.style.display = 'none'; return; }
  const missing = Object.keys(CAREER_LABELS).filter(m => !p[m]);
  box.style.display = 'flex';
  box.innerHTML = `
    <div class="section-head">
      <h2>Ваш профиль профессий</h2>
      <span class="section-note">Пройдено ${done.length} из ${Object.keys(CAREER_LABELS).length}</span>
    </div>
    <div class="profile-rows">
      ${done.map(([m, r], i) => `
        <div class="profile-row">
          <span class="profile-name">${CAREER_LABELS[m]}${i === 0 && done.length > 1 ? ' <span class="profile-best">лучший результат</span>' : ''}</span>
          <span class="profile-bar"><span class="profile-fill" style="width:${r.best}%"></span></span>
          <span class="profile-score">${r.best}%</span>
        </div>`).join('')}
    </div>
    <p class="profile-note">${missing.length
      ? 'Попробуйте ещё: ' + missing.map(m => `<button type="button" class="career-chip" onclick="${CAREER_START[m]}">${CAREER_LABELS[m]}</button>`).join(' ')
      : 'Вы попробовали все профессии. Сравните результаты и обсудите их с учителем или школьным психологом.'}</p>
  `;
}

window.addEventListener('DOMContentLoaded', renderCareerProfile);
