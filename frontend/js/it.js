// SynapKor — Module "IT engineer": on-call incident in a server room.
// Steps: alert → logs → find the failed server → reconnect the cable → restart the service → verify.
// Then: code review (fix a bug) and explaining the incident to the business owner.

let itDashScreen = null, itTermScreen = null;
let itDbLed = null, itCableObj = null, itAlarmLight = null, itAlarmDome = null;
let itRackLeds = [];
let itIncidentOpen = true;

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
  ctx.fillText(ok ? '✓ ALL SYSTEMS OPERATIONAL' : '⚠ ALERT · shop.kz', 22, 33);

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
  ctx.fillText('успешные запросы, % · последние 30 мин', 22, 262);

  ctx.font = '600 20px "JetBrains Mono", monospace';
  if (mode === 'alert') {
    ctx.fillStyle = '#FCA5A5';
    ctx.fillText('Сайт недоступен · нажмите [E]', 22, 300);
  } else if (mode === 'details') {
    ctx.fillStyle = '#FCA5A5';
    ctx.fillText('HTTP 503 · 6 мин · 100% ошибок', 22, 296);
    ctx.fillStyle = '#FDE68A';
    ctx.fillText('Подозрение: база данных db-01', 22, 322);
  } else {
    ctx.fillStyle = '#6EE7B7';
    ctx.fillText('HTTP 200 OK · ответ 84 мс', 22, 296);
    ctx.fillText('Инцидент #412 закрыт', 22, 322);
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
  const lines = {
    idle: [['#94A3B8', 'oncall@ops:~$ _']],
    logs: [
      ['#94A3B8', '$ journalctl -u shop-api -n 5'],
      ['#E2E8F0', '12:04:51 GET /cart 200'],
      ['#F87171', '12:05:02 ERROR db-01:5432'],
      ['#F87171', '  connection refused'],
      ['#F87171', '12:05:03 HTTP 503 /checkout'],
      ['#FDE68A', '12:05:03 retry 3/3 failed']
    ],
    restart: [
      ['#94A3B8', '$ sudo systemctl restart shop-api'],
      ['#94A3B8', '$ systemctl status shop-api'],
      ['#34D399', '● shop-api: active (running)'],
      ['#E2E8F0', 'db-01:5432 connected ✓'],
      ['#34D399', '12:11:40 GET /checkout 200']
    ]
  }[mode];
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
  itCableObj.position.set(IT_CABLE_LOOSE.x, IT_CABLE_LOOSE.y, IT_CABLE_LOOSE.z);
  itCableObj.rotation.set(0.15, 0, -0.08);
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

registerScenario({
  id: 'it',
  questTitle: 'IT · ЗАДАНИЕ 1: ИНЦИДЕНТ — САЙТ НЕДОСТУПЕН',
  arena: { minX: -3.4, maxX: 3.4, minZ: -0.6, maxZ: 2.6 },
  spawn: { x: 0, z: 0.9, eye: 1.65, yaw: 0, pitch: -0.2 },
  labels: {
    monitorDash: 'Мониторинг',
    terminal: 'Ноутбук (терминал)',
    serverDb: 'Сервер db-01',
    patchCable: 'Сетевой кабель'
  },
  labelOffsets: { monitorDash: 0.85, terminal: 0.35, serverDb: 0.16, patchCable: 0.12 },
  intro: {
    title: 'Дежурство IT-инженера',
    goal: 'Вы — дежурный инженер. Интернет-магазин перестал открываться. Найдите причину, почините и убедитесь, что всё работает. Потом исправьте баг в коде и объясните ситуацию руководителю магазина.',
    plan: [
      'Разберите инцидент: алерт → логи → сервер → кабель → перезапуск → проверка',
      'Найдите ошибку в коде и выберите правильное исправление',
      'Объясните руководителю магазина, что случилось'
    ],
    extra: [['1–3', 'Выбор ответа']]
  },
  reset() { itIncidentOpen = true; },
  build: buildItEnvironment,
  update: updateItEnvironment,
  steps: [
    {
      id: 'monitorDash', name: 'Изучите алерт мониторинга', short: 'Алерт', hint: 'Открыть алерт',
      how: 'Монитор с красным экраном стоит на столе слева. Наведите прицел и нажмите <b>E</b>.',
      why: 'Работа дежурного начинается с фактов: что сломалось, с какого момента и насколько серьёзно.',
      popup: 'ALERT: shop.kz → HTTP 503',
      run(done) {
        playTone(660, 'square', 0.12, 0.08);
        showActionProgressBar('ОТКРЫВАЮ АЛЕРТ...', 900, () => { drawItDashboard('details'); done(); });
      }
    },
    {
      id: 'terminal', name: 'Откройте логи сервиса', short: 'Логи', hint: 'Открыть логи (journalctl)',
      how: 'Ноутбук с терминалом стоит на столе правее монитора. Наведите прицел и нажмите <b>E</b>.',
      why: 'Логи — это журнал событий программы. По ним видно, какая ошибка произошла на самом деле.',
      popup: 'ERROR: db-01 connection refused',
      run(done) {
        showActionProgressBar('journalctl -u shop-api ...', 1200, () => { drawItTerminal('logs'); playTone(220, 'sawtooth', 0.2, 0.08); done(); });
      }
    },
    {
      id: 'serverDb', name: 'Найдите сервер базы данных db-01', short: 'Сервер', hint: 'Осмотреть db-01',
      how: 'Серверная стойка справа. У db-01 горит <b>красный</b> индикатор. Подойдите (W), наведите прицел и нажмите <b>E</b>.',
      why: 'Логи говорят: сайт не может подключиться к базе данных на db-01. Проверяем сам сервер.',
      popup: 'db-01: LINK DOWN — кабель выпал',
      run(done) {
        showActionProgressBar('ДИАГНОСТИКА db-01...', 1000, () => { playTone(300, 'triangle', 0.2, 0.1); done(); });
      }
    },
    {
      id: 'patchCable', name: 'Подключите сетевой кабель', short: 'Кабель', hint: 'Вставить кабель в порт eth0',
      how: 'Синий кабель свисает справа от db-01. Наведите на разъём прицел и нажмите <b>E</b>.',
      why: 'Без сетевого подключения сервер с базой данных недоступен для сайта.',
      popup: 'LINK UP · 1 Гбит/с',
      run(done) {
        tweenObject(itCableObj, { ...IT_PORT_POS, rot: [0, 0, 0] }, 600, () => {
          playTone(900, 'square', 0.06, 0.12);
          itDbLed.material.color.setHex(0xFBBF24);
          itDbLed.material.emissive.setHex(0xF59E0B);
          setTimeout(() => {
            itDbLed.material.color.setHex(0x22C55E);
            itDbLed.material.emissive.setHex(0x22C55E);
          }, 700);
          done();
        });
      }
    },
    {
      id: 'terminal', name: 'Перезапустите сервис сайта', short: 'Рестарт', hint: 'systemctl restart shop-api',
      how: 'Вернитесь к ноутбуку на столе и нажмите <b>E</b>, чтобы перезапустить сервис.',
      why: 'Пока базы не было, сервис сайта «завис» в ошибке. Перезапуск заставит его подключиться заново.',
      popup: 'shop-api: active (running)',
      run(done) {
        showActionProgressBar('sudo systemctl restart shop-api ...', 1500, () => { drawItTerminal('restart'); done(); });
      }
    },
    {
      id: 'monitorDash', name: 'Проверьте, что сайт работает', short: 'Проверка', hint: 'Обновить мониторинг',
      how: 'Посмотрите на монитор мониторинга и нажмите <b>E</b>.',
      why: 'Инцидент закрыт, только когда это подтверждают метрики, а не «вроде работает».',
      popup: 'HTTP 200 OK · всё работает ✅',
      run(done) {
        showActionProgressBar('ОБНОВЛЯЮ МЕТРИКИ...', 900, () => { drawItDashboard('ok'); itIncidentOpen = false; done(); });
      }
    }
  ],
  completeBanner: {
    title: 'САЙТ СНОВА РАБОТАЕТ!',
    text: 'Инцидент закрыт за один проход: алерт → логи → причина → исправление → проверка.'
  },
  decisions: [
    {
      key: 'code', kind: 'hard', stepLabel: 'Исправить баг в коде',
      questTitle: 'IT · ЗАДАНИЕ 2: CODE REVIEW',
      guideTask: 'Найдите ошибку в коде',
      guideHow: 'Прочитайте код внизу экрана и выберите правильное исправление (или нажмите <b>1</b>–<b>3</b>).',
      guideWhy: 'Хороший инженер не прячет ошибку, а устраняет её причину.',
      prompt: () => `
        <div class="speech-bubble scn-bubble-info">
          💬 <strong>Разработчица Дана:</strong> Пока база не работала, отчёт в админке упал с ошибкой
          <code>ZeroDivisionError</code>. Функция считает средний чек за день. Как исправить?
        </div>
        <pre class="scn-code"><span class="k">def</span> average_check(orders):
    total = sum(order.price <span class="k">for</span> order <span class="k">in</span> orders)
    <span class="k">return</span> total / len(orders)</pre>`,
      options: [
        { id: 'a', label: 'minus_one', score: 0, text: 'Делить на <code>len(orders) - 1</code>, чтобы знаменатель не был нулём' },
        { id: 'b', label: 'empty_check', score: 100, text: 'Добавить проверку: если заказов нет — вернуть 0 (<code>if not orders: return 0</code>)' },
        { id: 'c', label: 'silence_error', score: 40, text: 'Обернуть код в <code>try / except: pass</code>, чтобы ошибка не показывалась' }
      ]
    },
    {
      key: 'comms', kind: 'soft', stepLabel: 'Объяснить заказчику',
      questTitle: 'IT · ЗАДАНИЕ 3: РАЗГОВОР С ЗАКАЗЧИКОМ',
      guideTask: 'Ответьте руководителю магазина',
      guideHow: 'Выберите ответ внизу экрана (или нажмите <b>1</b>–<b>3</b>).',
      guideWhy: 'Бизнесу важно понять, что случилось и что будет дальше. Простыми словами, без жаргона.',
      prompt: () => `
        <div class="speech-bubble">
          😟 <strong>Руководитель магазина:</strong> «Сайт не работал 20 минут, клиенты не могли оплатить заказы!
          Что случилось и повторится ли это?»
        </div>`,
      options: [
        { id: 'a', label: 'jargon', score: 50, text: '«На db-01 упал линк eth0, shop-api ловил connection refused, я рестартнул юнит — 503 ушли»' },
        { id: 'b', label: 'clear_plan', score: 100, text: '«Сайт снова работает. У сервера базы данных отключился сетевой кабель. Закрепим кабели и настроим оповещение, чтобы замечать такое за минуту. Отчёт пришлю сегодня»' },
        { id: 'c', label: 'blame_shift', score: 10, text: '«Это вопрос к отделу, который отвечает за железо. Я тут ни при чём»' }
      ]
    }
  ],
  victory: {
    title: 'Инцидент закрыт!',
    text: 'Вы нашли причину сбоя, вернули сайт в работу, разобрали баг в коде и объяснили ситуацию заказчику.'
  },
  report: {
    stepsLabel: 'Точность действий при инциденте',
    hardLabel: 'Исправление бага в коде',
    softLabel: 'Коммуникация с заказчиком',
    timeLabel: 'Время восстановления сайта',
    grades: {
      top: 'Junior DevOps / инженер поддержки',
      mid: 'Стажёр IT-поддержки',
      low: 'Нужно подтянуть основы IT'
    },
    descTop: 'Чёткий порядок: алерт → логи → причина → исправление → проверка. Верно исправили код и понятно объяснили сбой бизнесу.',
    descLow: 'Сайт восстановлен, но есть зоны роста: действовать по плану диагностики, исправлять причину ошибки и говорить с заказчиком простым языком.',
    competencies: (c) => [
      c.accuracy >= 90 ? 'Диагностика по порядку: мониторинг → логи → железо, без лишних действий' : 'Зона роста: действовать по плану диагностики, а не наугад',
      c.answers.code === 'b' ? 'Нашли настоящую причину бага (деление на ноль при пустом списке) и исправили её' : 'Зона роста: устранять причину ошибки, а не прятать её',
      c.answers.comms === 'b' ? 'Объяснили сбой заказчику простыми словами и предложили план' : 'Зона роста: объяснять техническое простым языком и брать ответственность'
    ]
  }
});
