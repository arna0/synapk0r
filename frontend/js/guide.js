// SynapKor — In-game guide: step panel, object labels, off-screen pointer, 3D arrow, intro.

// ================= IN-GAME GUIDE, OBJECT LABELS & INTRO =================
const OBJECT_LABELS = {
  portafilter: 'Холдер',
  grinder: 'Кофемолка',
  tamper: 'Темпер',
  espressoMachine: 'Кофемашина',
  milkPitcher: 'Питчер с молоком',
  glassCup: 'Стакан',
  mainBreaker: 'Рубильник',
  meter1: 'Вольтметр',
  meter2: 'Манометр пара',
  meter3: 'Манометр воздуха',
  valve1: 'Клапан 1',
  valve2: 'Клапан 2',
  testTerminals: 'Клеммы для замера',
  ppeStand: 'Шкаф СИЗ'
};
// Height of the label / guide arrow above each object's origin (metres)
const LABEL_OFFSETS = {
  espressoMachine: 0.78, grinder: 0.9, ppeStand: 0.72, mainBreaker: 0.45,
  meter1: 0.26, meter2: 0.26, meter3: 0.26, valve1: 0.26, valve2: 0.26,
  testTerminals: 0.18, glassCup: 0.3, milkPitcher: 0.26, tamper: 0.2, portafilter: 0.16
};

const SAFETY_GUIDE = [
  {
    done: () => safetyState.ppeEquipped, target: 'ppeStand', task: 'Наденьте СИЗ',
    how: 'Нажмите <b>1</b> — или подойдите к синему шкафу СИЗ слева, наведите прицел и нажмите <b>E</b>.',
    why: 'Касаться щита 380 В без диэлектрических перчаток запрещено. Это всегда первый шаг.'
  },
  {
    done: () => safetyState.powerState === 'OFF', target: 'mainBreaker', task: 'Отключите рубильник',
    how: 'Наведите прицел на жёлтую рукоятку в центре щита и нажмите <b>E</b>.',
    why: 'Сначала снимаем напряжение с оборудования и только потом работаем с ним.'
  },
  {
    done: () => safetyState.lockoutApplied, target: 'mainBreaker', task: 'Повесьте замок LOTO',
    how: 'Нажмите <b>3</b>, чтобы взять замок, затем наведите прицел на рубильник и нажмите <b>E</b>.',
    why: 'Замок не даст никому случайно включить питание, пока вы работаете.'
  },
  {
    done: () => safetyState.voltageTested, target: 'testTerminals', task: 'Проверьте отсутствие напряжения',
    how: 'Нажмите <b>2</b>, чтобы взять мультиметр, наведите прицел на три латунные клеммы внизу щита и нажмите <b>E</b>.',
    why: 'Рубильник может быть неисправен. Прибор должен показать 0 В.'
  },
  {
    done: () => safetyState.valvesOpened[0], target: 'valve1', task: 'Сбросьте давление: клапан 1',
    how: 'Красный маховик слева от щита. Наведите прицел и нажмите <b>E</b>.',
    why: 'В паровой линии 8.5 бар. Ремонт под давлением опасен.'
  },
  {
    done: () => safetyState.valvesOpened[1], target: 'valve2', task: 'Сбросьте давление: клапан 2',
    how: 'Красный маховик справа от щита. Наведите прицел и нажмите <b>E</b>.',
    why: 'Пневмолиния тоже должна быть на 0 бар. Следите за стрелками манометров.'
  }
];

const BARISTA_STEP_GUIDE = {
  portafilter: { how: 'Холдер лежит на стойке перед кофемашиной. Наведите прицел и нажмите <b>E</b>.', why: 'Холдер — ручка с корзинкой, в которую засыпают молотый кофе.' },
  grinder: { how: 'Чёрная кофемолка с бункером зерна слева. Наведите прицел и нажмите <b>E</b>.', why: 'Для одной порции эспрессо нужно 18 г свежесмолотого кофе.' },
  tamper: { how: 'Темпер стоит на чёрном коврике рядом с холдером. Наведите прицел и нажмите <b>E</b>.', why: 'Кофе нужно плотно и ровно спрессовать, иначе вода пройдёт неравномерно.' },
  espressoMachine: { how: 'Наведите прицел на кофемашину и нажмите <b>E</b>, чтобы запустить пролив.', why: 'Эспрессо готовится под давлением 9 бар около 25–30 секунд.' },
  milkPitcher: { how: 'Металлический питчер стоит справа от темпера. Наведите прицел и нажмите <b>E</b>.', why: 'Овсяное молоко взбивают паром до гладкой микропены.' },
  glassCup: { how: 'Стакан стоит под группой кофемашины. Наведите прицел и нажмите <b>E</b>.', why: 'Добавьте лёд и отдайте гостю готовый Iced Oat Latte.' }
};

function getGuideState() {
  const scn = getActiveScenario();
  if (scn) return getScenarioGuideState(scn);
  if (currentProfession === 'safety') {
    const steps = SAFETY_GUIDE.map(g => ({ task: g.task, done: g.done() }));
    const idx = steps.findIndex(st => !st.done);
    if (idx === -1) {
      return { steps, idx: steps.length, current: { task: 'Регламент выполнен', how: 'Оборудование безопасно для ремонта. Откройте отчёт по навыкам.', why: '', target: null } };
    }
    return { steps, idx, current: SAFETY_GUIDE[idx] };
  }

  const cookSteps = state.stepsConfig.map((st, i) => ({ task: st.name, done: state.quest > 1 || i < state.step }));
  const steps = [
    ...cookSteps,
    { task: 'Ответить гостю', done: state.quest > 2 },
    { task: 'Рассчитать закупку', done: !!state.budgetChoice }
  ];
  if (state.quest === 1) {
    const cfg = state.stepsConfig[state.step];
    if (cfg) {
      const g = BARISTA_STEP_GUIDE[cfg.id] || {};
      return { steps, idx: state.step, current: { task: cfg.name, how: g.how || cfg.hint, why: g.why || '', target: cfg.id } };
    }
    return { steps, idx: state.stepsConfig.length, current: { task: 'Напиток готов', how: 'Сейчас подойдёт гость…', why: '', target: null } };
  }
  if (state.quest === 2) {
    return { steps, idx: cookSteps.length, current: {
      task: 'Успокойте недовольного гостя',
      how: 'Прочитайте жалобу и выберите ответ <b>внизу экрана</b>.',
      why: 'Оценивается умение признать ошибку и предложить решение, а не спорить.',
      target: null } };
  }
  if (state.budgetChoice) {
    return { steps, idx: steps.length, current: { task: 'Симуляция завершена', how: 'Откройте отчёт по навыкам.', why: '', target: null } };
  }
  return { steps, idx: cookSteps.length + 1, current: {
    task: 'Рассчитайте закупку зерна',
    how: 'Расход — 35 кг в неделю, бюджет — 120 000 ₸. Выберите вариант <b>внизу экрана</b>.',
    why: 'Нужно покрыть весь расход и не выйти за бюджет.',
    target: null } };
}

let guideVisible = true;
let lastGuideSignature = '';

function renderGuide(force) {
  const panel = document.getElementById('guidePanel');
  if (!panel) return;
  const g = getGuideState();
  const signature = currentProfession + '|' + g.idx + '|' + g.current.task + '|' + g.steps.map(s => s.done ? 1 : 0).join('');
  if (!force && signature === lastGuideSignature) return;
  lastGuideSignature = signature;

  document.getElementById('guideStepCount').innerText =
    g.idx < g.steps.length ? `Гид · шаг ${g.idx + 1} из ${g.steps.length}` : 'Гид · всё готово';
  document.getElementById('guideTask').innerText = g.current.task;
  document.getElementById('guideHow').innerHTML = g.current.how;
  const why = document.getElementById('guideWhy');
  why.innerText = g.current.why;
  why.style.display = g.current.why ? 'block' : 'none';
  const doneCount = g.steps.filter(s => s.done).length;
  document.getElementById('guideProgressFill').style.width = (doneCount / g.steps.length * 100) + '%';
  document.getElementById('guideSteps').innerHTML = g.steps.map((s, i) => `
    <li class="${s.done ? 'done' : (i === g.idx ? 'current' : '')}">
      <span class="gs-dot">${s.done ? '✓' : ''}</span>${s.task}
    </li>`).join('');
}

function setGuideVisible(show) {
  guideVisible = show;
  document.getElementById('guidePanel')?.classList.toggle('visible', show);
  document.getElementById('guideToggleBtn')?.classList.toggle('visible', !show);
  if (show) renderGuide(true);
}

function toggleGuide() {
  setGuideVisible(!guideVisible);
}

function showGuideToast(text) {
  const el = document.getElementById('guideToast');
  if (!el) return;
  el.innerText = text;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

function getGuideTargetName() {
  if (!document.getElementById('gameScreen').classList.contains('active')) return null;
  return getGuideState().current.target || null;
}

// ---- Screen-space labels above interactive objects ----
let objectLabels = [];
const _labelVec = new THREE.Vector3();

function rebuildObjectLabels() {
  const layer = document.getElementById('labelLayer');
  if (!layer) return;
  layer.querySelectorAll('.obj-label').forEach(el => el.remove());
  objectLabels = interactiveObjects
    .filter(obj => OBJECT_LABELS[obj.name])
    .map(obj => {
      const el = document.createElement('div');
      el.className = 'obj-label';
      el.innerText = OBJECT_LABELS[obj.name];
      layer.appendChild(el);
      return { obj, el, offset: LABEL_OFFSETS[obj.name] || 0.22 };
    });
}

function updateObjectLabels() {
  const wrap = document.getElementById('viewportWrap');
  const pointer = document.getElementById('offscreenPointer');
  if (!wrap || !camera) return;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  const targetName = getGuideTargetName();
  let targetEntry = null;

  for (const entry of objectLabels) {
    const isTarget = entry.obj.name === targetName;
    if (isTarget) targetEntry = entry;
    entry.obj.getWorldPosition(_labelVec);
    _labelVec.y += entry.offset;
    const dist = _labelVec.distanceTo(camera.position);
    const p = _labelVec.clone().project(camera);
    const onScreen = p.z < 1 && p.x > -1 && p.x < 1 && p.y > -1 && p.y < 1;
    // Non-target labels only nearby to keep the view clean
    if (!onScreen || (!isTarget && dist > 3.2)) {
      entry.el.style.display = 'none';
      continue;
    }
    entry.el.style.display = 'block';
    entry.el.classList.toggle('target', isTarget);
    entry.el.style.opacity = isTarget ? '1' : String(Math.max(0.35, 1 - dist / 4));
    entry.el.style.transform = `translate(${(p.x + 1) / 2 * w}px, ${(1 - p.y) / 2 * h}px) translate(-50%, -100%)`;
  }

  // Edge pointer when the current target is out of view
  if (!pointer) return;
  if (!targetEntry || targetEntry.el.style.display === 'block') {
    pointer.style.display = 'none';
    return;
  }
  targetEntry.obj.getWorldPosition(_labelVec);
  const local = _labelVec.applyMatrix4(camera.matrixWorldInverse);
  let dx = local.x;
  let dy = local.y;
  if (local.z > 0) dy = 0; // behind the camera: point sideways
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) dx = 1;
  const angle = Math.atan2(-dy, dx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rx = w / 2 - 90;
  const ry = h / 2 - 40;
  const scale = Math.min(rx / Math.max(Math.abs(cos), 0.001), ry / Math.max(Math.abs(sin), 0.001));
  const px = w / 2 + cos * scale;
  const py = h / 2 + sin * scale;
  pointer.style.display = 'flex';
  pointer.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
  document.getElementById('offscreenPointerText').innerText = OBJECT_LABELS[targetEntry.obj.name];
  document.getElementById('offscreenPointerArrow').style.transform = `rotate(${angle}rad)`;
}

// ---- 3D guide arrow floating above the current target ----
let guideArrow = null;

function createGuideArrow() {
  guideArrow = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.1, 20),
    new THREE.MeshBasicMaterial({ color: 0x0052FF })
  );
  cone.rotation.x = Math.PI; // point down
  guideArrow.add(cone);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.008, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  guideArrow.add(ring);
  guideArrow.visible = false;
  scene.add(guideArrow);
}

function updateGuideArrow(time) {
  if (!guideArrow) return;
  const targetName = getGuideTargetName();
  const entry = targetName ? objectLabels.find(e => e.obj.name === targetName) : null;
  if (!entry) {
    guideArrow.visible = false;
    return;
  }
  entry.obj.getWorldPosition(guideArrow.position);
  guideArrow.position.y += entry.offset - 0.08 + Math.sin(time * 4) * 0.025;
  guideArrow.rotation.y = time * 1.5;
  guideArrow.visible = true;
}

// ---- Intro briefing shown at the start of each simulation ----
const INTRO_CONTENT = {
  safety: {
    title: 'Подготовка щита 380 В к ремонту',
    goal: 'Вы — инженер по технике безопасности. Нужно безопасно вывести оборудование в ремонт по процедуре LOTO. Ошибки в порядке действий считаются нарушениями ТБ.',
    plan: ['Наденьте СИЗ (диэлектрические перчатки)', 'Отключите рубильник', 'Повесьте замок LOTO', 'Проверьте мультиметром, что напряжения нет', 'Откройте оба клапана, чтобы сбросить давление'],
    extra: [['1', 'СИЗ'], ['2', 'Мультиметр'], ['3', 'Замок LOTO']]
  },
  barista: {
    title: 'Смена бариста',
    goal: 'Приготовьте Iced Oat Latte по техкарте, затем разберитесь с недовольным гостем и рассчитайте закупку зерна на неделю.',
    plan: ['Приготовьте напиток: 6 шагов по порядку', 'Ответьте гостю, который недоволен заказом', 'Выберите оптимальную закупку зерна'],
    extra: []
  }
};

function isIntroVisible() {
  const el = document.getElementById('introOverlay');
  return !!el && el.classList.contains('visible');
}

function showIntro(profession) {
  const overlay = document.getElementById('introOverlay');
  if (!overlay) return;
  let skip = false;
  try { skip = localStorage.getItem('synapkor_skip_intro_' + profession) === '1'; } catch (e) {}
  if (skip) return;
  const c = INTRO_CONTENT[profession];
  document.getElementById('introTitle').innerText = c.title;
  document.getElementById('introGoal').innerText = c.goal;
  document.getElementById('introPlan').innerHTML = c.plan.map(p => `<li>${p}</li>`).join('');
  document.getElementById('introExtraKeys').innerHTML = c.extra.map(([k, t]) =>
    `<div class="control-item"><span class="keys"><kbd>${k}</kbd></span>${t}</div>`).join('');
  document.getElementById('introSkip').checked = false;
  overlay.dataset.profession = profession;
  overlay.classList.add('visible');
}

function closeIntro() {
  const overlay = document.getElementById('introOverlay');
  if (!overlay) return;
  if (document.getElementById('introSkip').checked) {
    try { localStorage.setItem('synapkor_skip_intro_' + overlay.dataset.profession, '1'); } catch (e) {}
  }
  overlay.classList.remove('visible');
  // Time is measured from the moment the player actually starts
  state.timer = 0;
  document.getElementById('vrTimer').innerText = '00:00';
}
