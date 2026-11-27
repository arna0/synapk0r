// SynapKor — Module "IT engineer": on-call incident in a server room.
// Steps: alert → logs → find the failed server → reconnect the cable → restart the service → verify.
// Then: code review (fix a bug) and explaining the incident to the business owner.

let itDashScreen = null, itTermScreen = null;
let itDbLed = null, itCableObj = null, itAlarmLight = null, itAlarmDome = null;
let itRackLeds = [];
let itIncidentOpen = true;
let itRun = ITIncident.createRun(ITIncident.CASES[0].id);
let itLastCaseId = null;
const itText = values => gameText(...values);
const itCase = () => ITIncident.getCase(itRun.caseId);

const IT_PORT_POS = { x: 1.53, y: 1.255, z: -1.19 };
const IT_CABLE_LOOSE = { x: 1.6, y: 0.95, z: -1.12 };

// ---------- screen drawings ----------
function drawItDashboard(mode) {
  if (!itDashScreen) return;
  const { ctx, canvas, tex } = itDashScreen;
  const w = canvas.width, h = canvas.height;
  const ok = mode === 'ok';
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ok ? '#059669' : '#DC2626';
  ctx.fillRect(0, 0, w, 64);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(ok ? gameText('✓ ПОКУПКА ПРОВЕРЕНА', '✓ CHECKOUT VERIFIED', '✓ САТЫП АЛУ ТЕКСЕРІЛДІ') : '⚠ ALERT · shop.kz', 22, 33);

  // uptime graph
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(22, 110 + i * 30); ctx.lineTo(w - 22, 110 + i * 30); ctx.stroke();
  }
  ctx.strokeStyle = ok ? '#34D399' : '#F87171';
  ctx.lineWidth = 4;
  ctx.beginPath();
  const pts = 24;
  for (let i = 0; i <= pts; i++) {
    const x = 22 + (w - 44) * i / pts;
    let y = 118 + Math.sin(i * 1.3) * 5;
    if (i > 13) y = 225;                  // outage: requests fail
    if (ok && i > 20) y = 118 + Math.sin(i) * 5; // recovered
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 16px "JetBrains Mono", monospace';
  ctx.fillText(gameText('успешные запросы, % · 30 мин', 'successful requests, % · 30 min', 'сәтті сұраулар, % · 30 мин'), 22, 262);

  ctx.font = '600 20px "JetBrains Mono", monospace';
  if (mode === 'alert') {
    ctx.fillStyle = '#FCA5A5';
    ctx.fillText(gameText('Оплата недоступна · [E]', 'Checkout unavailable · [E]', 'Төлем қолжетімсіз · [E]'), 22, 300);
  } else if (mode === 'details') {
    ctx.fillStyle = '#FCA5A5';
    ctx.fillText('POST /checkout · HTTP 503', 22, 296);
    ctx.fillStyle = '#FDE68A';
    ctx.fillText(gameText('Нужна диагностика зависимости', 'Dependency diagnosis needed', 'Тәуелділікті диагностикалау қажет'), 22, 322);
  } else {
    ctx.fillStyle = '#6EE7B7';
    ctx.fillText('/ready 200 · POST /checkout 201', 22, 296);
    ctx.fillText(gameText('Тестовый заказ сохранён', 'Test order persisted', 'Сынақ тапсырыс сақталды'), 22, 322);
  }
  tex.needsUpdate = true;
}

function drawItTerminal(mode) {
  if (!itTermScreen) return;
  const { ctx, canvas, tex } = itTermScreen;
  ctx.fillStyle = '#0B1020';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const raw = mode === 'logs' ? itCase().logs : mode === 'diagnosis' ? itCase().inspection
    : mode === 'restart' ? itCase().afterRepair : ['oncall@ops:~$ _'];
  const lines = raw.flatMap(line => line.match(/.{1,39}/g) || ['']).slice(0, 9)
    .map(line => [mode === 'restart' ? '#34D399' : '#E2E8F0', line]);
  lines.forEach(([color, text], i) => {
    ctx.fillStyle = color;
    ctx.fillText(text, 14, 14 + i * 26);
  });
  tex.needsUpdate = true;
}

// ---------- scene ----------
function buildItEnvironment(group) {
  itRackLeds = [];
  itIncidentOpen = true;

  // Room: raised-floor tiles, dark walls
  const floorCanvas = makeCanvasScreen(256, 256);
  floorCanvas.ctx.fillStyle = '#5B6573';
  floorCanvas.ctx.fillRect(0, 0, 256, 256);
  floorCanvas.ctx.strokeStyle = '#3A424D';
  floorCanvas.ctx.lineWidth = 6;
  floorCanvas.ctx.strokeRect(0, 0, 256, 256);
  floorCanvas.tex.wrapS = floorCanvas.tex.wrapT = THREE.RepeatWrapping;
  floorCanvas.tex.repeat.set(10, 8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshStandardMaterial({ map: floorCanvas.tex, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1);
  group.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x161B22, roughness: 0.95, envMapIntensity: 0.3 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMat);
  back.position.set(0, 2.5, -2.5);
  group.add(back);
  for (const sx of [-4, 4]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), wallMat);
    side.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    side.position.set(sx, 2.5, 1);
    group.add(side);
  }

  // Cool room light + red incident beacon
  const cool = new THREE.PointLight(0x9CC8FF, 0.8, 9);
  cool.position.set(0.5, 3, 0);
  group.add(cool);
  itAlarmLight = new THREE.PointLight(0xFF2D2D, 1.5, 6);
  itAlarmLight.position.set(0, 2.9, -2.2);
  group.add(itAlarmLight);
  itAlarmDome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: 0xFF3B3B, emissive: 0xFF0000, emissiveIntensity: 1 }));
  itAlarmDome.position.set(0, 2.95, -2.42);
  group.add(itAlarmDome);

  // Whiteboard with the on-call runbook
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.95), new THREE.MeshStandardMaterial({
    map: createTextTexture([
      { text: 'ДЕЖУРСТВО · RUNBOOK', font: '800 30px "Plus Jakarta Sans", sans-serif' },
      { text: '1 алерт  2 логи  3 причина', font: '600 24px "Plus Jakarta Sans", sans-serif' },
      { text: '4 исправить  5 проверить', font: '600 24px "Plus Jakarta Sans", sans-serif' },
      { text: '6 сообщить бизнесу', font: '600 24px "Plus Jakarta Sans", sans-serif' }
    ], '#F8FAFC', '#1E3A8A', 512, 288),
    roughness: 0.5
  }));
  board.position.set(-0.4, 1.75, -2.48);
  group.add(board);

  // Desk
  const deskTop = box(1.9, 0.05, 0.8, 0xE5E7EB, { roughness: 0.4 });
  deskTop.position.set(-1.2, 0.76, -1.0);
  group.add(deskTop);
  for (const [lx, lz] of [[-2.1, -1.35], [-0.3, -1.35], [-2.1, -0.65], [-0.3, -0.65]]) {
    const leg = box(0.05, 0.74, 0.05, 0x374151, { metalness: 0.6 });
    leg.position.set(lx, 0.37, lz);
    group.add(leg);
  }

  // Monitoring monitor
  const monitor = new THREE.Group();
  monitor.name = 'monitorDash';
  const stand = box(0.06, 0.28, 0.06, 0x1F2937, { metalness: 0.5 });
  stand.position.set(0, 0.14, 0);
  const foot = box(0.26, 0.02, 0.18, 0x1F2937, { metalness: 0.5 });
  const frame = box(0.8, 0.5, 0.04, 0x111827, { roughness: 0.3 });
  frame.position.set(0, 0.5, 0);
  itDashScreen = makeCanvasScreen(640, 360);
  const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.44), new THREE.MeshBasicMaterial({ map: itDashScreen.tex, toneMapped: false }));
  dash.position.set(0, 0.5, 0.021);
  monitor.add(stand, foot, frame, dash);
  monitor.position.set(-1.6, 0.785, -1.2);
  monitor.rotation.y = 0.2;
  group.add(monitor);
  interactiveObjects.push(monitor);
  drawItDashboard('alert');

  // Laptop with terminal
  const laptop = new THREE.Group();
  laptop.name = 'terminal';
  const base = box(0.4, 0.02, 0.28, 0x9CA3AF, { metalness: 0.7, roughness: 0.3 });
  const keys = box(0.34, 0.004, 0.14, 0x1F2937);
  keys.position.set(0, 0.012, 0.03);
  const lid = new THREE.Group();
  lid.position.set(0, 0.01, -0.14);
  lid.rotation.x = -0.28;
  const lidBox = box(0.4, 0.27, 0.012, 0x9CA3AF, { metalness: 0.7, roughness: 0.3 });
  lidBox.position.y = 0.135;
  itTermScreen = makeCanvasScreen(420, 280);
  const term = new THREE.Mesh(new THREE.PlaneGeometry(0.37, 0.245), new THREE.MeshBasicMaterial({ map: itTermScreen.tex, toneMapped: false }));
  term.position.set(0, 0.135, 0.007);
  lid.add(lidBox, term);
  laptop.add(base, keys, lid);
  addHitbox(laptop, 0.46, 0.34, 0.36, 0, 0.15, -0.04);
  laptop.position.set(-0.75, 0.795, -0.9);
  laptop.rotation.y = -0.15;
  group.add(laptop);
  interactiveObjects.push(laptop);
  drawItTerminal('idle');

  // Mug & chair (decor)
  const mug = cyl(0.04, 0.035, 0.1, 0x2563EB);
  mug.position.set(-1.05, 0.835, -0.75);
  group.add(mug);
  const seat = box(0.5, 0.06, 0.5, 0x111827);
  seat.position.set(-1.2, 0.48, -0.25);
  const chairBack = box(0.5, 0.55, 0.06, 0x111827);
  chairBack.position.set(-1.2, 0.8, 0.0);
  const pole = cyl(0.03, 0.03, 0.45, 0x6B7280, { metalness: 0.8 });
  pole.position.set(-1.2, 0.23, -0.25);
  group.add(seat, chairBack, pole);

  // Server racks
  function buildRack(x, withDb) {
    const rack = new THREE.Group();
    const shell = box(0.72, 2.0, 0.9, 0x151A21, { metalness: 0.5, roughness: 0.4 });
    shell.position.set(0, 1.0, 0);
    rack.add(shell);
    for (let i = 0; i < 10; i++) {
      const y = 0.22 + i * 0.172;
      if (withDb && i === 6) continue; // db-01 slot is its own interactive object
      const unit = box(0.62, 0.13, 0.04, 0x2A313B, { metalness: 0.6, roughness: 0.3 });
      unit.position.set(0, y, 0.45);
      rack.add(unit);
      for (let l = 0; l < 3; l++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.01), new THREE.MeshStandardMaterial({ color: 0x22C55E, emissive: 0x22C55E, emissiveIntensity: 1 }));
        led.position.set(-0.26 + l * 0.03, y, 0.475);
        led.userData.phase = Math.random() * 10;
        rack.add(led);
        itRackLeds.push(led);
      }
    }
    rack.position.set(x, 0, -1.7);
    group.add(rack);
  }
  buildRack(1.3, true);
  buildRack(2.15, false);

  // db-01 (failed server)
  const db = new THREE.Group();
  db.name = 'serverDb';
  const face = box(0.62, 0.14, 0.06, 0x3A4350, { metalness: 0.6, roughness: 0.3 });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.07), new THREE.MeshBasicMaterial({
    map: createTextTexture([{ text: 'db-01', font: '800 60px "JetBrains Mono", monospace' }], '#FDE68A', '#111827', 256, 112)
  }));
  plate.position.set(-0.05, 0, 0.031);
  itDbLed = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.012), new THREE.MeshStandardMaterial({ color: 0xFF3B3B, emissive: 0xFF0000, emissiveIntensity: 3 }));
  itDbLed.position.set(-0.25, 0, 0.032);
  const port = box(0.05, 0.035, 0.012, 0x050505);
  port.position.set(0.23, 0, 0.032);
  db.add(face, plate, itDbLed, port);
  db.position.set(1.3, 0.22 + 6 * 0.172, -1.22);
  group.add(db);
  interactiveObjects.push(db);

  // Unplugged patch cable (connector is the group origin; cable runs up to the cable tray)
  itCableObj = new THREE.Group();
  itCableObj.name = 'patchCable';
  const plug = box(0.035, 0.03, 0.06, 0x93C5FD, { roughness: 0.3 });
  const wire = cyl(0.008, 0.008, 1.0, 0x2563EB, {}, 8);
  wire.position.set(0, 0.52, 0);
  itCableObj.add(plug, wire);
  addHitbox(itCableObj, 0.12, 0.3, 0.12, 0, 0.1, 0);
  const cablePosition = itRun.caseId === 'network-link' ? IT_CABLE_LOOSE : IT_PORT_POS;
  itCableObj.position.set(cablePosition.x, cablePosition.y, cablePosition.z);
  itCableObj.rotation.set(...(itRun.caseId === 'network-link' ? [0.15, 0, -0.08] : [0, 0, 0]));
  if (itRun.caseId !== 'network-link') {
    itDbLed.material.color.setHex(0x22C55E);
    itDbLed.material.emissive.setHex(0x22C55E);
  }
  group.add(itCableObj);
  interactiveObjects.push(itCableObj);

  // Cable tray above racks
  const tray = box(1.8, 0.05, 0.3, 0x6B7280, { metalness: 0.7 });
  tray.position.set(1.7, 2.3, -1.4);
  group.add(tray);
}

function updateItEnvironment(time) {
  itRackLeds.forEach(led => {
    led.material.emissiveIntensity = Math.sin(time * 9 + led.userData.phase) > 0.2 ? 1.6 : 0.2;
  });
  if (itAlarmLight) {
    const pulse = itIncidentOpen ? Math.pow(Math.max(0, Math.sin(time * 5)), 4) * 2.2 : 0;
    itAlarmLight.intensity = pulse;
    itAlarmDome.material.emissiveIntensity = itIncidentOpen ? 0.3 + pulse * 0.6 : 0.05;
  }
}

function itChoice(id, text, correct, feedback) {
  return { id, text: itText(text), correct, feedback: itText(feedback) };
}

function itExercise(stage) {
  const data = itCase();
  const retry = ['Сопоставьте вывод с фактами, затем попробуйте снова.', 'Compare the conclusion with the evidence, then try again.', 'Қорытындыны деректермен салыстырып, қайта көріңіз.'];
  const matched = ['Вывод подтверждён наблюдениями.', 'The evidence supports this conclusion.', 'Бақылаулар бұл қорытындыны растайды.'];
  if (stage === 'triage') return {
    title: gameText('С чего начать дежурство?', 'What needs attention first?', 'Кезекшілікті неден бастау керек?'),
    task: gameText('Одновременно пришли три алерта. Выберите первую задачу по текущему влиянию на покупателей.', 'Three alerts arrived together. Choose the first task by its current customer impact.', 'Үш ескерту қатар келді. Сатып алушыларға қазіргі әсеріне қарай бірінші міндетті таңдаңыз.'),
    trait: 'priority',
    options: [
      itChoice('checkout-impact', ['Покупатели не могут оплатить: POST /checkout → 503', 'Customers cannot pay: POST /checkout → 503', 'Сатып алушылар төлей алмайды: POST /checkout → 503'], true, ['Сначала восстанавливаем возможность оплатить заказ.', 'Restore the ability to pay for an order first.', 'Алдымен тапсырысты төлеу мүмкіндігін қалпына келтіреміз.']),
      itChoice('disk-capacity', ['Диск резервных копий заполнен на 81%; запись продолжается', 'Backup disk is 81% full; backups still run', 'Сақтық көшірме дискі 81% толы; жазу жалғасуда'], false, ['Запас места ещё есть; оплата уже не работает.', 'There is still capacity; checkout is already failing.', 'Дискіде орын бар; төлем қазір істемейді.']),
      itChoice('certificate', ['Сертификат истекает через 21 день', 'Certificate expires in 21 days', 'Сертификат 21 күннен кейін аяқталады'], false, ['Это плановая задача; текущий сбой мешает покупателям.', 'This can be scheduled; the current outage blocks customers.', 'Бұл жоспарлы жұмыс; қазіргі ақау сатып алушыларға кедергі.'])
    ]
  };
  if (stage === 'evidence') return {
    title: gameText('Найдите значимую запись в логах', 'Find the diagnostic log entry', 'Журналдағы маңызды жазбаны табыңыз'),
    task: gameText('Какая запись объясняет отказ зависимости? Ответ 503 описывает результат, но сам по себе не называет причину.', 'Which entry explains the dependency failure? HTTP 503 describes the result but does not identify its cause.', 'Қай жазба тәуелділік ақауын түсіндіреді? 503 жауабы нәтижені көрсетеді, себебін атамайды.'),
    trait: 'analysis',
    options: data.logs.map((text, index) => ({
      id: index === data.evidenceIndex ? data.evidenceId : 'log-' + index,
      text, correct: index === data.evidenceIndex,
      feedback: itText(index === data.evidenceIndex ? matched : retry)
    }))
  };
  if (stage === 'diagnose') return {
    title: gameText('Подтвердите первопричину', 'Confirm the root cause', 'Түпкі себебін растаңыз'),
    task: data.inspection.join('\n'),
    trait: 'diagnosis',
    options: [
      itChoice('disconnected-cable', ['Сетевой кабель db-01 отключён', 'The db-01 network cable is disconnected', 'db-01 желілік кабелі ажыраған'], data.diagnosisId === 'disconnected-cable', data.diagnosisId === 'disconnected-cable' ? matched : retry),
      itChoice('stopped-database', ['Служба PostgreSQL на доступном сервере остановлена', 'PostgreSQL is stopped on a reachable server', 'Қолжетімді сервердегі PostgreSQL қызметі тоқтаған'], data.diagnosisId === 'stopped-database', data.diagnosisId === 'stopped-database' ? matched : retry),
      itChoice('wrong-secret', ['Релиз передаёт неверные данные доступа к работающей базе', 'The release sends incorrect credentials to a running database', 'Релиз жұмыс істейтін дерекқорға қате кіру деректерін жібереді'], data.diagnosisId === 'wrong-secret', data.diagnosisId === 'wrong-secret' ? matched : retry)
    ]
  };
  if (stage === 'repair') return {
    title: gameText('Выберите исправление', 'Choose the repair', 'Түзету әрекетін таңдаңыз'),
    task: itText(data.cause) + ' ' + gameText('Выберите действие, которое устраняет подтверждённую причину.', 'Choose the action that addresses the confirmed cause.', 'Расталған себепті жоятын әрекетті таңдаңыз.'),
    trait: 'syntax',
    options: [
      itChoice('reconnect-eth0', ['Подключить и закрепить кабель в eth0 db-01', 'Reconnect and secure the cable in db-01 eth0', 'Кабельді db-01 eth0 портына қосып, бекіту'], data.repairId === 'reconnect-eth0', data.repairId === 'reconnect-eth0' ? matched : retry),
      itChoice('start-postgresql', ['На db-01: sudo systemctl start postgresql', 'On db-01: sudo systemctl start postgresql', 'db-01 серверінде: sudo systemctl start postgresql'], data.repairId === 'start-postgresql', data.repairId === 'start-postgresql' ? matched : retry),
      itChoice('rollback-config', ['Выполнить согласованный откат shop-api к v2.7 и db-secret-v7', 'Apply the approved shop-api rollback to v2.7 and db-secret-v7', 'shop-api жүйесін бекітілген v2.7 және db-secret-v7 нұсқасына қайтару'], data.repairId === 'rollback-config', data.repairId === 'rollback-config' ? matched : retry),
      itChoice('restart-blindly', ['Перезапустить shop-api без изменения причины сбоя', 'Restart shop-api without addressing the cause', 'Ақау себебін жоймай shop-api қызметін қайта іске қосу'], false, ['Перезапуск не исправит кабель, остановленную базу или неверный секрет.', 'A restart does not fix a cable, a stopped database or incorrect credentials.', 'Қайта іске қосу кабельді, тоқтаған дерекқорды не қате кіру деректерін түзетпейді.'])
    ]
  };
  return {
    title: gameText('Докажите восстановление оплаты', 'Prove checkout is restored', 'Төлемнің қалпына келгенін дәлелдеңіз'),
    task: gameText('Проверьте готовность сервиса и полный путь тестового заказа. Все действия выполняются внутри симуляции.', 'Check service readiness and a complete test-order flow. All actions take place inside the simulation.', 'Қызмет дайындығы мен сынақ тапсырыстың толық жолын тексеріңіз. Барлық әрекет симуляция ішінде орындалады.'),
    trait: 'verification',
    checks: [
      {
        id: 'health', title: gameText('1. Готовность сервиса', '1. Service readiness', '1. Қызмет дайындығы'),
        task: gameText('После исправления: GET /ready → 200; database → connected. Какой вывод допустим?', 'After the repair: GET /ready → 200; database → connected. What does this prove?', 'Түзетуден кейін: GET /ready → 200; database → connected. Бұл нені растайды?'),
        options: [
          itChoice('ready-200', ['Сервис и база готовы; ещё нужна тестовая покупка', 'Service and database are ready; a test purchase is still needed', 'Қызмет пен дерекқор дайын; сынақ сатып алу әлі қажет'], true, ['Health-check пройден. Теперь проверим пользовательский путь.', 'Health check passed. Now verify the customer flow.', 'Дайындық тексерілді. Енді пайдаланушы жолын тексереміз.']),
          itChoice('health-enough', ['Можно закрыть инцидент: зелёного индикатора достаточно', 'Close the incident: a green indicator is enough', 'Оқиғаны жабуға болады: жасыл индикатор жеткілікті'], false, ['Готовность процесса не доказывает, что заказы сохраняются.', 'A ready process does not prove orders are persisted.', 'Процестің дайындығы тапсырыстардың сақталуын дәлелдемейді.'])
        ]
      },
      {
        id: 'checkout', title: gameText('2. Тестовая покупка', '2. Test purchase', '2. Сынақ сатып алу'),
        task: gameText('Тест: товар → корзина → тестовая оплата → POST /checkout 201 → заказ TEST-42 найден в базе. Успех оплаты: 10/10 тестовых запросов.', 'Test: product → cart → test payment → POST /checkout 201 → order TEST-42 found in the database. Checkout success: 10/10 test requests.', 'Сынақ: тауар → себет → сынақ төлем → POST /checkout 201 → TEST-42 тапсырысы дерекқорда табылды. Төлем сәттілігі: 10/10 сынақ сұрау.'),
        options: [
          itChoice('order-confirmed', ['Заказ создан и сохранён; восстановление подтверждено', 'Order created and persisted; recovery is verified', 'Тапсырыс жасалып, сақталды; қалпына келу расталды'], true, ['Оба условия выполнены. Время восстановления зафиксировано.', 'Both checks passed. Restoration time is now recorded.', 'Екі шарт орындалды. Қалпына келу уақыты тіркелді.']),
          itChoice('homepage-only', ['Достаточно было открыть главную страницу', 'Opening the home page would have been enough', 'Басты бетті ашу жеткілікті еді'], false, ['Главная страница может работать при отказе оплаты. Нужен сохранённый заказ.', 'The home page may work while checkout is broken. A persisted order is required.', 'Төлем істемесе де басты бет ашылуы мүмкін. Сақталған тапсырыс қажет.'])
        ]
      }
    ]
  };
}

function itAcceptExercise(exerciseId, result) {
  const next = ITIncident.completeExercise(itRun, exerciseId, result, Date.now());
  if (next === itRun) return false;
  itRun = next;
  if (exerciseId === 'it.triage') drawItDashboard('details');
  if (exerciseId === 'it.evidence') drawItTerminal('logs');
  if (exerciseId === 'it.diagnose') drawItTerminal('diagnosis');
  if (exerciseId === 'it.repair') {
    if (itCableObj && itRun.caseId === 'network-link') {
      itCableObj.position.set(IT_PORT_POS.x, IT_PORT_POS.y, IT_PORT_POS.z);
      itCableObj.rotation.set(0, 0, 0);
    }
    if (itDbLed) {
      itDbLed.material.color.setHex(0x22C55E);
      itDbLed.material.emissive.setHex(0x22C55E);
    }
    drawItTerminal('restart');
  }
  if (exerciseId === 'it.verify') {
    itIncidentOpen = false;
    drawItDashboard('ok');
    scenarioState.restorationTime = ITIncident.restorationSeconds(itRun);
    state.timer = scenarioState.restorationTime;
    clearInterval(state.timerInterval);
    document.getElementById('vrTimer').innerText = String(Math.floor(state.timer / 60)).padStart(2, '0') + ':' + String(state.timer % 60).padStart(2, '0');
    sessionEvents.push({ t: scenarioNow(), action: 'IT_RECOVERY_VERIFIED', ok: true, case_id: itRun.caseId, checks: [...itRun.checks] });
  }
  return true;
}

function createItScenario() {
  const data = itCase();
  const interact = gameText('Откройте нужный объект клавишей E или кнопкой действия в подсказке.', 'Open the required object with E or the guide action button.', 'Қажетті затты E пернесімен немесе нұсқаудағы әрекет батырмасымен ашыңыз.');
  const stages = [
    ['triage', 'monitorDash', ['Оцените влияние алертов', 'Assess the alerts', 'Ескертулер әсерін бағалаңыз'], ['Алерт', 'Alert', 'Ескерту']],
    ['evidence', 'terminal', ['Найдите свидетельство в логах', 'Find evidence in the logs', 'Журналдан дәлел табыңыз'], ['Логи', 'Logs', 'Журнал']],
    ['diagnose', data.diagnosisTarget, ['Проверьте гипотезу по фактам', 'Test the root-cause hypothesis', 'Себеп болжамын тексеріңіз'], ['Причина', 'Cause', 'Себеп']],
    ['repair', data.repairTarget, ['Устраните подтверждённую причину', 'Repair the confirmed cause', 'Расталған себепті түзетіңіз'], ['Ремонт', 'Repair', 'Түзету']],
    ['verify', 'monitorDash', ['Проверьте готовность и тестовый заказ', 'Verify readiness and a test order', 'Дайындық пен сынақ тапсырысты тексеріңіз'], ['Проверка', 'Verify', 'Тексеру']]
  ];
  return {
    id: 'it', version: ITIncident.VERSION,
    questTitle: gameText('IT · ИНЦИДЕНТ #', 'IT · INCIDENT #', 'IT · ОҚИҒА #') + data.number,
    arena: { minX: -3.4, maxX: 3.4, minZ: -0.6, maxZ: 2.6 },
    spawn: { x: 0, z: 0.9, eye: 1.65, yaw: 0, pitch: -0.2 },
    labels: {
      monitorDash: gameText('Мониторинг', 'Monitoring', 'Мониторинг'),
      terminal: gameText('Ноутбук (терминал)', 'Laptop (terminal)', 'Ноутбук (терминал)'),
      serverDb: gameText('Сервер db-01', 'Server db-01', 'db-01 сервері'),
      patchCable: gameText('Сетевой кабель', 'Network cable', 'Желілік кабель')
    },
    labelOffsets: { monitorDash: 0.85, terminal: 0.35, serverDb: 0.16, patchCable: 0.12 },
    intro: {
      title: gameText('Дежурство IT-инженера', 'IT engineer on call', 'IT инженерінің кезекшілігі'),
      goal: gameText('Оплата в магазине shop.kz не работает. Сравните алерты, прочитайте логи, проверьте причину и выберите исправление. Подтвердите восстановление тестовой покупкой.', 'Checkout at shop.kz is failing. Compare alerts, read the logs, verify the cause and choose a repair. Confirm recovery with a test purchase.', 'shop.kz дүкенінде төлем істемейді. Ескертулерді салыстырып, журналды оқыңыз, себебін тексеріп, түзетуді таңдаңыз. Сынақ сатып алумен қалпына келуді растаңыз.'),
      plan: [
        gameText('Приоритет → данные → гипотеза → исправление → проверка', 'Priority → evidence → hypothesis → repair → verification', 'Басымдық → дерек → болжам → түзету → тексеру'),
        gameText('После восстановления: код и ответ заказчику', 'After recovery: code review and customer update', 'Қалпына келген соң: кодты тексеру және тапсырыс берушіге жауап'),
        gameText('В следующем запуске причина сбоя изменится', 'The next run has a different root cause', 'Келесі айналымда ақау себебі өзгереді')
      ], extra: [['1–4', gameText('Выбор ответа', 'Choose an answer', 'Жауап таңдау')]]
    },
    reset() {
      try { itLastCaseId = localStorage.getItem('synapkor.lastItCase') || itLastCaseId; } catch (_) {}
      const selected = ITIncident.nextCase(itLastCaseId);
      itLastCaseId = selected.id;
      try { localStorage.setItem('synapkor.lastItCase', selected.id); } catch (_) {}
      itRun = ITIncident.createRun(selected.id, Date.now());
      itIncidentOpen = true;
      Object.assign(SCENARIOS.it, createItScenario());
      registerScenario(SCENARIOS.it);
      scenarioState.caseId = selected.id;
      scenarioState.scenarioVersion = ITIncident.VERSION;
    },
    onBegin(now) { itRun = { ...itRun, startedAt: now }; },
    build: buildItEnvironment, update: updateItEnvironment,
    exerciseContext(step) { return { caseData: itCase(), state: itRun, stepId: step.stepId, exercise: itExercise(step.stepId) }; },
    acceptExercise: itAcceptExercise,
    steps: stages.map(([stage, target, name, short]) => ({
      id: target, stepId: stage, exerciseId: 'it.' + stage, name: itText(name), short: itText(short), hint: itText(name),
      how: interact,
      why: gameText('Вывод должен следовать из наблюдений. Ошибка даёт обратную связь и возможность повторить выбор.', 'Conclusions must follow the evidence. Mistakes give feedback and another attempt.', 'Қорытынды бақылаулардан шығуы керек. Қате кері байланыс пен қайта таңдау мүмкіндігін береді.')
    })),
    completeBanner: {
      title: gameText('ОПЛАТА ВОССТАНОВЛЕНА', 'CHECKOUT RESTORED', 'ТӨЛЕМ ҚАЛПЫНА КЕЛДІ'),
      text: gameText('Готовность сервиса и сохранение тестового заказа подтверждены. Время восстановления зафиксировано.', 'Service readiness and the persisted test order are verified. Restoration time is recorded.', 'Қызмет дайындығы мен сынақ тапсырыстың сақталуы расталды. Қалпына келу уақыты тіркелді.')
    },
    decisions: [
      {
        key: 'code', kind: 'hard', stepLabel: gameText('Исправить баг в коде', 'Fix the code defect', 'Кодтағы қатені түзету'),
        questTitle: 'IT · CODE REVIEW',
        guideTask: gameText('Обработайте пустой список заказов', 'Handle an empty order list', 'Бос тапсырыстар тізімін өңдеңіз'),
        guideHow: gameText('Прочитайте код и выберите исправление (1–3).', 'Read the code and choose a fix (1–3).', 'Кодты оқып, түзетуді таңдаңыз (1–3).'),
        guideWhy: gameText('Исправляем причину ошибки, сохраняя смысл расчёта.', 'Fix the cause while preserving the calculation.', 'Есептің мағынасын сақтап, қате себебін түзетеміз.'),
        prompt: () => '<div class="speech-bubble scn-bubble-info">' + gameText('Дана, разработчица: «Средний чек падает с ZeroDivisionError, если заказов нет. По требованиям для пустого списка нужно вернуть 0. Как исправить?»', 'Dana, developer: “Average order value throws ZeroDivisionError when there are no orders. The specification requires 0 for an empty list. How should we fix it?”', 'Дана, әзірлеуші: «Тапсырыс болмаса, орташа чек ZeroDivisionError қатесін береді. Талап бойынша бос тізім үшін 0 қайтару керек. Қалай түзетеміз?»') + '</div><pre class="scn-code">def average_check(orders):\n    total = sum(order.price for order in orders)\n    return total / len(orders)</pre>',
        options: [
          { id: 'a', label: 'minus_one', score: 0, text: gameText('Делить на len(orders) - 1', 'Divide by len(orders) - 1', 'len(orders) - 1 мәніне бөлу') },
          { id: 'b', label: 'empty_check', score: 100, text: gameText('До расчёта: if not orders: return 0', 'Before calculating: if not orders: return 0', 'Есептеу алдында: if not orders: return 0') },
          { id: 'c', label: 'silence_error', score: 40, text: gameText('Скрыть исключение: try / except: pass', 'Hide the exception: try / except: pass', 'Ерекше жағдайды жасыру: try / except: pass') }
        ]
      },
      {
        key: 'comms', kind: 'soft', stepLabel: gameText('Объяснить заказчику', 'Update the customer', 'Тапсырыс берушіге түсіндіру'),
        questTitle: gameText('IT · ОТВЕТ ЗАКАЗЧИКУ', 'IT · CUSTOMER UPDATE', 'IT · ТАПСЫРЫС БЕРУШІГЕ ЖАУАП'),
        guideTask: gameText('Объясните результат и следующий шаг', 'Explain the outcome and next step', 'Нәтиже мен келесі қадамды түсіндіріңіз'),
        guideHow: gameText('Выберите ответ (1–3).', 'Choose an answer (1–3).', 'Жауап таңдаңыз (1–3).'),
        guideWhy: gameText('Заказчику нужны проверенный результат, причина и понятный план.', 'The customer needs a verified outcome, a cause and a clear plan.', 'Тапсырыс берушіге расталған нәтиже, себеп және түсінікті жоспар қажет.'),
        prompt: () => '<div class="speech-bubble">' + gameText('Руководитель магазина: «Покупатели не могли оплатить заказы. Что случилось и что вы проверили?»', 'Store manager: “Customers could not pay for orders. What happened and what did you verify?”', 'Дүкен басшысы: «Сатып алушылар тапсырыстарын төлей алмады. Не болды және нені тексердіңіз?»') + '</div>',
        options: [
          { id: 'a', label: 'jargon', score: 50, text: gameText('«Зависимость вернулась, метрики зелёные. Технические детали есть в логах»', '“The dependency is back, metrics are green. Technical details are in the logs.”', '«Тәуелділік қалпына келді, метрикалар жасыл. Техникалық мәлімет журналда бар»') },
          { id: 'b', label: 'clear_plan', score: 100, text: gameText('Оплата восстановлена; тестовый заказ создан и сохранён. ', 'Checkout is restored; a test order was created and persisted. ', 'Төлем қалпына келді; сынақ тапсырыс жасалып, сақталды. ') + itText(data.cause) + ' ' + itText(data.prevention) },
          { id: 'c', label: 'blame_shift', score: 10, text: gameText('«Это проблема другой команды; спросите у них»', '“This is another team’s problem; ask them.”', '«Бұл басқа топтың мәселесі; солардан сұраңыз»') }
        ]
      }
    ],
    victory: {
      title: gameText('Инцидент разобран', 'Incident exercise completed', 'Оқиға талданды'),
      text: gameText('Оплата проверена, код разобран, ответ заказчику записан. В отчёте — результаты каждого упражнения.', 'Checkout was verified, code reviewed and the customer response recorded. The report shows each exercise result.', 'Төлем тексерілді, код талданды, тапсырыс берушіге жауап жазылды. Есепте әр жаттығудың нәтижесі бар.')
    },
    report: {
      stepsLabel: gameText('Работа с объектами', 'Scene actions', 'Заттармен жұмыс'),
      hardLabel: gameText('Исправление кода', 'Code correction', 'Кодты түзету'),
      softLabel: gameText('Ответ заказчику', 'Customer update', 'Тапсырыс берушіге жауап'),
      timeLabel: gameText('До проверки восстановления', 'Until recovery verified', 'Қалпына келуді растауға дейін'),
      descTop: gameText('В этой попытке вы уверенно выполнили практические проверки и решения.', 'You completed the practical checks and decisions successfully in this attempt.', 'Бұл әрекетте практикалық тексерулер мен шешімдерді сәтті орындадыңыз.'),
      descLow: gameText('Восстановление подтверждено. Отчёт покажет, какие решения стоит повторить без подсказок.', 'Recovery is verified. The report identifies decisions to practise again without guidance.', 'Қалпына келу расталды. Есеп қай шешімдерді нұсқаусыз қайталау керегін көрсетеді.'),
      competencies: c => [
        itText(data.title) + ' · ' + ITIncident.VERSION,
        c.answers.code === 'b' ? gameText('Проверили пустой список перед делением.', 'Checked for an empty list before division.', 'Бөлу алдында бос тізімді тексердіңіз.') : gameText('Повторите обработку пустого списка заказов.', 'Practise handling an empty order list.', 'Бос тапсырыстар тізімін өңдеуді қайталаңыз.'),
        c.answers.comms === 'b' ? gameText('Связали причину, проверенный результат и профилактику.', 'Connected the cause, verified recovery and prevention.', 'Себепті, расталған нәтижені және алдын алуды байланыстырдыңыз.') : gameText('В ответе заказчику нужны причина, результат и следующий шаг.', 'The customer update needs the cause, outcome and next step.', 'Жауапта себеп, нәтиже және келесі қадам болуы керек.')
      ]
    }
  };
}

registerScenario(createItScenario());
