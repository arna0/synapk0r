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
const PROFILE_KEY = 'synapkor_profile_v2';
const LEGACY_PROFILE_KEY = 'synapkor_profile_v1';

function careerScore(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function careerRecord(value, legacy = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !careerScore(value.last) || !Number.isInteger(value.runs) || value.runs < 1 || value.runs > 1000000) return null;
  if (!legacy && !careerScore(value.first)) return null;
  const record = { last: Math.round(value.last), runs: value.runs };
  if (legacy) {
    if (careerScore(value.best)) record.best = Math.round(value.best);
  } else record.first = Math.round(value.first);
  for (const key of ['firstAt', 'lastAt', 'lastSession']) {
    if (typeof value[key] === 'string' && value[key].length <= 120) record[key] = value[key];
  }
  if (legacy && typeof value.at === 'string' && value.at.length <= 120) record.lastAt = value.at;
  return record;
}

function normalizeCareerProfile(value, legacy = false) {
  const profile = { version: 2, professions: {} };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return profile;
  const source = legacy ? value : value.version === 2 && value.professions;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return profile;
  for (const module of Object.keys(CAREER_LABELS)) {
    const entry = source[module];
    if (!entry || typeof entry !== 'object') continue;
    const result = {};
    if (legacy) {
      const previous = careerRecord(entry, true);
      if (previous) result.legacy = previous;
    } else {
      for (const mode of ['guided', 'independent', 'legacy']) {
        const record = careerRecord(entry[mode], mode === 'legacy');
        if (record) result[mode] = record;
      }
    }
    if (Object.keys(result).length) profile.professions[module] = result;
  }
  return profile;
}

function loadCareerProfile() {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored !== null) return normalizeCareerProfile(JSON.parse(stored));
    const migrated = normalizeCareerProfile(JSON.parse(localStorage.getItem(LEGACY_PROFILE_KEY) || '{}'), true);
    // Keep v1 intact so old, unlabelled results never become independent attempts.
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(migrated)); } catch { /* read-only storage */ }
    return migrated;
  } catch { return { version: 2, professions: {} }; }
}

function saveCareerResult(module, score, mode = 'guided', sessionId) {
  if (!Object.hasOwn(CAREER_LABELS, module) || !careerScore(score) || !['guided', 'independent'].includes(mode)) return false;
  try {
    const p = loadCareerProfile();
    const entry = p.professions[module] || {};
    const prev = entry[mode];
    if (sessionId && prev?.lastSession === sessionId) return false;
    const at = new Date().toISOString();
    entry[mode] = { first: prev ? prev.first : Math.round(score), last: Math.round(score), runs: Math.min(1000000, (prev?.runs || 0) + 1), firstAt: prev?.firstAt || at, lastAt: at };
    if (typeof sessionId === 'string' && sessionId.length <= 120) entry[mode].lastSession = sessionId;
    p.professions[module] = entry;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    return true;
  } catch { return false; }
}

function careerLabel(module) {
  const labels = {
    safety: ['Инженер ТБ', 'Safety engineer', 'Қауіпсіздік инженері'],
    barista: ['Бариста', 'Barista', 'Бариста'],
    it: ['IT-инженер', 'IT engineer', 'IT инженері'],
    doctor: ['Врач', 'Doctor', 'Дәрігер']
  };
  return gameText(...labels[module]);
}

function careerModeLabel(mode) {
  return mode === 'independent'
    ? gameText('Самостоятельно', 'Independent', 'Өз бетінше')
    : gameText('С подсказками', 'Guided', 'Көмекпен');
}

function careerStudyContent(module) {
  const original = CAREER_KZ[module];
  const translations = {
    safety: {
      ent: ['Mathematics + Physics', 'Математика + Физика'],
      programs: [['B062 Electrical engineering and energy', 'B062 Электротехника және энергетика'], ['B064 Mechanics and metalworking', 'B064 Механика және металл өңдеу']],
      college: ['After grade 9: a technical college programme such as electrical equipment or installation; then explore university entry routes.', '9-сыныптан кейін: электр жабдықтары немесе монтаж сияқты техникалық колледж бағдарламасы; кейін ЖОО-ға түсу жолдарын зерттеңіз.']
    },
    barista: {
      ent: ['Geography + Foreign language', 'География + Шет тілі'],
      programs: [['B093 Restaurant and hotel business', 'B093 Мейрамхана ісі және қонақ үй бизнесі'], ['B091 Tourism', 'B091 Туризм']],
      college: ['After grade 9: explore catering college programmes and barista courses.', '9-сыныптан кейін: тамақтандыруды ұйымдастыру колледж бағдарламалары мен бариста курстарын зерттеңіз.']
    },
    it: {
      ent: ['Mathematics + Computer science', 'Математика + Информатика'],
      programs: [['B057 Information technology', 'B057 Ақпараттық технологиялар'], ['B058 Information security', 'B058 Ақпараттық қауіпсіздік']],
      college: ['After grade 9: explore college programmes in programming or network administration.', '9-сыныптан кейін: бағдарламалау немесе желіні әкімшілендіру колледж бағдарламаларын зерттеңіз.']
    },
    doctor: {
      ent: ['Biology + Chemistry', 'Биология + Химия'],
      programs: [['BM086 Medicine', 'BM086 Медицина'], ['BM088 Paediatrics', 'BM088 Педиатрия']],
      college: ['After grade 9: explore medical college routes such as nursing and the separate admission requirements for medical university.', '9-сыныптан кейін: мейіргер ісі сияқты медициналық колледж жолдарын және медициналық ЖОО-ның бөлек қабылдау талаптарын зерттеңіз.']
    }
  };
  const translated = translations[module];
  return {
    ent: gameText(original.ent, ...translated.ent),
    programs: original.programs.map((program, index) => gameText(program, ...translated.programs[index])),
    college: gameText(original.college, ...translated.college)
  };
}

function careerProgressMarkup(entry) {
  return ['guided', 'independent'].map(mode => {
    const r = entry?.[mode];
    return `<div class="profile-mode"><strong>${careerModeLabel(mode)}</strong><span>${r
      ? gameText(`Первая: ${r.first}% · последняя: ${r.last}% · попыток: ${r.runs}`, `First: ${r.first}% · latest: ${r.last}% · attempts: ${r.runs}`, `Алғашқы: ${r.first}% · соңғы: ${r.last}% · әрекет саны: ${r.runs}`)
      : gameText('Пока нет попыток', 'No attempts yet', 'Әзірге әрекет жоқ')}</span></div>`;
  }).join('') + (entry?.legacy ? `<p class="profile-note">${gameText(
    `Архив прежней версии: ${entry.legacy.runs} попыток, последняя ${entry.legacy.last}%. Режим и первый результат неизвестны; баллы прежней версии не сравниваются с новыми.`,
    `Previous version archive: ${entry.legacy.runs} attempts, latest ${entry.legacy.last}%. Mode and first result are unknown; old scores are not compared with new scores.`,
    `Алдыңғы нұсқа мұрағаты: ${entry.legacy.runs} әрекет, соңғысы ${entry.legacy.last}%. Режим мен алғашқы нәтиже белгісіз; ескі балдар жаңаларымен салыстырылмайды.`
  )}</p>` : '');
}

// Report screen: "where to study in Kazakhstan" for this profession
function showCareerBlock(report) {
  const card = document.getElementById('careerCard');
  if (!card || !Object.hasOwn(CAREER_KZ, report.module)) return;
  const c = careerStudyContent(report.module);
  const mode = report.assessment?.mode || 'guided';
  const sessionId = typeof sessionStartedAt !== 'undefined' ? `${report.module}:${sessionStartedAt}` : undefined;
  saveCareerResult(report.module, report.score, mode, sessionId);
  const profile = loadCareerProfile();
  const tried = Object.keys(profile.professions);
  const next = Object.keys(CAREER_KZ).filter(m => !tried.includes(m));
  card.style.display = 'block';
  card.innerHTML = `
    <div class="career-head">
      <span class="career-title">${gameText('Ваш прогресс в этой профессии', 'Your progress in this profession', 'Осы кәсіптегі ілгерілеуіңіз')}</span>
      <span class="career-sub">${careerLabel(report.module)}</span>
    </div>
    ${careerProgressMarkup(profile.professions[report.module])}
    <p class="profile-note">${gameText('Баллы описывают учебные упражнения. Они не определяют профессиональную пригодность и не сравнивают разные профессии.', 'Scores describe practice exercises. They do not measure career aptitude or compare different professions.', 'Балдар оқу жаттығуларын сипаттайды. Олар кәсіби жарамдылықты анықтамайды және әртүрлі кәсіптерді салыстырмайды.')}</p>
    <details><summary>${gameText('Варианты обучения в Казахстане', 'Study options in Kazakhstan', 'Қазақстандағы оқу мүмкіндіктері')}</summary>
    <div class="career-grid">
      <div class="career-item"><div class="career-label">${gameText('Профильные предметы ЕНТ', 'UNT subject areas', 'ҰБТ бейіндік пәндері')}</div><div class="career-value">${escapeHtml(c.ent)}</div></div>
      <div class="career-item"><div class="career-label">${gameText('Группы программ в вузах', 'University programme groups', 'ЖОО бағдарламаларының топтары')}</div><div class="career-value">${c.programs.map(escapeHtml).join('<br>')}</div></div>
    </div>
    <p class="career-text">${escapeHtml(c.college)}</p>
    <p class="career-text">${gameText('Уточняйте актуальные требования на сайте выбранного учебного заведения.', 'Check current entry requirements with the institution you choose.', 'Өзекті қабылдау талаптарын таңдаған оқу орнынан нақтылаңыз.')}</p></details>
    ${next.length ? `<div class="career-next">${gameText('Исследуйте другие рабочие задачи:', 'Explore other work tasks:', 'Басқа жұмыс тапсырмаларын зерттеңіз:')}
      ${next.map(m => `<button type="button" class="career-chip" onclick="${CAREER_START[m]}">${careerLabel(m)}</button>`).join('')}</div>` : ''}
  `;
}

// Stable profession order; progress is compared only within the same mode.
function renderCareerProfile() {
  const box = document.getElementById('careerProfile');
  if (!box) return;
  const p = loadCareerProfile().professions;
  const done = Object.keys(CAREER_LABELS).filter(m => p[m]).map(m => [m, p[m]]);
  if (!done.length) { box.style.display = 'none'; return; }
  const missing = Object.keys(CAREER_LABELS).filter(m => !p[m]);
  box.style.display = 'flex';
  box.innerHTML = `
    <div class="section-head">
      <h2>${gameText('Ваши учебные попытки', 'Your practice attempts', 'Оқу әрекеттеріңіз')}</h2>
      <span class="section-note">${gameText(`Исследовано профессий: ${done.length} из 4`, `Professions explored: ${done.length} of 4`, `Зерттелген кәсіптер: 4 ішінен ${done.length}`)}</span>
    </div>
    <div class="profile-rows">
      ${done.map(([m, r]) => `<section class="profile-profession"><h3 class="profile-name">${careerLabel(m)}</h3>${careerProgressMarkup(r)}</section>`).join('')}
    </div>
    <p class="profile-note">${gameText('Сравнивайте свои попытки в одной профессии и одном режиме. Это результаты упражнений, а не рейтинг способностей.', 'Compare your attempts within one profession and one mode. These are exercise results, not an aptitude ranking.', 'Бір кәсіп пен бір режимдегі әрекеттеріңізді салыстырыңыз. Бұл қабілет рейтингі емес, жаттығу нәтижелері.')}</p>
    ${missing.length ? `<div class="career-next">${gameText('Попробуйте ещё:', 'Explore next:', 'Тағы байқап көріңіз:')} ${missing.map(m => `<button type="button" class="career-chip" onclick="${CAREER_START[m]}">${careerLabel(m)}</button>`).join(' ')}</div>` : ''}
  `;
}

window.addEventListener('DOMContentLoaded', renderCareerProfile);
