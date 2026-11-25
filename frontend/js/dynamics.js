// SynapKor — dynamic, adaptive gameplay on top of the modules.
//
// 1. Skill checks: every hands-on action (grinding, measuring, restarting a service…) is a short
//    timing challenge instead of a bar that fills by itself. Stop the marker inside the zone.
// 2. Adaptive difficulty: doing well narrows the zone, speeds the marker up, shortens decision
//    time and trims the guide to the task only; mistakes widen the zone and bring full help back.
// 3. Timed decisions: answers have a countdown. Running out of time doesn't pick an answer for
//    you, but it counts as a slip.
// 4. Interruptions: in IT and Doctor a realistic interruption arrives at a random step and needs a
//    quick call.
// 5. Calm text: all-caps shouting becomes sentence case and "+XP" moves into a small badge.
// Loaded last, after every module, so it can wrap their functions.

// ---------- adaptive level ----------
const adapt = {
  level: 1, // 0.7 (needs help) … 1.6 (confident)
  lastMisclicks: 0,
  up(by) { this.set(this.level + by); },
  down(by) { this.set(this.level - by); },
  set(v) {
    this.level = Math.max(0.7, Math.min(1.6, Math.round(v * 100) / 100));
    const game = document.getElementById('gameScreen');
    if (!game) return;
    game.classList.toggle('guide-minimal', this.level >= 1.3);
    if (this.level <= 0.8 && typeof setGuideVisible === 'function') setGuideVisible(true);
  },
  reset() {
    this.lastMisclicks = 0;
    this.set(1);
  },
};

// Any new mistake counted by a module (wrong object, safety violation…) lowers the level.
setInterval(() => {
  if (typeof state === 'undefined') return;
  if (state.misclicks > adapt.lastMisclicks) adapt.down(0.12 * (state.misclicks - adapt.lastMisclicks));
  adapt.lastMisclicks = state.misclicks;
}, 400);

// ---------- calm text ----------
const KEEP_UPPER = /^(LOTO|СИЗ|ТБ|ЕНТ|ЕКЦ|HTTP|OK|SpO₂|SPO₂|IT|AI|ИИ|XP|RMS|POS|DB-01|ETH0|E|H|W|PPE|BP|АД|CPU|UI)$/i;
function calmText(raw) {
  if (!raw) return { text: '', xp: '' };
  let text = typeof trRu === 'function' ? trRu(String(raw).trim()) : String(raw).trim();
  let xp = '';
  text = text.replace(/\s*\+(\d+)\s*XP\b/i, (_, n) => { xp = `+${n} XP`; return ''; });
  text = text.replace(/^[^\p{L}\p{N}«“"(\[]+/u, '');        // leading emoji / symbols
  text = text.replace(/\.\.\.$/, '…').replace(/!+$/, '').trim();
  const letters = text.replace(/[^\p{L}]/gu, '');
  const upper = letters.replace(/[^\p{Lu}]/gu, '');
  if (letters.length > 6 && upper.length / letters.length > 0.7) {
    text = text
      .split(/(\s+)/)
      .map((w) => (KEEP_UPPER.test(w.replace(/[^\p{L}\p{N}₂-]/gu, '')) ? w : w.toLowerCase()))
      .join('');
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return { text, xp };
}

function showComboPopup(raw) {
  const el = document.getElementById('comboPopup');
  if (!el) return;
  const { text, xp } = calmText(raw);
  el.innerHTML = '';
  const t = document.createElement('span');
  t.textContent = text;
  el.appendChild(t);
  if (xp) {
    const b = document.createElement('span');
    b.className = 'xp-badge';
    b.textContent = xp;
    el.appendChild(b);
  }
  el.classList.add('active');
  clearTimeout(showComboPopup.timer);
  showComboPopup.timer = runLater(() => el.classList.remove('active'), 1600);
}

// ---------- skill check (replaces the self-filling progress bar) ----------
let skillCheckActive = null;
const skillStats = { perfect: 0, good: 0, miss: 0 };

function showActionProgressBar(title, durationMs, onFinished) {
  const host = document.getElementById('viewportWrap') || document.getElementById('gameScreen') || document.body;
  if (skillCheckActive) skillCheckActive.close();

  const zoneWidth = Math.max(10, Math.min(34, 24 / adapt.level));      // % of the bar
  const period = Math.max(650, Math.min(1900, (900 + durationMs * 0.35) / adapt.level)); // ms per sweep
  let zoneStart = 12 + Math.random() * (76 - zoneWidth);
  let misses = 0;
  let pos = 0;
  let dir = 1;
  let last = performance.now();
  let raf = 0;
  let locked = false;

  const { text } = calmText(title);
  const box = document.createElement('div');
  box.className = 'skill-check';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', text);
  box.innerHTML = `
    <div class="skill-title"></div>
    <div class="skill-track"><div class="skill-zone"><div class="skill-sweet"></div></div><div class="skill-marker"></div></div>
    <div class="skill-row">
      <span class="skill-hint">Остановите метку в зелёной зоне: E, пробел или кнопка</span>
      <button type="button" class="skill-btn">Стоп</button>
    </div>`;
  box.querySelector('.skill-title').textContent = text;
  host.appendChild(box);
  const zoneEl = box.querySelector('.skill-zone');
  const marker = box.querySelector('.skill-marker');
  const hint = box.querySelector('.skill-hint');
  const placeZone = () => {
    zoneEl.style.left = zoneStart + '%';
    zoneEl.style.width = zoneWidth + '%';
  };
  placeZone();

  const tick = (now) => {
    const dt = now - last;
    last = now;
    if (!locked) {
      pos += (dir * 100 * dt) / period;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      marker.style.left = pos + '%';
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const record = (quality) => {
    skillStats[quality]++;
    if (typeof sessionEvents !== 'undefined') {
      const t = typeof sessionStartedAt !== 'undefined' ? Math.round((Date.now() - sessionStartedAt) / 100) / 10 : 0;
      sessionEvents.push({ t, action: `SKILL_${quality.toUpperCase()}`, ok: quality !== 'miss' });
    }
  };

  const stop = () => {
    if (locked) return;
    const inZone = pos >= zoneStart && pos <= zoneStart + zoneWidth;
    if (inZone) {
      locked = true;
      const centre = zoneStart + zoneWidth / 2;
      const perfect = Math.abs(pos - centre) <= zoneWidth / 6;
      record(perfect ? 'perfect' : 'good');
      adapt.up(perfect ? 0.08 : 0.03);
      box.classList.add(perfect ? 'is-perfect' : 'is-good');
      hint.textContent = perfect ? 'Идеально' : 'Хорошо';
      if (typeof playTone === 'function') playTone(perfect ? 880 : 660, 'sine', 0.12, 0.08);
      runLater(() => { close(); if (onFinished) onFinished(); }, 380);
      return;
    }
    misses++;
    record('miss');
    adapt.down(0.1);
    if (typeof state !== 'undefined') { state.misclicks++; adapt.lastMisclicks = state.misclicks; }
    box.classList.remove('is-shake');
    void box.offsetWidth;
    box.classList.add('is-shake');
    if (typeof playTone === 'function') playTone(170, 'sawtooth', 0.18, 0.08);
    if (misses >= 3) {
      // never block progress: after three misses the action completes, the misses still count
      locked = true;
      hint.textContent = 'Засчитано с ошибками';
      runLater(() => { close(); if (onFinished) onFinished(); }, 600);
      return;
    }
    hint.textContent = 'Мимо, попробуйте ещё раз';
    zoneStart = 12 + Math.random() * (76 - zoneWidth);
    placeZone();
  };

  const onKey = (e) => {
    if (['KeyE', 'Space', 'Enter'].includes(e.code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) stop();
    }
  };
  const onTap = (e) => {
    e.preventDefault();
    e.stopPropagation();
    stop();
  };
  window.addEventListener('keydown', onKey, true);
  box.querySelector('.skill-btn').addEventListener('pointerdown', onTap);
  const mobileBtn = document.getElementById('mobileActionTrigger');
  if (mobileBtn) mobileBtn.addEventListener('pointerdown', onTap, true);

  function close() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
    if (mobileBtn) mobileBtn.removeEventListener('pointerdown', onTap, true);
    box.remove();
    skillCheckActive = null;
  }
  skillCheckActive = { close };
}

// ---------- timed decisions and interruptions (scenario modules: IT, Doctor) ----------
const INTERRUPTS = {
  it: {
    who: 'Руководитель магазина звонит:',
    text: '«Сайт до сих пор лежит? Сколько ещё ждать?»',
    options: [
      { text: '«Причину нашёл, чиню. Напишу через 5 минут»', ok: true },
      { text: 'Сбросить звонок и молча продолжить', ok: false },
      { text: 'Подробно рассказать про логи и eth0', ok: false },
    ],
  },
  doctor: {
    who: 'Медсестра заглядывает в кабинет:',
    text: '«Доктор, в коридоре пациенту стало плохо!»',
    options: [
      { text: 'Попросить вызвать дежурного врача и вернуться к осмотру', ok: true },
      { text: 'Сказать «я занят» и продолжить', ok: false },
      { text: 'Уйти, оставив пациента без объяснений', ok: false },
    ],
  },
};
let interruptAt = -1;
let decisionTimer = 0;

function secondsFor(base) {
  return Math.round(Math.max(15, Math.min(50, base / adapt.level)));
}

function showInterrupt(def) {
  const data = INTERRUPTS[def.id];
  if (!data) return;
  isActionInProgress = true;
  const host = document.getElementById('viewportWrap') || document.body;
  const total = secondsFor(12);
  const box = document.createElement('div');
  box.className = 'interrupt-card';
  box.setAttribute('role', 'alertdialog');
  box.innerHTML = `
    <div class="interrupt-head"><span class="interrupt-dot"></span><span class="interrupt-who"></span></div>
    <p class="interrupt-text"></p>
    <div class="interrupt-options"></div>
    <div class="countdown"><div class="countdown-fill"></div></div>`;
  box.querySelector('.interrupt-who').textContent = data.who;
  box.querySelector('.interrupt-text').textContent = data.text;
  const opts = box.querySelector('.interrupt-options');
  const shuffled = [...data.options].sort(() => Math.random() - 0.5);
  let done = false;
  const finish = (opt, timedOut) => {
    if (done) return;
    done = true;
    clearInterval(timer);
    unregister();
    window.removeEventListener('keydown', onKey, true);
    const ok = !!(opt && opt.ok);
    if (!ok) { state.misclicks++; adapt.lastMisclicks = state.misclicks; adapt.down(0.1); } else adapt.up(0.05);
    sessionEvents.push({ t: scenarioNow(), action: timedOut ? 'INTERRUPT_TIMEOUT' : ok ? 'INTERRUPT_HANDLED' : 'INTERRUPT_POOR', ok });
    showGuideToast(timedOut ? 'Время вышло: на звонок никто не ответил' : ok ? 'Хорошо: коротко, по делу, работа продолжается' : 'Так делать не стоит: это засчитано как ошибка');
    box.remove();
    runLater(() => { isActionInProgress = false; }, 200);
  };
  shuffled.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'interrupt-option';
    b.innerHTML = `<span class="dialog-tag">${i + 1}</span><span></span>`;
    b.lastChild.textContent = o.text;
    b.onclick = () => finish(o, false);
    opts.appendChild(b);
  });
  const onKey = (e) => {
    const n = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
    if (n !== undefined && shuffled[n]) { e.stopImmediatePropagation(); finish(shuffled[n], false); }
  };
  window.addEventListener('keydown', onKey, true);
  const unregister = onRunEnd(() => window.removeEventListener('keydown', onKey, true));
  host.appendChild(box);
  if (typeof playTone === 'function') playTone(740, 'square', 0.12, 0.06);
  const started = Date.now();
  const fill = box.querySelector('.countdown-fill');
  const timer = runEvery(() => {
    const left = 1 - (Date.now() - started) / (total * 1000);
    fill.style.width = Math.max(0, left * 100) + '%';
    box.classList.toggle('is-urgent', left < 0.3);
    if (left <= 0) finish(null, true);
  }, 100);
}

// wrap the scenario engine
const _startScenario = startScenario;
startScenario = function (id) {
  adapt.reset();
  Object.assign(skillStats, { perfect: 0, good: 0, miss: 0 });
  const def = SCENARIOS[id];
  interruptAt = def && INTERRUPTS[id] ? 1 + Math.floor(Math.random() * Math.max(1, def.steps.length - 2)) : -1;
  return _startScenario(id);
};
window.startScenario = startScenario;

const _handleScenarioClick = handleScenarioClick;
handleScenarioClick = function (name) {
  const before = scenarioState.step;
  _handleScenarioClick(name);
  // the step finishes asynchronously (after the skill check); watch for it
  if (interruptAt < 0) return;
  const def = getActiveScenario();
  const watch = runEvery(() => {
    if (scenarioState.step !== before || scenarioState.phase !== 'steps') {
      clearInterval(watch);
      if (scenarioState.step === interruptAt && scenarioState.phase === 'steps' && def) {
        interruptAt = -1;
        runLater(function waitForAvailableInput() {
          if (scenarioState.phase !== 'steps') return;
          if (isActionInProgress) runLater(waitForAvailableInput, 150);
          else showInterrupt(def);
        }, 700);
      }
    }
  }, 150);
  runLater(() => clearInterval(watch), 15000);
};

const _startScenarioDecision = startScenarioDecision;
startScenarioDecision = function (idx) {
  _startScenarioDecision(idx);
  clearInterval(decisionTimer);
  const hud = document.getElementById('hudDockInner');
  if (!hud) return;
  const total = secondsFor(35);
  const bar = document.createElement('div');
  bar.className = 'decision-timer';
  bar.innerHTML = '<div class="countdown"><div class="countdown-fill"></div></div><span class="decision-timer-text"></span>';
  hud.prepend(bar);
  const fill = bar.querySelector('.countdown-fill');
  const label = bar.querySelector('.decision-timer-text');
  const started = Date.now();
  let late = false;
  decisionTimer = runEvery(() => {
    const leftSec = total - (Date.now() - started) / 1000;
    fill.style.width = Math.max(0, (leftSec / total) * 100) + '%';
    bar.classList.toggle('is-urgent', leftSec < total * 0.3);
    label.textContent = leftSec > 0 ? `${Math.ceil(leftSec)} с` : 'Время вышло';
    if (leftSec <= 0 && !late) {
      late = true;
      state.misclicks++;
      adapt.lastMisclicks = state.misclicks;
      sessionEvents.push({ t: scenarioNow(), action: 'DECISION_TIMEOUT', ok: false });
      showGuideToast('Время вышло. Ответьте как можно скорее: задержка засчитана');
    }
  }, 200);
};

const _answerScenarioDecision = answerScenarioDecision;
answerScenarioDecision = function (optionId) {
  clearInterval(decisionTimer);
  return _answerScenarioDecision(optionId);
};
window.answerScenarioDecision = answerScenarioDecision;

// barista and safety start through their own functions: reset the level there too
['startBaristaVR', 'startSafetyVR'].forEach((fn) => {
  if (typeof window[fn] !== 'function') return;
  const orig = window[fn];
  window[fn] = function (...args) {
    adapt.reset();
    Object.assign(skillStats, { perfect: 0, good: 0, miss: 0 });
    return orig.apply(this, args);
  };
});

// ---------- translations for the new text ----------
if (typeof EN !== 'undefined') Object.assign(EN, {
  'Остановите метку в зелёной зоне: E, пробел или кнопка': 'Stop the marker in the green zone: E, Space or the button',
  'Стоп': 'Stop',
  'Идеально': 'Perfect',
  'Хорошо': 'Good',
  'Мимо, попробуйте ещё раз': 'Missed, try again',
  'Засчитано с ошибками': 'Done, with mistakes',
  'Руководитель магазина звонит:': 'The store manager is calling:',
  '«Сайт до сих пор лежит? Сколько ещё ждать?»': '“Is the site still down? How much longer?”',
  '«Причину нашёл, чиню. Напишу через 5 минут»': '“Found the cause, fixing it. I’ll update you in 5 minutes.”',
  'Сбросить звонок и молча продолжить': 'Decline the call and carry on',
  'Подробно рассказать про логи и eth0': 'Explain the logs and eth0 in detail',
  'Медсестра заглядывает в кабинет:': 'A nurse looks into the room:',
  '«Доктор, в коридоре пациенту стало плохо!»': '“Doctor, a patient in the corridor has collapsed!”',
  'Попросить вызвать дежурного врача и вернуться к осмотру': 'Ask her to call the doctor on duty and continue the examination',
  'Сказать «я занят» и продолжить': 'Say “I’m busy” and carry on',
  'Уйти, оставив пациента без объяснений': 'Leave without a word to your patient',
  'Время вышло: на звонок никто не ответил': 'Time’s up: nobody answered',
  'Хорошо: коротко, по делу, работа продолжается': 'Good: short, to the point, and the work goes on',
  'Так делать не стоит: это засчитано как ошибка': 'Not the best call: counted as a mistake',
  'Время вышло': 'Time’s up',
  'Время вышло. Ответьте как можно скорее: задержка засчитана': 'Time’s up. Answer as soon as you can: the delay is counted',
});
if (typeof EN_PATTERNS !== 'undefined') EN_PATTERNS.push([/^(\d+) с$/, (m) => `${m[1]} s`]);
if (typeof KK !== 'undefined') Object.assign(KK, {
  'Остановите метку в зелёной зоне: E, пробел или кнопка': 'Белгіні жасыл аймақта тоқтатыңыз: E, бос орын немесе батырма',
  'Стоп': 'Тоқта',
  'Идеально': 'Керемет',
  'Хорошо': 'Жақсы',
  'Мимо, попробуйте ещё раз': 'Қате, тағы көріңіз',
  'Засчитано с ошибками': 'Қателермен есептелді',
  'Время вышло': 'Уақыт бітті',
});

// ---------- calm the shouting titles and alerts as modules write them ----------
(function calmLiveText() {
  const ids = ['vrQuestTitle', 'safetyAlertText', 'guideToast', 'tooltipText', 'victoryTitle'];
  const fix = (el) => {
    const raw = el.textContent;
    if (!raw || !/\p{L}/u.test(raw)) return;
    const { text } = calmText(raw);
    if (text && text !== raw) el.textContent = text;
  };
  const start = () => {
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      fix(el);
      new MutationObserver(() => fix(el)).observe(el, { childList: true, characterData: true, subtree: true });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
