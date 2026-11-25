// SynapKor — a different mini-game for every profession.
//
// Each hands-on action is a small version of the real skill, not a generic timing bar:
//   Barista: dose the grind by weight, stop the shot by colour and time, steam milk by feel
//   Safety:  spot site hazards, prove-test-prove with a multimeter, vent pressure by turning the wheel,
//            say no to a colleague who wants the lock off
//   IT:      triage alerts, find the root cause in the logs, find the dead port, build the command
//   Doctor:  hand hygiene order, tap along with the pulse, blood pressure by ear, find crackles in the lungs
// Every mini-game scores one trait (0–100). The report shows the traits as a profile of what this
// job asks for and how you did, so the player can judge whether the work suits them.
// Loaded after dynamics.js: it routes showActionProgressBar by title and keeps dynamics' version as a fallback.

const T = (ru, en) => (typeof currentLang !== 'undefined' && currentLang === 'en' ? en : ru);

// ---------- fit profile ----------
const FIT_TRAITS = () => ({
  barista: {
    precision: [T('Точность', 'Precision'), T('Помол до грамма: стабильный вкус каждой чашки', 'Grinding to the gram: every cup tastes the same')],
    timing: [T('Чувство времени', 'Timing'), T('Остановить шот по цвету и секундам', 'Stopping the shot by colour and seconds')],
    feel: [T('Работа руками', 'Hands-on feel'), T('Держать питчер в правильной точке', 'Keeping the pitcher in the right spot')],
  },
  safety: {
    vigilance: [T('Внимательность', 'Vigilance'), T('Замечать опасности до начала работ', 'Spotting hazards before work starts')],
    thoroughness: [T('Тщательность', 'Thoroughness'), T('Проверить каждую пару фаз и сам прибор', 'Testing every phase pair and the meter itself')],
    control: [T('Контроль', 'Control'), T('Стравливать давление плавно', 'Venting pressure smoothly')],
    firmness: [T('Твёрдость', 'Firmness'), T('Не нарушать процедуру под давлением', 'Keeping to the procedure under pressure')],
  },
  it: {
    priority: [T('Приоритеты', 'Prioritising'), T('Сначала то, что мешает клиентам', 'First what stops customers')],
    analysis: [T('Анализ', 'Analysis'), T('Найти первопричину, а не следствие', 'Finding the cause, not the symptom')],
    attention: [T('Внимание к деталям', 'Attention to detail'), T('Заметить один погасший порт', 'Noticing the one dead port')],
    syntax: [T('Точность команд', 'Command accuracy'), T('Собрать команду без опасных ошибок', 'Building a command without risky mistakes')],
  },
  doctor: {
    protocol: [T('Протокол', 'Protocol'), T('Порядок обработки рук по ВОЗ', 'The WHO hand-rub order')],
    attention: [T('Внимание', 'Attention'), T('Почувствовать ритм пульса', 'Following the pulse rhythm')],
    hearing: [T('Слух и концентрация', 'Listening'), T('Давление по тонам Короткова', 'Blood pressure by Korotkoff sounds')],
    diagnosis: [T('Диагностика', 'Diagnosis'), T('Найти зону с хрипами', 'Finding the zone with crackles')],
  },
});
const fit = { module: null, scores: {} };

function fitReset(module) {
  fit.module = module;
  fit.scores = {};
}

function fitRecord(trait, score) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  fit.scores[trait] = s;
  if (typeof sessionEvents !== 'undefined') {
    const t = typeof sessionStartedAt !== 'undefined' ? Math.round((Date.now() - sessionStartedAt) / 100) / 10 : 0;
    sessionEvents.push({ t, action: `MINIGAME_${trait.toUpperCase()}_${s}`, ok: s >= 60 });
  }
  if (s >= 85) adapt.up(0.08);
  else if (s >= 60) adapt.up(0.03);
  else { adapt.down(0.1); if (typeof state !== 'undefined') { state.misclicks++; adapt.lastMisclicks = state.misclicks; } }
}

// ---------- shared panel ----------
let mgActive = null;

function mgPanel(title, task) {
  if (mgActive) mgActive.close();
  if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  const host = document.getElementById('viewportWrap') || document.body;
  const box = document.createElement('div');
  box.className = 'mg';
  box.setAttribute('role', 'dialog');
  box.innerHTML = `<div class="mg-head"><div class="mg-title"></div><div class="mg-task"></div></div>
    <div class="mg-body"></div><div class="mg-foot"><span class="mg-hint"></span></div>`;
  box.querySelector('.mg-title').textContent = title;
  box.querySelector('.mg-task').textContent = task;
  ['click', 'pointerdown', 'mousedown'].forEach((ev) => box.addEventListener(ev, (e) => e.stopPropagation()));
  host.appendChild(box);
  const cleanups = [];
  const panel = {
    box,
    body: box.querySelector('.mg-body'),
    foot: box.querySelector('.mg-foot'),
    hint: (text, tone) => {
      const h = box.querySelector('.mg-hint');
      h.textContent = text;
      h.dataset.tone = tone || '';
    },
    onCleanup: (fn) => cleanups.push(fn),
    close: () => {
      cleanups.splice(0).forEach((fn) => fn());
      box.remove();
      if (mgActive === panel) mgActive = null;
    },
    // show the result for a moment, then close and continue
    finish: (score, trait, verdict, then) => {
      if (panel.done) return;
      panel.done = true;
      fitRecord(trait, score);
      box.classList.add(score >= 85 ? 'is-great' : score >= 60 ? 'is-ok' : 'is-poor');
      panel.hint(verdict, score >= 60 ? 'ok' : 'bad');
      if (typeof playTone === 'function') playTone(score >= 60 ? 880 : 200, score >= 60 ? 'sine' : 'sawtooth', 0.15, 0.08);
      const timer = setTimeout(() => { panel.close(); if (then) then(); }, score >= 60 ? 1100 : 1700);
      panel.onCleanup(() => clearTimeout(timer));
    },
  };
  mgActive = panel;
  return panel;
}

function mgButton(panel, label, onPress, onRelease) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mg-btn';
  b.textContent = label;
  panel.foot.appendChild(b);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); onPress && onPress(); });
  if (onRelease) ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => onRelease()));
  return b;
}

// E / Space / Enter as press-and-release, captured before the game's own controls
function mgKeys(panel, onDown, onUp) {
  const codes = ['KeyE', 'Space', 'Enter'];
  const down = (e) => { if (codes.includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat && onDown) onDown(); } };
  const up = (e) => { if (codes.includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); if (onUp) onUp(); } };
  window.addEventListener('keydown', down, true);
  window.addEventListener('keyup', up, true);
  panel.onCleanup(() => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); });
}

function mgLoop(panel, fn) {
  let raf = 0;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (fn(dt, now) !== false) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  panel.onCleanup(() => cancelAnimationFrame(raf));
}

function mgCanvas(panel, w, h) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = w * dpr;
  c.height = h * dpr;
  c.className = 'mg-canvas';
  c.style.aspectRatio = `${w} / ${h}`;
  panel.body.appendChild(c);
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { c, ctx, w, h };
}

function mgChoices(panel, items, onPick, cls = '') {
  const wrap = document.createElement('div');
  wrap.className = 'mg-choices ' + cls;
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mg-choice';
    b.innerHTML = it.html || '';
    if (!it.html) b.textContent = it.text;
    b.addEventListener('click', () => onPick(it, b, i));
    wrap.appendChild(b);
  });
  panel.body.appendChild(wrap);
  return wrap;
}

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const rand = (a, b) => a + Math.random() * (b - a);

// =====================================================================================
// BARISTA
// =====================================================================================

// Dose the grind: hold to grind, release at 18 g. Grounds keep falling for a moment after release.
function mgGrind(done) {
  const p = mgPanel(T('Помол', 'Grinding'), T('Держите E или кнопку и отпустите на 18 г. После отпускания досыпается ещё немного.', 'Hold E or the button and let go at 18 g. A little more falls after you let go.'));
  const { ctx, w, h } = mgCanvas(p, 460, 150);
  let grams = 0, rate = 0, holding = false, released = false, settle = 0;
  const press = () => { if (!released) { holding = true; if (typeof playGrinderSound === 'function') playGrinderSound(); } };
  const release = () => { if (holding) { holding = false; released = true; } };
  mgKeys(p, press, release);
  mgButton(p, T('Держать', 'Hold'), press, release);
  mgLoop(p, (dt) => {
    if (holding) rate = Math.min(7.5, rate + dt * 9);
    else rate = Math.max(0, rate - dt * (released ? 14 : 30));
    grams += rate * dt;
    if (released && rate === 0) settle += dt;
    // draw: scale display + target band
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1b1f27'; ctx.fillRect(0, 0, w, h);
    const x0 = 24, x1 = w - 24, max = 24;
    const X = (g) => x0 + (x1 - x0) * Math.min(1, g / max);
    ctx.fillStyle = 'rgba(52,211,153,0.25)'; ctx.fillRect(X(17.5), 92, X(18.5) - X(17.5), 22);
    ctx.fillStyle = '#2a303b'; ctx.fillRect(x0, 100, x1 - x0, 6);
    ctx.fillStyle = '#c8a27a'; ctx.fillRect(x0, 100, X(grams) - x0, 6);
    ctx.fillStyle = '#9aa4b2'; ctx.font = '600 12px Inter, system-ui, sans-serif';
    [0, 6, 12, 18, 24].forEach((g) => ctx.fillText(g + ' g', X(g) - 8, 132));
    ctx.fillStyle = '#f3f5f9'; ctx.font = '700 44px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(grams.toFixed(1), 24, 62);
    ctx.font = '600 16px Inter, system-ui, sans-serif'; ctx.fillStyle = '#9aa4b2';
    ctx.fillText(T('г   цель 18.0', 'g   target 18.0'), 140, 60);
    if (released && settle > 0.25) {
      const err = Math.abs(grams - 18);
      const score = 100 - err * 45;
      p.finish(score, 'precision',
        err <= 0.3 ? T(`${grams.toFixed(1)} г — точно в рецепт`, `${grams.toFixed(1)} g — right on the recipe`)
          : grams < 18 ? T(`${grams.toFixed(1)} г — мало: кофе выйдет кислым и водянистым`, `${grams.toFixed(1)} g — too little: the coffee will be sour and thin`)
            : T(`${grams.toFixed(1)} г — много: горько и перерасход зерна`, `${grams.toFixed(1)} g — too much: bitter, and beans wasted`), done);
      return false;
    }
  });
}

// Pull the shot: the clock runs 4× fast, the stream changes colour. Stop between 25 and 30 s.
function mgShot(done) {
  const p = mgPanel(T('Экстракция эспрессо', 'Pulling the shot'), T('Остановите шот на 25–30 секунде, когда струя становится светлой (блондинг).', 'Stop the shot at 25–30 seconds, when the stream turns pale (blonding).'));
  const { ctx, w, h } = mgCanvas(p, 460, 170);
  let t = 0, stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    const err = t < 25 ? 25 - t : t > 30 ? t - 30 : 0;
    const score = 100 - err * 12;
    p.finish(score, 'timing',
      err === 0 ? T(`${t.toFixed(0)} с — сбалансированный вкус`, `${t.toFixed(0)} s — a balanced shot`)
        : t < 25 ? T(`${t.toFixed(0)} с — недоэкстракция, кисло`, `${t.toFixed(0)} s — under-extracted, sour`)
          : T(`${t.toFixed(0)} с — переэкстракция, горько`, `${t.toFixed(0)} s — over-extracted, bitter`), done);
  };
  mgKeys(p, stop);
  mgButton(p, T('Стоп', 'Stop'), stop);
  mgLoop(p, (dt) => {
    if (!stopped) t += dt * 4 * Math.min(1.3, adapt.level);
    if (t >= 42 && !stopped) stop();
    // colour: dark → hazel → blonde
    const k = Math.min(1, t / 34);
    const c = (a, b) => Math.round(a + (b - a) * k);
    const stream = t < 6 ? 'rgba(0,0,0,0)' : `rgb(${c(70, 222)},${c(38, 178)},${c(22, 110)})`;
    ctx.fillStyle = '#1b1f27'; ctx.fillRect(0, 0, w, h);
    // group head + cup
    ctx.fillStyle = '#3a404c'; ctx.fillRect(170, 10, 120, 22);
    ctx.fillStyle = stream; ctx.fillRect(226, 32, 4 + (t > 8 ? 4 : 0), 86);
    ctx.fillStyle = '#e9e4dc'; ctx.beginPath(); ctx.moveTo(196, 116); ctx.lineTo(264, 116); ctx.lineTo(256, 160); ctx.lineTo(204, 160); ctx.closePath(); ctx.fill();
    const fill = Math.min(1, Math.max(0, (t - 6) / 26));
    ctx.fillStyle = '#4a2a18'; ctx.fillRect(206, 158 - 38 * fill, 48, 38 * fill);
    ctx.fillStyle = '#c08a52'; ctx.fillRect(206, 156 - 38 * fill, 48, Math.min(6, 38 * fill));
    // timer
    ctx.fillStyle = '#f3f5f9'; ctx.font = '700 40px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(t.toFixed(0).padStart(2, '0') + T(' с', ' s'), 24, 60);
    ctx.fillStyle = '#9aa4b2'; ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.fillText(T('цель 25–30 с', 'target 25–30 s'), 26, 84);
    ctx.fillText(t < 6 ? T('предсмачивание…', 'pre-infusion…') : T('цвет струи →', 'stream colour →'), 26, 140);
    if (stopped) return false;
  });
}

// Steam the milk: hold to raise the pitcher, let go to lower it. Keep the wand tip at the surface
// (the "whirlpool" band) while the milk heats to 65 °C.
function mgSteam(done) {
  const p = mgPanel(T('Взбивание молока', 'Steaming milk'), T('Держите E, чтобы поднять питчер, отпустите — опустится. Держите носик парника у поверхности, пока молоко не нагреется.', 'Hold E to raise the pitcher, let go to lower it. Keep the steam tip at the surface while the milk heats up.'));
  const { ctx, w, h } = mgCanvas(p, 460, 170);
  let y = 0.5, vy = 0, up = false, temp = 20, inBand = 0, total = 0, drift = 0;
  const press = () => { up = true; };
  const release = () => { up = false; };
  mgKeys(p, press, release);
  mgButton(p, T('Поднять', 'Raise'), press, release);
  const bandC = 0.5, bandH = 0.16 / Math.min(1.3, adapt.level);
  mgLoop(p, (dt, now) => {
    drift = Math.sin(now / 470) * 0.35 + Math.sin(now / 1130) * 0.25;
    vy += ((up ? 1.6 : -1.2) + drift) * dt;
    vy *= 0.92;
    y = Math.max(0, Math.min(1, y + vy * dt * 2.2));
    temp += dt * 8.5;
    total += dt;
    const ok = Math.abs(y - bandC) <= bandH / 2;
    if (ok) inBand += dt;
    ctx.fillStyle = '#1b1f27'; ctx.fillRect(0, 0, w, h);
    // depth gauge
    const gx = 40, gy = 14, gh = 140;
    ctx.fillStyle = '#2a303b'; ctx.fillRect(gx, gy, 22, gh);
    ctx.fillStyle = 'rgba(52,211,153,0.35)'; ctx.fillRect(gx, gy + gh * (1 - bandC - bandH / 2), 22, gh * bandH);
    ctx.fillStyle = ok ? '#34d399' : '#fbbf24'; ctx.fillRect(gx - 6, gy + gh * (1 - y) - 3, 34, 6);
    ctx.fillStyle = '#9aa4b2'; ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.fillText(T('глубоко', 'deep'), gx + 32, gy + gh - 2);
    ctx.fillText(T('на поверхности: свист', 'at the top: screeching'), gx + 32, gy + 10);
    // milk texture preview
    ctx.fillStyle = ok ? '#f1e9dc' : y > bandC ? '#f7f3ee' : '#e6dccb';
    ctx.beginPath(); ctx.ellipse(250, 92, 70, 44, 0, 0, Math.PI * 2); ctx.fill();
    if (ok) { ctx.strokeStyle = 'rgba(160,130,100,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(250, 92, 18 + (now / 30) % 26, 0, Math.PI * 1.6); ctx.stroke(); }
    // thermometer
    ctx.fillStyle = '#f3f5f9'; ctx.font = '700 32px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(Math.round(temp) + '°C', 350, 60);
    ctx.fillStyle = '#9aa4b2'; ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.fillText(T('до 65 °C', 'up to 65 °C'), 352, 80);
    ctx.fillText(ok ? T('воронка, микропена', 'whirlpool, microfoam') : y > bandC ? T('крупные пузыри', 'big bubbles') : T('нет пены', 'no foam'), 330, 150);
    if (temp >= 65) {
      const score = (inBand / total) * 115;
      p.finish(score, 'feel', score >= 85 ? T('Шелковистая микропена', 'Silky microfoam')
        : score >= 60 ? T('Пена неплохая, но неровная', 'Decent foam, a bit uneven')
          : T('Пена грубая или её нет: латте-арт не выйдет', 'Rough or no foam: no latte art today'), done);
      return false;
    }
  });
}

// =====================================================================================
// SAFETY
// =====================================================================================

const HAZARDS = [
  { ru: 'Кабель с повреждённой изоляцией лежит в проходе', en: 'A cable with damaged insulation lies across the walkway', hazard: true },
  { ru: 'Лужа масла рядом с электрощитом', en: 'An oil puddle next to the electrical panel', hazard: true },
  { ru: 'Запасный выход заставлен коробками', en: 'The emergency exit is blocked with boxes', hazard: true },
  { ru: 'С вращающегося вала снят защитный кожух', en: 'The guard is off a rotating shaft', hazard: true },
  { ru: 'Огнетушитель на кронштейне, пломба на месте', en: 'Fire extinguisher on its bracket, seal intact', hazard: false },
  { ru: 'Аптечка с актуальным сроком годности', en: 'First-aid kit, in date', hazard: false },
  { ru: 'Знак «Не включать! Работают люди» у щита', en: '“Do not switch on — people at work” sign at the panel', hazard: false },
  { ru: 'Коврик диэлектрический перед щитом', en: 'Insulating mat in front of the panel', hazard: false },
];

// Hazard walk-round before work: pick every real hazard in 20 seconds.
function mgHazardScan(done) {
  const p = mgPanel(T('Осмотр участка', 'Site walk-round'), T('Перед работой отметьте всё опасное. Тут 4 опасности. 20 секунд.', 'Before work, mark everything dangerous. There are 4 hazards. 20 seconds.'));
  const items = shuffle(HAZARDS);
  let found = 0, wrong = 0;
  const bar = document.createElement('div');
  bar.className = 'countdown';
  bar.innerHTML = '<div class="countdown-fill"></div>';
  const end = () => {
    const score = found * 25 - wrong * 15;
    p.finish(score, 'vigilance', T(`Найдено ${found} из 4, ложных ${wrong}`, `Found ${found} of 4, false alarms ${wrong}`), done);
  };
  mgChoices(p, items.map((it) => ({ text: T(it.ru, it.en), it })), (c, b) => {
    if (b.disabled || p.done) return;
    b.disabled = true;
    if (c.it.hazard) { found++; b.classList.add('is-right'); if (found === 4) end(); }
    else { wrong++; b.classList.add('is-wrong'); }
  }, 'is-grid');
  p.body.prepend(bar);
  const total = 20 / Math.min(1.3, adapt.level), start = performance.now();
  mgLoop(p, (dt, now) => {
    const left = 1 - (now - start) / (total * 1000);
    bar.firstChild.style.width = Math.max(0, left * 100) + '%';
    bar.classList.toggle('is-urgent', left < 0.3);
    if (left <= 0) { end(); return false; }
    if (p.done) return false;
  });
}

// Prove-test-prove: check the meter on a known source, test all six pairs, prove the meter again.
// Sometimes one pair is still live (back-feed): then the right move is to stop, not to confirm.
function mgVoltage(done) {
  const p = mgPanel(T('Проверка отсутствия напряжения', 'Proving dead'), T('1) Проверьте прибор на эталоне. 2) Замерьте все пары: выберите две клеммы. 3) Снова проверьте прибор.', '1) Check the meter on the proving unit. 2) Test every pair: pick two terminals. 3) Check the meter again.'));
  const terms = ['L1', 'L2', 'L3', 'N', 'PE'];
  const PAIRS = ['L1-L2', 'L2-L3', 'L1-L3', 'L1-PE', 'L2-PE', 'L3-PE'];
  const live = Math.random() < 0.4 ? 'L3-PE' : null;
  const tested = new Set();
  let provedBefore = false, provedAfter = false, first = null;
  const lcd = document.createElement('div');
  lcd.className = 'mg-lcd';
  lcd.textContent = '---.- V';
  p.body.appendChild(lcd);
  const row = document.createElement('div');
  row.className = 'mg-terms';
  p.body.appendChild(row);
  const setLcd = (v, tone) => { lcd.textContent = v; lcd.dataset.tone = tone || ''; };
  const prove = mgChoices(p, [{ text: T('Проверить прибор на эталоне (230 В)', 'Check the meter on the proving unit (230 V)') }], () => {
    setLcd('230.0 V', 'warn');
    if (tested.size === 0) provedBefore = true;
    else provedAfter = true;
    if (typeof playMultimeterBeep === 'function') playMultimeterBeep();
  });
  terms.forEach((name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mg-term';
    b.textContent = name;
    b.onclick = () => {
      if (!first) { first = name; b.classList.add('is-on'); return; }
      row.querySelectorAll('.is-on').forEach((x) => x.classList.remove('is-on'));
      if (first === name) { first = null; return; }
      const pair = [first, name].sort((a, c) => terms.indexOf(a) - terms.indexOf(c)).join('-');
      first = null;
      tested.add(pair);
      const v = pair === live ? '231.4 V' : pair.includes('N') ? '0.0 V' : '0.0 V';
      setLcd(v, pair === live ? 'bad' : 'ok');
      if (typeof playMultimeterBeep === 'function') playMultimeterBeep();
      count.textContent = T(`Пар проверено: ${PAIRS.filter((x) => tested.has(x)).length} из 6`, `Pairs tested: ${PAIRS.filter((x) => tested.has(x)).length} of 6`);
    };
    row.appendChild(b);
  });
  const count = document.createElement('div');
  count.className = 'mg-note';
  count.textContent = T('Пар проверено: 0 из 6', 'Pairs tested: 0 of 6');
  p.body.appendChild(count);
  const sawLive = () => live && tested.has(live);
  const verdict = (says) => {
    const covered = PAIRS.filter((x) => tested.has(x)).length;
    let score = covered / 6 * 70 + (provedBefore ? 15 : 0) + (provedAfter ? 15 : 0);
    let ok = true;
    if (says === 'dead' && live) { score = Math.min(score, 20); ok = false; }
    if (says === 'live' && !sawLive()) score -= 30;
    const notes = [];
    if (!provedBefore) notes.push(T('прибор не проверен до замера', 'meter not checked before'));
    if (!provedAfter) notes.push(T('и после', 'or after'));
    if (covered < 6) notes.push(T(`пропущено пар: ${6 - covered}`, `pairs missed: ${6 - covered}`));
    if (!ok) {
      safetyState.errors++;
      logAction('VOLTAGE_CONFIRMED_WHILE_LIVE', Date.now(), false);
    }
    const text = !ok ? T('На L3–PE было 231 В: обратное питание. Подтверждать «нет напряжения» было нельзя.', 'L3–PE read 231 V: back-feed. You couldn’t confirm it was dead.')
      : says === 'live' ? T('Верно: напряжение есть — работы остановлены, питание снимут на вводе', 'Right: it’s live — work stopped, power will be cut at the supply')
        : notes.length ? T('Засчитано, но: ', 'Accepted, but: ') + notes.join(', ') : T('Полная проверка по правилу «проверь–замерь–проверь»', 'A full prove–test–prove');
    p.finish(score, 'thoroughness', text, () => done(says === 'live' && live ? 'fault' : 'ok'));
  };
  mgButton(p, T('Напряжения нет', 'It’s dead'), () => verdict('dead'));
  const stopBtn = mgButton(p, T('Есть напряжение — стоп', 'Live — stop'), () => verdict('live'));
  stopBtn.classList.add('is-ghost');
  void prove;
}

// Vent the pressure: drag in circles on the handwheel (or hold E). Turning too fast sprays steam.
function mgValve(idx, done) {
  const p = mgPanel(T(`Клапан ${idx + 1}`, `Valve ${idx + 1}`), T('Крутите маховик по кругу мышью или пальцем (или держите E). Слишком быстро — выброс пара.', 'Turn the wheel in circles with the mouse or a finger (or hold E). Too fast and steam blasts out.'));
  const { c, ctx, w, h } = mgCanvas(p, 460, 190);
  c.style.touchAction = 'none';
  let angle = 0, turned = 0, speed = 0, lastA = null, dragging = false, keyHold = false, tooFast = 0, total = 0;
  const need = Math.PI * 2 * 1.5;
  const cx = 120, cy = 95, R = 70;
  const pos = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * (w / r.width) - cx, (e.clientY - r.top) * (h / r.height) - cy]; };
  c.addEventListener('pointerdown', (e) => { dragging = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); lastA = Math.atan2(y, x); });
  c.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const [x, y] = pos(e);
    const a = Math.atan2(y, x);
    let d = a - lastA;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    lastA = a;
    if (d > 0) { turned += d; angle += d; speed += d * 12; }
  });
  ['pointerup', 'pointercancel'].forEach((ev) => c.addEventListener(ev, () => { dragging = false; }));
  mgKeys(p, () => { keyHold = true; }, () => { keyHold = false; });
  const limit = 9 * Math.min(1.25, Math.max(0.9, 1 / adapt.level + 0.3));
  mgLoop(p, (dt) => {
    if (keyHold) { const d = dt * 1.9; turned += d; angle += d; speed += d * 12; }
    speed *= Math.pow(0.04, dt);
    total += dt;
    const fast = speed > limit;
    if (fast) tooFast += dt;
    const pressure = Math.max(0, 4 * (1 - turned / need));
    ctx.fillStyle = '#1b1f27'; ctx.fillRect(0, 0, w, h);
    // wheel
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(0, 0, R - 8, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 7; for (let i = 0; i < 5; i++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R - 10, 0); ctx.stroke(); }
    ctx.fillStyle = '#8e2b20'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // gauge
    const gx = 330, gy = 100, gr = 62;
    ctx.strokeStyle = '#2a303b'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#f87171'; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI * 1.75, 0); ctx.stroke();
    const na = Math.PI + Math.PI * (pressure / 4);
    ctx.strokeStyle = '#f3f5f9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * (gr - 6), gy + Math.sin(na) * (gr - 6)); ctx.stroke();
    ctx.fillStyle = '#f3f5f9'; ctx.font = '700 22px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(pressure.toFixed(1) + T(' бар', ' bar'), gx - 42, gy + 34);
    // speed meter
    ctx.fillStyle = '#2a303b'; ctx.fillRect(230, 168, 200, 8);
    ctx.fillStyle = fast ? '#f87171' : '#34d399'; ctx.fillRect(230, 168, Math.min(200, 200 * speed / (limit * 1.6)), 8);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(230 + 200 / 1.6, 164, 2, 16);
    ctx.fillStyle = fast ? '#f87171' : '#9aa4b2'; ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.fillText(fast ? T('слишком быстро!', 'too fast!') : T('скорость поворота', 'turning speed'), 230, 160);
    if (fast && typeof playValveHiss === 'function' && Math.random() < 0.03) playValveHiss();
    if (turned >= need) {
      const score = 100 - (tooFast / Math.max(1, total)) * 160;
      if (score < 60) { safetyState.errors++; logAction(`VALVE_${idx + 1}_VENTED_TOO_FAST`, Date.now(), false); }
      p.finish(score, 'control', score >= 85 ? T('Давление сброшено плавно', 'Pressure vented smoothly')
        : score >= 60 ? T('Сброшено, но местами рывками', 'Vented, a bit jerky in places')
          : T('Слишком резко: выброс пара — это травма', 'Too fast: a steam blast is an injury'), done);
      return false;
    }
  });
}

// A colleague wants the lock off for a minute.
function mgColleague(done) {
  const p = mgPanel(T('Коллега подходит к щиту', 'A colleague comes to the panel'), (window.npcColleagueLine ? window.npcColleagueLine() : T('«Мне на минуту нужно питание проверить мотор. Сними замок, я быстро!»', '“I need power for a minute to test a motor. Take the lock off, I’ll be quick!”')));
  const opts = shuffle([
    { text: T('Отказать: замок снимает только тот, кто его повесил, и только после работ', 'Refuse: only the person who fitted the lock takes it off, and only after the job'), ok: true },
    { text: T('Снять замок на минуту, раз очень нужно', 'Take the lock off for a minute, since they really need it'), ok: false },
    { text: T('Отдать коллеге ключ, пусть сам решит', 'Give them the key and let them decide'), ok: false },
  ]);
  mgChoices(p, opts, (o) => {
    if (p.done) return;
    if (!o.ok) { safetyState.errors++; logAction('LOTO_REMOVED_ON_REQUEST', Date.now(), false); }
    else logAction('LOTO_KEPT_UNDER_PRESSURE', Date.now(), true);
    p.finish(o.ok ? 100 : 0, 'firmness', o.ok ? T('Замок остаётся. Так и работает LOTO', 'The lock stays. That’s how LOTO works') : T('Нарушение: под напряжением окажетесь вы', 'Violation: you would be the one under power'), done);
  });
}

// =====================================================================================
// IT
// =====================================================================================

// Alert triage: tap alerts from most to least urgent.
function mgTriage(done) {
  const p = mgPanel(T('Очередь алертов', 'Alert queue'), T('Нажмите алерты по порядку: от самого срочного к наименее срочному.', 'Tap the alerts in order, from most to least urgent.'));
  const order = [
    T('Оплата на сайте: 38% ошибок 503, клиенты не могут заплатить', 'Checkout: 38% HTTP 503, customers can’t pay'),
    T('db-01 не отвечает на ping с 10:42', 'db-01 not answering ping since 10:42'),
    T('Диск на backup-01 заполнен на 81%', 'backup-01 disk 81% full'),
    T('SSL-сертификат истекает через 21 день', 'SSL certificate expires in 21 days'),
  ];
  let next = 0, mistakes = 0;
  mgChoices(p, shuffle(order.map((text, rank) => ({ text, rank }))), (o, b) => {
    if (b.disabled || p.done) return;
    if (o.rank === next) {
      b.disabled = true;
      b.classList.add('is-right');
      b.insertAdjacentHTML('afterbegin', `<span class="mg-rank">${next + 1}</span>`);
      next++;
      if (next === 4) p.finish(100 - mistakes * 25, 'priority', mistakes ? T('Порядок собран с ошибками', 'Ordered, with some mistakes') : T('Верно: сначала то, что стоит денег и клиентов', 'Right: first what costs money and customers'), done);
    } else {
      mistakes++;
      b.classList.add('is-wrong');
      setTimeout(() => b.classList.remove('is-wrong'), 400);
      p.hint(T('Это может подождать. Что сильнее бьёт по клиентам?', 'That can wait. What hurts customers more?'), 'bad');
    }
  }, 'is-list');
}

// Root cause: logs stream in. Click the line that explains the outage (the first one, not the noise).
function mgLogs(done) {
  const p = mgPanel(T('Логи shop-api', 'shop-api logs'), T('Ошибок много, но причина одна. Нажмите строку, с которой всё началось.', 'Lots of errors, one cause. Click the line where it started.'));
  const lines = [
    ['10:41:58', 'INFO', 'GET /api/cart 200 41ms', false],
    ['10:42:03', 'INFO', 'GET /api/products 200 38ms', false],
    ['10:42:07', 'WARN', 'db pool: lost connection to db-01:5432 (No route to host)', true],
    ['10:42:07', 'ERROR', 'POST /api/checkout 503 Service Unavailable', false],
    ['10:42:08', 'ERROR', 'db pool: connect db-01:5432 failed: timeout', false],
    ['10:42:08', 'ERROR', 'POST /api/checkout 503 Service Unavailable', false],
    ['10:42:09', 'WARN', 'healthcheck /ready failed (3/3)', false],
    ['10:42:10', 'ERROR', 'GET /api/cart 503 Service Unavailable', false],
    ['10:42:11', 'ERROR', 'db pool: connect db-01:5432 failed: timeout', false],
  ];
  const log = document.createElement('div');
  log.className = 'mg-log';
  p.body.appendChild(log);
  let tries = 0, shown = 0;
  const add = () => {
    const [t, lvl, msg, cause] = lines[shown++];
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'mg-log-row';
    row.dataset.lvl = lvl;
    row.innerHTML = `<span class="mg-log-t">${t}</span><span class="mg-log-l">${lvl}</span><span></span>`;
    row.lastChild.textContent = msg;
    row.onclick = () => {
      if (p.done) return;
      tries++;
      if (cause) {
        row.classList.add('is-right');
        p.finish(tries === 1 ? 100 : tries === 2 ? 65 : 35, 'analysis', T('Причина: shop-api потерял связь с db-01. Все 503 — следствие.', 'Cause: shop-api lost its link to db-01. Every 503 follows from it.'), done);
      } else {
        row.classList.add('is-wrong');
        p.hint(lvl === 'ERROR' ? T('Это следствие. Что случилось раньше?', 'That’s a symptom. What happened before it?') : T('Здесь всё нормально', 'That line is fine'), 'bad');
      }
    };
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  };
  const timer = setInterval(() => { if (shown < lines.length) add(); else clearInterval(timer); }, 260);
  p.onCleanup(() => clearInterval(timer));
}

// Dead port: activity LEDs blink on every port except one.
function mgPorts(done) {
  const p = mgPanel(T('Сервер db-01, задняя панель', 'db-01, rear panel'), T('На рабочих портах мигает индикатор. Найдите порт без связи.', 'Working ports blink. Find the port with no link.'));
  const n = 8;
  const dead = 0; // The same eth0 connector that is unplugged in the room.
  const wrap = document.createElement('div');
  wrap.className = 'mg-ports';
  p.body.appendChild(wrap);
  let tries = 0;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mg-port' + (i === dead ? ' is-dead' : '');
    b.style.setProperty('--blink', `${rand(0.18, 0.6).toFixed(2)}s`);
    b.innerHTML = `<span class="mg-led"></span><span class="mg-led mg-led-b"></span><span class="mg-port-name">eth${i}</span>`;
    b.onclick = () => {
      if (p.done) return;
      tries++;
      if (i === dead) { b.classList.add('is-right'); p.finish(tries === 1 ? 100 : 55, 'attention', T(`eth${i}: нет линка. Кабель выпал отсюда.`, `eth${i}: no link. The cable came out here.`), done); }
      else { b.classList.add('is-wrong'); p.hint(T('Этот порт мигает — он работает', 'This port is blinking, it works'), 'bad'); }
    };
    wrap.appendChild(b);
  }
}

// Build the command from tokens. Dangerous tokens cost more.
function mgCommand(done) {
  const p = mgPanel(T('Терминал', 'Terminal'), T('Соберите команду перезапуска сервиса shop-api.', 'Build the command that restarts the shop-api service.'));
  const target = ['sudo', 'systemctl', 'restart', 'shop-api'];
  const danger = ['rm -rf', 'reboot', 'stop'];
  const line = document.createElement('div');
  line.className = 'mg-cmd';
  line.innerHTML = '<span class="mg-prompt">admin@web-01:~$</span> <span class="mg-typed"></span><span class="mg-caret"></span>';
  p.body.appendChild(line);
  const typed = line.querySelector('.mg-typed');
  let idx = 0, mistakes = 0, risky = 0;
  mgChoices(p, shuffle([...target, 'nginx', ...danger, 'status'].map((t) => ({ text: t, t }))), (o, b) => {
    if (p.done || b.disabled) return;
    if (o.t === target[idx]) {
      b.disabled = true;
      typed.textContent += (idx ? ' ' : '') + o.t;
      idx++;
      if (idx === target.length) {
        const score = 100 - mistakes * 15 - risky * 30;
        p.finish(score, 'syntax', risky ? T('Готово, но опасные команды на проде недопустимы', 'Done, but risky commands on production are not okay') : T('Команда верная, сервис перезапущен', 'Correct, the service restarts'), done);
      }
    } else {
      if (danger.includes(o.t)) risky++; else mistakes++;
      b.classList.add('is-wrong');
      setTimeout(() => b.classList.remove('is-wrong'), 400);
      p.hint(danger.includes(o.t) ? T('Опасно: это уронит сервер или удалит данные', 'Risky: that takes the server down or deletes data') : T('Не то слово на этом месте', 'Not the right word here'), 'bad');
    }
  }, 'is-tokens');
}

// =====================================================================================
// DOCTOR
// =====================================================================================

function mgHandRub(done) {
  const p = mgPanel(T('Обработка рук', 'Hand rub'), T('Нажмите этапы по порядку ВОЗ.', 'Tap the steps in the WHO order.'));
  const steps = [
    T('Ладонь о ладонь', 'Palm to palm'),
    T('Правая ладонь по тыльной стороне левой и наоборот', 'Right palm over the back of the left, and the other way'),
    T('Ладони с переплетёнными пальцами', 'Palm to palm, fingers interlaced'),
    T('Тыльная сторона пальцев о ладонь', 'Backs of fingers to the opposite palm'),
    T('Большие пальцы вращательными движениями', 'Rotational rubbing of the thumbs'),
    T('Кончики пальцев о ладонь', 'Fingertips against the palm'),
  ];
  let next = 0, mistakes = 0;
  mgChoices(p, shuffle(steps.map((text, rank) => ({ text, rank }))), (o, b) => {
    if (p.done || b.disabled) return;
    if (o.rank === next) {
      b.disabled = true; b.classList.add('is-right');
      b.insertAdjacentHTML('afterbegin', `<span class="mg-rank">${next + 1}</span>`);
      if (++next === steps.length) p.finish(100 - mistakes * 15, 'protocol', mistakes ? T('Все этапы есть, порядок сбивался', 'All steps done, order slipped') : T('Порядок ВОЗ соблюдён', 'WHO order followed'), done);
    } else {
      mistakes++;
      b.classList.add('is-wrong');
      setTimeout(() => b.classList.remove('is-wrong'), 400);
    }
  }, 'is-list');
}

// Tap along with the pulse for six seconds (pulse 96).
function mgPulse(done) {
  const p = mgPanel(T('Пульс на пульсоксиметре', 'Pulse on the oximeter'), T('Нажимайте E или кнопку на каждый удар пульса. 6 секунд.', 'Press E or the button on every beat. 6 seconds.'));
  const { ctx, w, h } = mgCanvas(p, 460, 130);
  const period = 60 / 96;
  let t = -1, hits = 0, extra = 0, beatsSeen = 0, lastBeatHit = -1;
  const tap = () => {
    if (t < 0) return;
    const k = Math.round(t / period);
    if (Math.abs(t - k * period) < 0.14 && k !== lastBeatHit) { hits++; lastBeatHit = k; }
    else extra++;
  };
  mgKeys(p, tap);
  mgButton(p, T('Удар', 'Beat'), tap);
  const trail = [];
  mgLoop(p, (dt) => {
    t += dt;
    const phase = ((t % period) + period) % period / period;
    const v = t < 0 ? 0 : Math.exp(-Math.pow((phase - 0.08) * 14, 2)) + 0.35 * Math.exp(-Math.pow((phase - 0.3) * 12, 2));
    trail.push(v);
    if (trail.length > w) trail.shift();
    beatsSeen = Math.max(0, Math.floor(t / period) + 1);
    ctx.fillStyle = '#0d1512'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.beginPath();
    trail.forEach((y, i) => { const X = i, Y = h - 24 - y * 70; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
    ctx.fillStyle = '#9ff3cf'; ctx.font = '700 14px Inter, system-ui, sans-serif';
    ctx.fillText(t < 0 ? T('Приготовьтесь…', 'Get ready…') : T(`попаданий ${hits}`, `on beat ${hits}`), 12, 20);
    if (t >= 6) {
      const score = (hits / beatsSeen) * 110 - extra * 8;
      p.finish(score, 'attention', T(`В ритм: ${hits} из ${beatsSeen} ударов. Пульс ≈ 96 в минуту`, `On beat: ${hits} of ${beatsSeen}. Pulse ≈ 96 a minute`), done);
      return false;
    }
  });
}

// Blood pressure by ear: the cuff deflates; press when the tapping starts and when it stops (125/80).
function mgBloodPressure(done) {
  const p = mgPanel(T('Давление по Короткову', 'Blood pressure by ear'), T('Манжета сдувается. Нажмите, когда услышите первый тон, и ещё раз, когда тоны исчезнут.', 'The cuff deflates. Press when the tapping starts, and again when it stops.'));
  const { ctx, w, h } = mgCanvas(p, 460, 160);
  const SYS = 125, DIA = 80;
  let mm = 170, marks = [], lastBeat = 0, flash = 0;
  const press = () => { if (marks.length < 2) marks.push(Math.round(mm)); if (marks.length === 2) finish(); };
  const finish = () => {
    if (p.done) return;
    const [s, d] = [marks[0] ?? 0, marks[1] ?? 0];
    const err = Math.abs(s - SYS) + Math.abs(d - DIA);
    p.finish(100 - err * 3, 'hearing', T(`Вы: ${s}/${d}. Верно: ${SYS}/${DIA} мм рт. ст.`, `You: ${s}/${d}. Actual: ${SYS}/${DIA} mmHg`), done);
  };
  mgKeys(p, press);
  mgButton(p, T('Слышу / тишина', 'Heard / gone'), press);
  mgLoop(p, (dt, now) => {
    mm -= dt * 9;
    const audible = mm <= SYS && mm >= DIA;
    if (audible && now - lastBeat > 625) {
      lastBeat = now; flash = 1;
      if (typeof playTone === 'function') playTone(mm > DIA + 15 ? 95 : 75, 'sine', 0.07, 0.18);
    }
    flash = Math.max(0, flash - dt * 5);
    ctx.fillStyle = '#1b1f27'; ctx.fillRect(0, 0, w, h);
    // dial
    const gx = 110, gy = 86, gr = 62;
    ctx.strokeStyle = '#2a303b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke();
    const a = -Math.PI / 2 + (mm / 300) * Math.PI * 2;
    ctx.strokeStyle = '#f3f5f9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * (gr - 8), gy + Math.sin(a) * (gr - 8)); ctx.stroke();
    ctx.fillStyle = '#f3f5f9'; ctx.font = '700 30px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(Math.round(mm), 210, 70);
    ctx.fillStyle = '#9aa4b2'; ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.fillText(T('мм рт. ст.', 'mmHg'), 212, 90);
    ctx.fillText(marks[0] ? T(`верхнее: ${marks[0]}`, `systolic: ${marks[0]}`) : T('ждём первый тон…', 'waiting for the first tap…'), 212, 120);
    if (marks[1]) ctx.fillText(T(`нижнее: ${marks[1]}`, `diastolic: ${marks[1]}`), 212, 140);
    // visual cue for players without sound
    ctx.fillStyle = `rgba(96,165,250,${flash})`; ctx.beginPath(); ctx.arc(400, 70, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9aa4b2'; ctx.fillText(T('тон', 'tap'), 388, 104);
    if (mm <= 50) { while (marks.length < 2) marks.push(Math.round(mm)); finish(); return false; }
    if (p.done) return false;
  });
}

// Auscultation: listen at six points, find the one with crackles (lower right).
function mgLungs(done) {
  const p = mgPanel(T('Аускультация', 'Listening to the lungs'), T('Послушайте все точки и выберите, где хрипы.', 'Listen at every point, then pick where the crackles are.'));
  const { c, ctx, w, h } = mgCanvas(p, 460, 200);
  // points on the back: player's view, patient's right is on the right side of the back view
  const pts = [
    { x: 175, y: 60, n: T('Верх слева', 'Upper left') }, { x: 285, y: 60, n: T('Верх справа', 'Upper right') },
    { x: 170, y: 105, n: T('Середина слева', 'Middle left') }, { x: 290, y: 105, n: T('Середина справа', 'Middle right') },
    { x: 172, y: 150, n: T('Низ слева', 'Lower left') }, { x: 288, y: 150, n: T('Низ справа', 'Lower right'), bad: true },
  ];
  let current = null, heard = new Set(), wave = [];
  c.addEventListener('click', (e) => {
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) * (w / r.width), y = (e.clientY - r.top) * (h / r.height);
    const hit = pts.find((q) => Math.hypot(q.x - x, q.y - y) < 22);
    if (hit) { current = hit; heard.add(hit); if (typeof playTone === 'function') playTone(hit.bad ? 340 : 120, hit.bad ? 'square' : 'sine', 0.05, hit.bad ? 0.25 : 0.3); }
  });
  const pick = mgChoices(p, [{ text: T('Хрипы в выбранной точке', 'Crackles at the selected point') }, { text: T('Хрипов нет нигде', 'No crackles anywhere') }], (o, b, i) => {
    if (p.done) return;
    const correct = i === 0 && current && current.bad;
    const thorough = heard.size / pts.length;
    const score = (correct ? 70 : 0) + thorough * 30;
    p.finish(score, 'diagnosis', correct ? T('Верно: влажные хрипы справа внизу — похоже на пневмонию', 'Right: crackles at the lower right — looks like pneumonia')
      : T('Хрипы были справа внизу', 'The crackles were at the lower right'), done);
  }, 'is-row');
  void pick;
  mgLoop(p, (dt, now) => {
    ctx.fillStyle = '#1b1f27'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d9b99b'; ctx.beginPath(); ctx.ellipse(230, 108, 105, 88, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(230, 30); ctx.lineTo(230, 190); ctx.stroke();
    pts.forEach((q) => {
      ctx.fillStyle = q === current ? '#60a5fa' : heard.has(q) ? 'rgba(96,165,250,0.45)' : 'rgba(17,24,39,0.55)';
      ctx.beginPath(); ctx.arc(q.x, q.y, 11, 0, Math.PI * 2); ctx.fill();
    });
    // sound trace of the current point
    const v = current ? (Math.sin(now / 260) * 0.5 + 0.5) * 18 + (current.bad && Math.random() < 0.25 ? rand(-14, 14) : 0) : 0;
    wave.push(v); if (wave.length > 90) wave.shift();
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.beginPath();
    wave.forEach((y, i) => { const X = 360 + i, Y = 120 - y; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
    ctx.fillStyle = '#9aa4b2'; ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.fillText(current ? current.n : T('нажмите точку', 'tap a point'), 360, 150);
    ctx.fillText(T(`послушано ${heard.size}/6`, `listened ${heard.size}/6`), 360, 170);
    ctx.fillText(T('вид со спины', 'back view'), 12, 190);
    if (p.done) return false;
  });
}

// =====================================================================================
// ROUTING
// =====================================================================================

const MINIGAME_BY_TITLE = [
  [/^ПОМОЛ/, mgGrind],
  [/^ЭКСТРАКЦИЯ/, mgShot],
  [/^ВЗБИВАНИЕ/, mgSteam],
  [/^ОТКРЫВАЮ АЛЕРТ/, mgTriage],
  [/^journalctl/, mgLogs],
  [/^ДИАГНОСТИКА db-01/, mgPorts],
  [/systemctl restart/, mgCommand],
  [/^ОБРАБОТКА РУК/, mgHandRub],
  [/SpO₂/, mgPulse],
  [/^ИЗМЕРЕНИЕ ДАВЛЕНИЯ/, mgBloodPressure],
  [/^АУСКУЛЬТАЦИЯ/, mgLungs],
];

// Small routine actions (opening a card, refreshing a chart) get a short automatic animation:
// not every click needs a challenge.
function quickAction(title, ms, done) {
  const host = document.getElementById('viewportWrap') || document.body;
  const el = document.createElement('div');
  el.className = 'quick-action';
  el.innerHTML = '<span></span><div class="quick-bar"><div></div></div>';
  el.firstChild.textContent = calmText(title).text;
  host.appendChild(el);
  const bar = el.querySelector('.quick-bar div');
  requestAnimationFrame(() => { bar.style.transition = `width ${Math.min(ms, 900)}ms linear`; bar.style.width = '100%'; });
  setTimeout(() => { el.remove(); done && done(); }, Math.min(ms, 900) + 60);
}

showActionProgressBar = function (title, durationMs, onFinished) {
  const hit = MINIGAME_BY_TITLE.find(([re]) => re.test(title));
  if (hit) return hit[1](onFinished);
  return quickAction(title, durationMs, onFinished);
};

// ---------- safety wiring ----------
let safetyRun = { scanned: false, colleagueDone: false };

const _startSafetyVR2 = window.startSafetyVR;
window.startSafetyVR = function (...args) {
  fitReset('safety');
  safetyRun = { scanned: false, colleagueDone: false };
  const r = _startSafetyVR2.apply(this, args);
  return r;
};
// the hazard scan runs when the player first acts in the room
const _handleSafety2 = handleSafetyInteraction;
handleSafetyInteraction = function (targetName) {
  if (isActionInProgress || mgActive) return;
  if (!safetyRun.scanned) {
    safetyRun.scanned = true;
    isActionInProgress = true;
    mgHazardScan(() => { isActionInProgress = false; _handleSafety2(targetName); });
    return;
  }
  _handleSafety2(targetName);
};

const _testVoltage2 = testVoltageWithMultimeter;
testVoltageWithMultimeter = function () {
  if (isActionInProgress || mgActive) return;
  if (safetyState.powerState === 'ON' || !safetyState.ppeEquipped || !safetyState.lockoutApplied) return _testVoltage2();
  isActionInProgress = true;
  mgVoltage((result) => {
    isActionInProgress = false;
    if (result === 'fault') {
      showGuideToast(T('Мастер снял питание на вводе. Повторите проверку.', 'The supervisor cut power at the supply. Test again.'));
      return;
    }
    _testVoltage2();
  });
};

const _operateValve2 = operateValve;
operateValve = function (idx) {
  if (isActionInProgress || mgActive) return;
  if (safetyState.valvesOpened[idx]) return _operateValve2(idx);
  if (!canOperateScenarioValve()) return;
  isActionInProgress = true;
  mgValve(idx, () => { isActionInProgress = false; _operateValve2(idx); });
};

const _applyLotoLock2 = applyLotoLock;
applyLotoLock = function () {
  const wasLocked = safetyState.lockoutApplied;
  const r = _applyLotoLock2();
  if (!wasLocked && safetyState.lockoutApplied && !safetyRun.colleagueDone) {
    safetyRun.colleagueDone = true;
    setTimeout(() => {
      if (safetyState.completed || mgActive) { safetyRun.colleagueDone = false; return; }
      isActionInProgress = true;
      mgColleague(() => { isActionInProgress = false; });
    }, 2200);
  }
  return r;
};

// reset the profile when a module starts
const _startScenarioMg = window.startScenario;
window.startScenario = function (id, ...rest) { fitReset(id); return _startScenarioMg.call(this, id, ...rest); };
const _startBaristaMg = window.startBaristaVR;
window.startBaristaVR = function (...args) { fitReset('barista'); return _startBaristaMg.apply(this, args); };

// ---------- fit profile on the report ----------
function renderFitProfile() {
  const traits = FIT_TRAITS()[fit.module];
  const grid = document.querySelector('#resultScreen .result-grid-layout');
  if (!traits || !grid) return;
  document.getElementById('fitProfileCard')?.remove();
  const scored = Object.keys(traits).filter((k) => fit.scores[k] !== undefined);
  if (!scored.length) return;
  const card = document.createElement('div');
  card.id = 'fitProfileCard';
  card.className = 'report-card fit-card';
  const summary = T('Ваши результаты в мини-играх отражают действия в этом прохождении.', 'These minigame results describe this run.');
  card.innerHTML = `<h3 class="fit-title"></h3><p class="fit-sub"></p><div class="fit-rows"></div><p class="fit-summary"></p>`;
  card.querySelector('.fit-title').textContent = T('Что требует профессия и как у вас вышло', 'What this job asks for, and how you did');
  card.querySelector('.fit-sub').textContent = T('По мини-играм: каждая — упрощённая версия реального навыка.', 'From the mini-games: each is a simplified real skill.');
  card.querySelector('.fit-summary').textContent = summary;
  const rows = card.querySelector('.fit-rows');
  Object.keys(traits).forEach((k) => {
    const s = fit.scores[k];
    const row = document.createElement('div');
    row.className = 'fit-row';
    row.innerHTML = `<div class="fit-row-head"><b></b><span></span></div><div class="fit-bar"><div></div></div><small></small>`;
    row.querySelector('b').textContent = traits[k][0];
    row.querySelector('span').textContent = s === undefined ? '—' : s;
    row.querySelector('small').textContent = traits[k][1];
    const bar = row.querySelector('.fit-bar div');
    bar.style.width = (s || 0) + '%';
    bar.dataset.tone = s === undefined ? '' : s >= 80 ? 'ok' : s >= 60 ? 'mid' : 'bad';
    rows.appendChild(row);
  });
  grid.appendChild(card);
}

const _showScreenMg = window.showScreen || showScreen;
showScreen = function (id, ...rest) {
  const r = _showScreenMg.call(this, id, ...rest);
  if (id === 'resultScreen') setTimeout(renderFitProfile, 0);
  return r;
};
window.showScreen = showScreen;
