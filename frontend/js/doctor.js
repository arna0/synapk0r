// SynapKor — Module "Doctor (GP)": examining a patient with cough and fever.
// Steps: patient card → hand hygiene → temperature → SpO2 → blood pressure → listen to the lungs.
// Then: clinical decision (next step) and talking to a worried patient.
// Educational scenario, simplified on purpose — not medical advice.

let docCardScreen = null, docVitalsScreen = null;
let docPatientTorso = null;
const docVitals = { temp: null, spo2: null, bp: null, lungs: null };
const docTools = {};

const DOC_PATIENT = { x: 1.25, z: -1.55 };

function drawDocCard(open) {
  if (!docCardScreen) return;
  const { ctx, canvas, tex } = docCardScreen;
  const w = canvas.width;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, w, canvas.height);
  ctx.fillStyle = '#0E7490';
  ctx.fillRect(0, 0, w, 58);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Электронная карта пациента', 20, 30);
  ctx.textBaseline = 'top';
  if (!open) {
    ctx.fillStyle = '#475569';
    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Пациент ожидает приёма', 20, 110);
    ctx.fillText('Нажмите [E], чтобы открыть карту', 20, 150);
  } else {
    const rows = [
      ['#0F172A', '700 24px', 'Арман К., 34 года'],
      ['#334155', '500 20px', 'Жалобы: кашель 5 дней, температура'],
      ['#334155', '500 20px', 'до 38.5 °C, слабость, одышка'],
      ['#334155', '500 20px', 'при подъёме по лестнице.'],
      ['#B45309', '600 20px', 'Аллергия: не отмечена'],
      ['#334155', '500 20px', 'Хронических болезней нет, не курит']
    ];
    rows.forEach(([c, f, t], i) => {
      ctx.fillStyle = c;
      ctx.font = f + ' "Plus Jakarta Sans", sans-serif';
      ctx.fillText(t, 20, 80 + i * 38);
    });
  }
  tex.needsUpdate = true;
}

function drawDocVitals() {
  if (!docVitalsScreen) return;
  const { ctx, canvas, tex } = docVitalsScreen;
  ctx.fillStyle = '#0B1220';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#67E8F9';
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ПОКАЗАТЕЛИ ПАЦИЕНТА', 24, 34);
  const rows = [
    ['Температура', docVitals.temp, docVitals.temp ? '#FCA5A5' : null],
    ['Сатурация SpO₂', docVitals.spo2, docVitals.spo2 ? '#FDE68A' : null],
    ['Давление / пульс', docVitals.bp, docVitals.bp ? '#86EFAC' : null],
    ['Лёгкие', docVitals.lungs, docVitals.lungs ? '#FCA5A5' : null]
  ];
  rows.forEach(([label, val, color], i) => {
    const y = 88 + i * 52;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(label, 24, y);
    ctx.fillStyle = color || '#475569';
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(val || '— не измерено', 270, y);
  });
  tex.needsUpdate = true;
}

function buildDoctorEnvironment(group) {
  docVitals.temp = docVitals.spo2 = docVitals.bp = docVitals.lungs = null;

  // Room: light tiles, mint walls, window light
  const tile = makeCanvasScreen(128, 128);
  tile.ctx.fillStyle = '#E2E8F0';
  tile.ctx.fillRect(0, 0, 128, 128);
  tile.ctx.strokeStyle = '#CBD5E1';
  tile.ctx.lineWidth = 3;
  tile.ctx.strokeRect(0, 0, 128, 128);
  tile.tex.wrapS = tile.tex.wrapT = THREE.RepeatWrapping;
  tile.tex.repeat.set(14, 11);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshStandardMaterial({ map: tile.tex, roughness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1);
  group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xDDEFEA, roughness: 0.9 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMat);
  back.position.set(0, 2.5, -2.5);
  group.add(back);
  for (const sx of [-3.8, 3.8]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), wallMat);
    side.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    side.position.set(sx, 2.5, 1);
    group.add(side);
  }
  const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ color: 0xCFEFFF }));
  windowPane.rotation.y = -Math.PI / 2;
  windowPane.position.set(3.78, 1.8, -0.4);
  group.add(windowPane);
  const daylight = new THREE.PointLight(0xFFFFFF, 0.9, 10);
  daylight.position.set(2.5, 2.8, 0);
  group.add(daylight);

  // Poster: hand hygiene
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshStandardMaterial({
    map: createTextTexture([
      { text: 'ГИГИЕНА РУК', font: '800 40px "Plus Jakarta Sans", sans-serif' },
      { text: 'до и после', font: '600 30px "Plus Jakarta Sans", sans-serif' },
      { text: 'каждого пациента', font: '600 30px "Plus Jakarta Sans", sans-serif' }
    ], '#0E7490', '#FFFFFF', 400, 280)
  }));
  poster.position.set(-1.25, 1.75, -2.48);
  group.add(poster);

  // Sink + antiseptic dispenser
  const sink = box(0.6, 0.12, 0.42, 0xF8FAFC, { roughness: 0.2 });
  sink.position.set(-0.45, 0.85, -2.28);
  const sinkStand = box(0.12, 0.8, 0.12, 0xCBD5E1);
  sinkStand.position.set(-0.45, 0.4, -2.38);
  const tap = cyl(0.015, 0.015, 0.16, 0xD1D5DB, { metalness: 0.9, roughness: 0.2 });
  tap.position.set(-0.45, 0.98, -2.42);
  group.add(sink, sinkStand, tap);

  const disp = new THREE.Group();
  disp.name = 'sanitizer';
  const dispBody = box(0.14, 0.24, 0.1, 0xFFFFFF, { roughness: 0.3 });
  const dispLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.08), new THREE.MeshBasicMaterial({
    map: createTextTexture([{ text: 'АНТИСЕПТИК', font: '800 30px "Plus Jakarta Sans", sans-serif' }], '#0284C7', '#FFFFFF', 256, 128)
  }));
  dispLabel.position.set(0, 0.03, 0.051);
  const nozzle = box(0.04, 0.03, 0.05, 0x94A3B8);
  nozzle.position.set(0, -0.12, 0.03);
  disp.add(dispBody, dispLabel, nozzle);
  addHitbox(disp, 0.3, 0.4, 0.2);
  disp.position.set(-0.45, 1.35, -2.43);
  group.add(disp);
  interactiveObjects.push(disp);

  // Doctor's desk with the patient card on screen
  const deskTop = box(1.4, 0.05, 0.75, 0xF1F5F9, { roughness: 0.4 });
  deskTop.position.set(-2.1, 0.76, -1.0);
  const deskBase = box(1.3, 0.72, 0.65, 0xCBD5E1);
  deskBase.position.set(-2.1, 0.37, -1.0);
  group.add(deskTop, deskBase);

  const pc = new THREE.Group();
  pc.name = 'patientCard';
  const pcStand = box(0.05, 0.24, 0.05, 0x334155);
  pcStand.position.y = 0.12;
  const pcFrame = box(0.66, 0.42, 0.035, 0x1E293B);
  pcFrame.position.y = 0.43;
  docCardScreen = makeCanvasScreen(560, 340);
  const pcScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshBasicMaterial({ map: docCardScreen.tex, toneMapped: false }));
  pcScreen.position.set(0, 0.43, 0.019);
  pc.add(pcStand, pcFrame, pcScreen);
  pc.position.set(-2.0, 0.785, -1.15);
  pc.rotation.y = 0.45;
  group.add(pc);
  interactiveObjects.push(pc);
  drawDocCard(false);

  // Examination couch
  const couchBase = box(1.9, 0.5, 0.7, 0xE2E8F0);
  couchBase.position.set(1.3, 0.25, -1.75);
  const couchPad = box(1.9, 0.1, 0.7, 0x0E7490, { roughness: 0.7 });
  couchPad.position.set(1.3, 0.55, -1.75);
  const pillow = box(0.35, 0.08, 0.5, 0xFFFFFF);
  pillow.position.set(2.05, 0.64, -1.75);
  group.add(couchBase, couchPad, pillow);

  // Patient sitting on the edge of the couch, facing the room
  const patient = new THREE.Group();
  patient.name = 'patientBody';
  const skin = 0xE0AC84;
  docPatientTorso = cyl(0.17, 0.2, 0.5, 0x60A5FA, { roughness: 0.8 });
  docPatientTorso.position.set(0, 0.87, 0);
  const neck = cyl(0.05, 0.05, 0.08, skin);
  neck.position.set(0, 1.15, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 18), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }));
  head.position.set(0, 1.28, 0);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2B1B12 }));
  hair.position.set(0, 1.3, -0.01);
  patient.add(docPatientTorso, neck, head, hair);
  for (const s of [-1, 1]) {
    const thigh = cyl(0.07, 0.07, 0.42, 0x1E3A8A);
    thigh.rotation.x = Math.PI / 2;
    thigh.position.set(s * 0.09, 0.64, 0.2);
    const shin = cyl(0.06, 0.06, 0.5, 0x1E3A8A);
    shin.position.set(s * 0.09, 0.38, 0.4);
    const shoe = box(0.09, 0.07, 0.2, 0x111827);
    shoe.position.set(s * 0.09, 0.1, 0.45);
    const arm = cyl(0.05, 0.045, 0.48, 0x60A5FA);
    arm.position.set(s * 0.23, 0.86, 0.04);
    arm.rotation.x = -0.25;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshStandardMaterial({ color: skin }));
    hand.position.set(s * 0.23, 0.62, 0.12);
    patient.add(thigh, shin, shoe, arm, hand);
  }
  patient.position.set(DOC_PATIENT.x, 0, DOC_PATIENT.z);
  group.add(patient);

  // Vitals monitor on the wall above the couch
  docVitalsScreen = makeCanvasScreen(620, 300);
  const vitals = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.53), new THREE.MeshBasicMaterial({ map: docVitalsScreen.tex, toneMapped: false }));
  vitals.position.set(1.3, 1.95, -2.46);
  const vitalsFrame = box(1.16, 0.59, 0.03, 0x1E293B);
  vitalsFrame.position.set(1.3, 1.95, -2.49);
  group.add(vitalsFrame, vitals);
  drawDocVitals();

  // Instrument cart
  const cartTop = box(0.9, 0.03, 0.45, 0xF8FAFC, { roughness: 0.3 });
  cartTop.position.set(0.1, 0.86, -0.95);
  const cartShelf = box(0.9, 0.02, 0.45, 0xE2E8F0);
  cartShelf.position.set(0.1, 0.3, -0.95);
  group.add(cartTop, cartShelf);
  for (const [lx, lz] of [[-0.32, -1.14], [0.52, -1.14], [-0.32, -0.76], [0.52, -0.76]]) {
    const leg = cyl(0.012, 0.012, 0.86, 0x94A3B8, { metalness: 0.8 });
    leg.position.set(lx, 0.43, lz);
    group.add(leg);
  }

  const CART_Y = 0.875;
  function tool(name, x, parts, hit) {
    const g = new THREE.Group();
    g.name = name;
    parts.forEach(p => g.add(p));
    addHitbox(g, hit[0], hit[1], hit[2], 0, hit[1] / 2 - 0.01, 0);
    g.position.set(x, CART_Y, -0.95);
    g.userData.home = { x, y: CART_Y, z: -0.95 };
    group.add(g);
    interactiveObjects.push(g);
    docTools[name] = g;
    return g;
  }

  // Infrared thermometer
  const thBody = box(0.04, 0.035, 0.14, 0xFFFFFF, { roughness: 0.3 });
  thBody.position.y = 0.02;
  const thScreen = box(0.03, 0.005, 0.04, 0x0EA5E9, { emissive: 0x0EA5E9, emissiveIntensity: 0.5 });
  thScreen.position.set(0, 0.04, 0.02);
  tool('thermometer', -0.28, [thBody, thScreen], [0.14, 0.12, 0.2]);

  // Pulse oximeter
  const oxBody = box(0.05, 0.035, 0.07, 0x2563EB, { roughness: 0.4 });
  oxBody.position.y = 0.02;
  const oxScreen = box(0.035, 0.005, 0.03, 0x111827);
  oxScreen.position.set(0, 0.04, 0);
  tool('oximeter', -0.1, [oxBody, oxScreen], [0.13, 0.12, 0.14]);

  // Blood pressure monitor: cuff + gauge + bulb
  const cuff = cyl(0.07, 0.07, 0.03, 0x1E3A8A, { roughness: 0.8 });
  cuff.position.set(-0.03, 0.015, 0);
  const gauge = cyl(0.04, 0.04, 0.02, 0xF8FAFC);
  gauge.position.set(0.06, 0.012, -0.03);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshStandardMaterial({ color: 0x111827 }));
  bulb.position.set(0.06, 0.03, 0.06);
  tool('tonometer', 0.12, [cuff, gauge, bulb], [0.2, 0.12, 0.22]);

  // Stethoscope
  const tube = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 32), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 }));
  tube.rotation.x = Math.PI / 2;
  tube.position.y = 0.01;
  const chest = cyl(0.025, 0.025, 0.015, 0xD1D5DB, { metalness: 0.9, roughness: 0.2 });
  chest.position.set(0.08, 0.012, 0.06);
  tool('stethoscope', 0.4, [tube, chest], [0.18, 0.12, 0.2]);
}

// Moves a tool to the patient, waits (progress bar), then returns it to the cart.
function useDoctorTool(name, target, title, ms, onMeasured, done) {
  const t = docTools[name];
  const home = t.userData.home;
  tweenObject(t, target, 550, () => {
    showActionProgressBar(title, ms, () => {
      onMeasured();
      drawDocVitals();
      tweenObject(t, home, 500, done);
    });
  });
}

function updateDoctorEnvironment(time) {
  if (docPatientTorso) {
    const breath = 1 + Math.sin(time * 2.4) * 0.025;
    docPatientTorso.scale.set(breath, 1, breath);
  }
}

registerScenario({
  id: 'doctor',
  questTitle: 'ВРАЧ · ЗАДАНИЕ 1: ОСМОТР ПАЦИЕНТА',
  arena: { minX: -3.2, maxX: 3.2, minZ: -0.65, maxZ: 2.6 },
  spawn: { x: 0, z: 0.9, eye: 1.65, yaw: 0, pitch: -0.22 },
  labels: {
    patientCard: 'Карта пациента',
    sanitizer: 'Антисептик',
    thermometer: 'Термометр',
    oximeter: 'Пульсоксиметр',
    tonometer: 'Тонометр',
    stethoscope: 'Стетоскоп'
  },
  labelOffsets: { patientCard: 0.75, sanitizer: 0.2, thermometer: 0.1, oximeter: 0.2, tonometer: 0.1, stethoscope: 0.2 },
  intro: {
    title: 'Приём врача-терапевта',
    goal: 'Вы — врач-терапевт. К вам пришёл пациент с кашлем и температурой. Проведите осмотр по порядку, примите решение о дальнейших шагах и поговорите с пациентом. Учебный сценарий упрощён и не является медицинской рекомендацией.',
    plan: [
      'Осмотр: карта → гигиена рук → температура → сатурация → давление → лёгкие',
      'Примите решение: что делать дальше',
      'Ответьте встревоженному пациенту'
    ],
    extra: [['1–3', 'Выбор ответа']]
  },
  build: buildDoctorEnvironment,
  update: updateDoctorEnvironment,
  steps: [
    {
      id: 'patientCard', name: 'Изучите карту и жалобы', short: 'Карта', hint: 'Открыть карту пациента',
      how: 'Компьютер стоит на столе слева. Наведите прицел и нажмите <b>E</b>.',
      why: 'Перед осмотром врач узнаёт жалобы и историю болезни: это подсказывает, что проверять.',
      popup: 'Кашель 5 дней · 38.5 °C · одышка',
      run(done) {
        showActionProgressBar('ОТКРЫВАЮ КАРТУ...', 900, () => { drawDocCard(true); done(); });
      }
    },
    {
      id: 'sanitizer', name: 'Обработайте руки антисептиком', short: 'Руки', hint: 'Обработать руки',
      how: 'Дозатор висит на стене над раковиной. Подойдите (W), наведите прицел и нажмите <b>E</b>.',
      why: 'Гигиена рук до контакта с пациентом — главный способ не переносить инфекции.',
      popup: 'Руки обработаны · 30 сек 🧴',
      run(done) {
        playNoise(0.6, 3000, 0.08);
        showActionProgressBar('ОБРАБОТКА РУК (30 сек)...', 1300, () => {
          // medical gloves on the viewmodel hands
          handsGroup && handsGroup.traverse(c => {
            if (c.isMesh && c.name.includes('Hand')) c.material.color.setHex(0x93C5FD);
          });
          done();
        });
      }
    },
    {
      id: 'thermometer', name: 'Измерьте температуру', short: 'Температура', hint: 'Измерить температуру',
      how: 'Термометр лежит на медицинском столике в центре. Наведите прицел и нажмите <b>E</b>.',
      why: 'Высокая температура — признак воспаления в организме.',
      popup: '🌡 38.4 °C — повышена',
      run(done) {
        useDoctorTool('thermometer', { x: DOC_PATIENT.x, y: 1.3, z: DOC_PATIENT.z + 0.3 }, 'ИЗМЕРЕНИЕ ТЕМПЕРАТУРЫ...', 900,
          () => { docVitals.temp = '38.4 °C  ↑'; playTone(1200, 'sine', 0.12, 0.1); }, done);
      }
    },
    {
      id: 'oximeter', name: 'Измерьте сатурацию', short: 'Сатурация', hint: 'Надеть пульсоксиметр на палец',
      how: 'Синий пульсоксиметр лежит на столике. Наведите прицел и нажмите <b>E</b>.',
      why: 'Пульсоксиметр показывает, сколько кислорода в крови. Норма — 95–100%.',
      popup: 'SpO₂ 94% · пульс 96',
      run(done) {
        useDoctorTool('oximeter', { x: DOC_PATIENT.x + 0.23, y: 0.64, z: DOC_PATIENT.z + 0.14 }, 'ИЗМЕРЕНИЕ SpO₂...', 1100,
          () => { docVitals.spo2 = '94 %  ↓'; playTone(880, 'sine', 0.08, 0.08); }, done);
      }
    },
    {
      id: 'tonometer', name: 'Измерьте давление', short: 'Давление', hint: 'Измерить давление',
      how: 'Тонометр с манжетой лежит на столике. Наведите прицел и нажмите <b>E</b>.',
      why: 'Давление и пульс показывают, как работает сердце и насколько тяжело состояние.',
      popup: 'АД 125/80 · в норме',
      run(done) {
        useDoctorTool('tonometer', { x: DOC_PATIENT.x - 0.23, y: 0.95, z: DOC_PATIENT.z + 0.08, rot: [0, 0, Math.PI / 2] }, 'ИЗМЕРЕНИЕ ДАВЛЕНИЯ...', 1400,
          () => { docVitals.bp = '125/80 · п. 96'; }, () => { docTools.tonometer.rotation.set(0, 0, 0); done(); });
      }
    },
    {
      id: 'stethoscope', name: 'Послушайте лёгкие', short: 'Лёгкие', hint: 'Послушать лёгкие',
      how: 'Стетоскоп лежит на столике справа. Наведите прицел и нажмите <b>E</b>.',
      why: 'При воспалении лёгких врач слышит хрипы в одной зоне — это важная подсказка.',
      popup: 'Влажные хрипы справа внизу',
      run(done) {
        playNoise(1.6, 500, 0.1);
        useDoctorTool('stethoscope', { x: DOC_PATIENT.x - 0.05, y: 0.9, z: DOC_PATIENT.z + 0.22, rot: [Math.PI / 2, 0, 0] }, 'АУСКУЛЬТАЦИЯ ЛЁГКИХ...', 1600,
          () => { docVitals.lungs = 'хрипы справа ↓'; }, () => { docTools.stethoscope.rotation.set(0, 0, 0); done(); });
      }
    }
  ],
  completeBanner: {
    title: 'ОСМОТР ЗАВЕРШЁН',
    text: 'Все показатели собраны. Теперь нужно принять решение.'
  },
  decisions: [
    {
      key: 'diagnosis', kind: 'hard', stepLabel: 'Принять решение',
      questTitle: 'ВРАЧ · ЗАДАНИЕ 2: КЛИНИЧЕСКОЕ РЕШЕНИЕ',
      guideTask: 'Решите, что делать дальше',
      guideHow: 'Оцените результаты осмотра внизу экрана и выберите решение (или нажмите <b>1</b>–<b>3</b>).',
      guideWhy: 'Врач не угадывает диагноз, а подтверждает подозрение обследованием.',
      prompt: () => `
        <div class="speech-bubble scn-bubble-info">
          🩺 <strong>Результаты осмотра:</strong> температура 38.4 °C · SpO₂ 94% · АД 125/80, пульс 96 ·
          влажные хрипы в правом лёгком внизу · кашель 5 дней, одышка. <br>Какое решение вы принимаете?
        </div>`,
      options: [
        { id: 'a', label: 'send_home', score: 20, text: 'Это обычная простуда: отпустить домой с жаропонижающим' },
        { id: 'b', label: 'xray_and_tests', score: 100, text: 'Подозрение на пневмонию: направить на рентген грудной клетки и анализ крови' },
        { id: 'c', label: 'antibiotics_blind', score: 30, text: 'Сразу назначить сильный антибиотик, обследование не нужно' }
      ]
    },
    {
      key: 'comms', kind: 'soft', stepLabel: 'Поговорить с пациентом',
      questTitle: 'ВРАЧ · ЗАДАНИЕ 3: РАЗГОВОР С ПАЦИЕНТОМ',
      guideTask: 'Ответьте встревоженному пациенту',
      guideHow: 'Выберите ответ внизу экрана (или нажмите <b>1</b>–<b>3</b>).',
      guideWhy: 'Хороший врач говорит честно, спокойно и объясняет план — без запугивания и без отмахивания.',
      prompt: () => `
        <div class="speech-bubble">
          😟 <strong>Пациент:</strong> «Доктор, это что-то серьёзное? Мне страшно — дома маленький ребёнок».
        </div>`,
      options: [
        { id: 'a', label: 'dismissive', score: 10, text: '«Не накручивайте себя. Следующий!»' },
        { id: 'b', label: 'empathy_plan', score: 100, text: '«Понимаю, что тревожно. Похоже на воспаление в лёгком, снимок покажет точно. Это лечится. Сделаем рентген сегодня, и я сразу расскажу план лечения»' },
        { id: 'c', label: 'scary_guess', score: 40, text: '«Скорее всего пневмония, вас, наверное, положат в больницу»' }
      ]
    }
  ],
  victory: {
    title: 'Приём завершён!',
    text: 'Вы провели осмотр по порядку, приняли решение на основе данных и поговорили с пациентом.'
  },
  report: {
    stepsLabel: 'Точность порядка осмотра',
    hardLabel: 'Клиническое решение',
    softLabel: 'Общение с пациентом',
    timeLabel: 'Время приёма',
    grades: {
      top: 'Сильная клиническая логика — медицина вам подходит',
      mid: 'Базовые навыки врача есть',
      low: 'Нужно подтянуть основы'
    },
    descTop: 'Осмотр по порядку: жалобы → гигиена рук → показатели → аускультация. Решение принято на основе данных, пациенту всё объяснено спокойно и понятно.',
    descLow: 'Осмотр проведён, но есть зоны роста: действовать по порядку, подтверждать подозрение обследованием и говорить с пациентом бережно.',
    competencies: (c) => [
      c.accuracy >= 90 ? 'Осмотр по стандарту: гигиена рук до контакта и полный набор показателей' : 'Зона роста: соблюдать порядок осмотра без лишних действий',
      c.answers.diagnosis === 'b' ? 'Верно связали симптомы (температура, SpO₂ 94%, хрипы) и назначили обследование' : 'Зона роста: подтверждать подозрение обследованием, а не угадывать',
      c.answers.comms === 'b' ? 'Поддержали пациента и объяснили план без запугивания' : 'Зона роста: сочетать честность и эмпатию в разговоре с пациентом'
    ]
  }
});
