// SynapKor — the people in the simulations, played by one scanned 3D man (models/walker.fbx,
// Renderpeople "Nathan" via rigmodels.com, free for students' personal use).
//
// Who appears where, only when the story needs them:
//   Barista: the customer walks up to the counter, watches you make his latte, then complains
//            about what actually went wrong (sour shot, flat foam, slow service…) and reacts to your answer.
//   Doctor:  the patient sits on the couch for the whole exam, coughs, reacts to how you examine him,
//            and is calmer or more worried in the final talk depending on how it went.
//   IT:      the store manager walks in for the final talk; his tone depends on how long the site was down.
//   Safety:  a colleague walks up after you fit the lock; what he says depends on the violations he saw.
// He has a mood (0 angry … 1 happy) that your mistakes and good work move, shown on his name tag,
// in speech bubbles, nods and head shakes.

const NPC = {
  src: null, loading: null, obj: null, mixer: null, walk: null, rest: null, bones: {},
  state: 'hidden', target: null, onArrive: null, pose: 'stand', faceYaw: null,
  mood: 0.7, role: '', module: null, gesture: null, tag: null, bubble: null, bubbleUntil: 0,
  seen: { misclicks: 0, slowWarned: false, coughAt: 0 },
};

const NPC_BONE = (n) => 'rp_nathan_animated_003_walking_' + n;

function npcLoad() {
  if (NPC.loading) return NPC.loading;
  NPC.loading = new Promise((resolve, reject) => {
    if (!THREE.FBXLoader) { reject(new Error('FBXLoader missing')); return; }
    new THREE.FBXLoader().load('models/walker.fbx', (obj) => {
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true; o.userData.gfxDone = true; o.frustumCulled = false;
          o.raycast = () => {};   // never blocks clicks on the equipment behind him
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            if (m.map) m.map.encoding = THREE.sRGBEncoding;
            if (m.shininess !== undefined) m.shininess = 8;
          });
        }
      });
      // in-place walk: keep the hips' height, drop their forward travel
      obj.animations.forEach((clip) => clip.tracks.forEach((t) => {
        if (/(hip|root).*\.position$/i.test(t.name)) {
          for (let i = 0; i < t.values.length; i += 3) { t.values[i] = t.values[0]; t.values[i + 2] = t.values[2]; }
        }
      }));
      // rest pose, height and scale, before any animation runs
      const rest = new Map();
      obj.traverse((b) => { if (b.isBone) rest.set(b, { p: b.position.clone(), q: b.quaternion.clone() }); });
      const box = new THREE.Box3().setFromObject(obj);
      obj.userData.baseScale = 1.78 / ((box.max.y - box.min.y) || 180);
      obj.scale.setScalar(obj.userData.baseScale);
      ['hip', 'spine_02', 'neck', 'head', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r',
        'upperleg_l', 'upperleg_r', 'lowerleg_l', 'lowerleg_r'].forEach((n) => { NPC.bones[n] = obj.getObjectByName(NPC_BONE(n)); });
      NPC.src = obj;
      NPC.rest = rest;
      NPC.mixer = new THREE.AnimationMixer(obj);
      NPC.walk = obj.animations[0] ? NPC.mixer.clipAction(obj.animations[0]) : null;
      resolve(obj);
    }, undefined, reject);
  });
  return NPC.loading;
}

// ---------------------------------------------------------------- poses
function npcRestPose() {
  NPC.rest.forEach((r, b) => { b.position.copy(r.p); b.quaternion.copy(r.q); });
}

// Found by eye on this skeleton: bones run along local X, so Z bends a limb forward
// and Y swings an arm down from the T-pose.
function npcApplyPose(pose) {
  NPC.pose = pose;
  if (NPC.walk) NPC.walk.stop();
  npcRestPose();
  const B = NPC.bones;
  B.upperarm_l.rotation.y += 1.25; B.upperarm_r.rotation.y += 1.25;
  if (pose === 'sit') {
    B.upperleg_l.rotation.z += 1.5; B.upperleg_r.rotation.z += 1.5;
    B.lowerleg_l.rotation.z -= 1.5; B.lowerleg_r.rotation.z -= 1.5;
    B.upperarm_l.rotation.z += 0.35; B.upperarm_r.rotation.z += 0.35;
    B.lowerarm_l.rotation.z += 1.0; B.lowerarm_r.rotation.z += 1.0;
  } else {
    B.upperarm_l.rotation.z += 0.08; B.upperarm_r.rotation.z += 0.08;
    B.lowerarm_l.rotation.z += 0.25; B.lowerarm_r.rotation.z += 0.25;
  }
  ['neck', 'spine_02'].forEach((n) => { NPC.bones[n].userData.base = NPC.bones[n].rotation.clone(); });
}

// ---------------------------------------------------------------- show, walk, leave
async function npcShow(module, opts) {
  const runId = scenarioState.runId;
  try {
    await npcLoad();
  } catch (e) {
    console.warn('[npc] model not loaded, keeping the simple figure', e);
    return false;
  }
  if (!scene || module !== currentProfession || !isScenarioRunActive(runId)) return false;
  const o = NPC.src;
  NPC.obj = o;
  NPC.module = module;
  NPC.role = opts.role;
  if (opts.mood !== undefined) NPC.mood = opts.mood;
  scene.add(o);
  o.visible = true;
  NPC.faceYaw = opts.faceYaw ?? null;
  if (opts.sit) {
    npcApplyPose('sit');
    o.position.set(opts.at[0], opts.sitY ?? -0.45, opts.at[1]);
    o.rotation.y = opts.faceYaw || 0;
    NPC.state = 'idle';
  } else if (opts.from) {
    o.position.set(opts.from[0], 0, opts.from[1]);
    npcWalkTo(opts.at, opts.onArrive);
  } else {
    npcApplyPose('stand');
    o.position.set(opts.at[0], 0, opts.at[1]);
    NPC.state = 'idle';
  }
  npcTag();
  return true;
}

function npcWalkTo(at, onArrive) {
  if (!NPC.obj) return;
  npcRestPose();
  NPC.pose = 'walk';
  if (NPC.walk) { NPC.walk.reset(); NPC.walk.play(); }
  NPC.state = 'walking';
  NPC.target = new THREE.Vector3(at[0], 0, at[1]);
  NPC.onArrive = onArrive || null;
}

function npcLeave(to) {
  if (!NPC.obj) return;
  npcWalkTo(to, () => npcHide());
}

function npcHide() {
  if (NPC.obj && NPC.obj.parent) NPC.obj.parent.remove(NPC.obj);
  NPC.state = 'hidden';
  NPC.module = null;
  if (NPC.tag) NPC.tag.style.display = 'none';
  if (NPC.bubble) NPC.bubble.style.display = 'none';
}

// ---------------------------------------------------------------- talking and mood
function npcMoodWord() {
  const m = NPC.mood;
  if (m >= 0.75) return [T('доволен', 'happy'), 'ok'];
  if (m >= 0.5) return [T('спокоен', 'calm'), 'mid'];
  if (m >= 0.3) return [T('недоволен', 'annoyed'), 'warn'];
  return [T('злится', 'angry'), 'bad'];
}

function npcEl(cls) {
  const host = document.getElementById('viewportWrap') || document.body;
  const el = document.createElement('div');
  el.className = cls;
  host.appendChild(el);
  return el;
}

function npcTag() {
  if (!NPC.tag) NPC.tag = npcEl('npc-tag');
  const [word, tone] = npcMoodWord();
  NPC.tag.innerHTML = '<span class="npc-dot"></span><b></b><span class="npc-mood"></span>';
  NPC.tag.querySelector('b').textContent = NPC.role;
  NPC.tag.querySelector('.npc-mood').textContent = word;
  NPC.tag.dataset.tone = tone;
  NPC.tag.style.display = '';
}

function npcSay(text, ms = 4200) {
  if (NPC.state === 'hidden') return;
  if (!NPC.bubble) NPC.bubble = npcEl('npc-bubble');
  NPC.bubble.textContent = text;
  NPC.bubble.style.display = '';
  NPC.bubbleUntil = performance.now() + ms;
}

function npcMood(delta, gesture) {
  NPC.mood = Math.max(0, Math.min(1, NPC.mood + delta));
  if (gesture) NPC.gesture = { kind: gesture, t: 0 };
  npcTag();
}

// ---------------------------------------------------------------- per-frame update
const _npcV = new THREE.Vector3();
let npcLast = performance.now();
function npcTick() {
  requestAnimationFrame(npcTick);
  const now = performance.now();
  const dt = Math.min(0.1, (now - npcLast) / 1000);
  npcLast = now;
  const o = NPC.obj;
  if (!o || NPC.state === 'hidden' || !o.parent) return;
  const game = document.getElementById('gameScreen');
  const active = game && game.classList.contains('active');
  if (NPC.tag) NPC.tag.style.visibility = active ? '' : 'hidden';
  if (NPC.bubble) NPC.bubble.style.visibility = active ? '' : 'hidden';
  if (!active) return;

  if (NPC.state === 'walking' && NPC.target) {
    NPC.mixer.update(dt);
    _npcV.subVectors(NPC.target, o.position);
    _npcV.y = 0;
    const d = _npcV.length();
    const step = 1.15 * dt;
    const yaw = Math.atan2(_npcV.x, _npcV.z);
    o.rotation.y += (((yaw - o.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 8);
    if (d <= step) {
      o.position.copy(NPC.target);
      NPC.state = 'idle';
      npcApplyPose('stand');
      const cb = NPC.onArrive;
      NPC.onArrive = null;
      if (cb) cb();
    } else {
      o.position.addScaledVector(_npcV.normalize(), step);
    }
  } else if (NPC.state === 'idle') {
    // standing people turn to face you; seated ones keep their seat
    if (NPC.pose === 'stand' && typeof camera !== 'undefined') {
      const yaw = NPC.faceYaw ?? Math.atan2(camera.position.x - o.position.x, camera.position.z - o.position.z);
      o.rotation.y += (((yaw - o.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 3);
    }
    // breathing, plus a nod or a head shake
    const t = now / 1000;
    const spine = NPC.bones.spine_02, neck = NPC.bones.neck;
    if (spine && spine.userData.base) spine.rotation.z = spine.userData.base.z + Math.sin(t * 1.6) * 0.015 - (1 - NPC.mood) * 0.05;
    if (neck && neck.userData.base) {
      let nod = 0, shake = 0;
      const g = NPC.gesture;
      if (g) {
        g.t += dt;
        const k = Math.sin(g.t * 14) * Math.max(0, 1 - g.t / 1.1);
        if (g.kind === 'nod') nod = k * 0.18; else shake = k * 0.3;
        if (g.t > 1.1) NPC.gesture = null;
      }
      neck.rotation.x = neck.userData.base.x + shake;
      neck.rotation.z = neck.userData.base.z + nod;
    }
  }

  // name tag and bubble follow the head
  const head = NPC.bones.head;
  if (head && typeof camera !== 'undefined') {
    head.getWorldPosition(_npcV);
    _npcV.y += 0.3;
    _npcV.project(camera);
    const wrap = document.getElementById('viewportWrap');
    const visible = _npcV.z < 1 && Math.abs(_npcV.x) < 1.1 && Math.abs(_npcV.y) < 1.1;
    const x = (_npcV.x * 0.5 + 0.5) * (wrap ? wrap.clientWidth : innerWidth);
    const y = (-_npcV.y * 0.5 + 0.5) * (wrap ? wrap.clientHeight : innerHeight);
    if (NPC.tag) { NPC.tag.style.left = x + 'px'; NPC.tag.style.top = y + 'px'; NPC.tag.style.opacity = visible ? 1 : 0; }
    if (NPC.bubble) {
      const show = now < NPC.bubbleUntil;
      NPC.bubble.style.display = show ? '' : 'none';
      NPC.bubble.style.left = x + 'px';
      NPC.bubble.style.top = (y - 30) + 'px';
      NPC.bubble.style.opacity = visible ? 1 : 0;
    }
  }
}
requestAnimationFrame(npcTick);

// hide the old block figures once the real person is in the room
function npcHidePlaceholder(obj) {
  if (!obj) return;
  obj.traverse((c) => { if (c !== obj && c.isMesh) c.visible = false; });
}

// =====================================================================================
// BARISTA: the customer
// =====================================================================================
const CAFE_DOOR = [3.6, -2.2], CAFE_COUNTER = [1.0, -2.05];
const cafe = { issues: [], startedAt: 0 };

function cafeCustomerArrive() {
  cafe.issues = [];
  cafe.startedAt = Date.now();
  NPC.seen.misclicks = typeof state !== 'undefined' ? state.misclicks : 0;
  NPC.seen.slowWarned = false;
  npcShow('barista', {
    role: T('Клиент', 'Customer'), mood: 0.7, from: CAFE_DOOR, at: CAFE_COUNTER,
    onArrive: () => npcSay(T('Здравствуйте! Айс-латте на овсяном, пожалуйста. Без сахара.', 'Hi! An iced oat latte, please. No sugar.'), 5000),
  }).then((ok) => { if (ok) npcHidePlaceholder(customerObj); });
}

// what he noticed while you worked
const CAFE_REACT = () => ({
  precision: [T('Вы кофе вообще взвешиваете?', 'Do you actually weigh the coffee?'), 'watery'],
  timing: [T('Хм, пахнет как-то… горьковато.', 'Hmm, that smells… a bit off.'), 'taste'],
  feel: [T('Молоко так шипит… это нормально?', 'The milk is screeching… is that normal?'), 'foam'],
});

function cafeOnSkill(trait, score) {
  if (NPC.module !== 'barista' || NPC.state === 'hidden') return;
  if (score >= 85) {
    npcMood(0.06, 'nod');
    if (Math.random() < 0.5) npcSay(T('О, ловко у вас получается.', 'Oh, you’re good at this.'), 2600);
  } else if (score < 60 && CAFE_REACT()[trait]) {
    npcMood(-0.15, 'shake');
    const r = CAFE_REACT()[trait];
    npcSay(r[0]);
    cafe.issues.push(r[1]);
  }
}

function cafeWatch() {
  if (NPC.module !== 'barista' || NPC.state !== 'idle' || typeof state === 'undefined' || state.quest !== 1) return;
  if (state.misclicks >= NPC.seen.misclicks + 2) {
    NPC.seen.misclicks = state.misclicks;
    npcMood(-0.1, 'shake');
    npcSay(T('Вы тут первый день?', 'Is it your first day?'), 3000);
    if (!cafe.issues.includes('fumble')) cafe.issues.push('fumble');
  }
  if (!NPC.seen.slowWarned && Date.now() - cafe.startedAt > 75000) {
    NPC.seen.slowWarned = true;
    npcMood(-0.12);
    npcSay(T('Я вообще-то спешу. Долго ещё?', 'I’m in a bit of a hurry. Will it be long?'));
    cafe.issues.push('slow');
  }
}
setInterval(cafeWatch, 700);

// The complaint is about what actually went wrong; when nothing did, he is polite and the
// problem is a mix-up at the till (sugar syrup added), still yours to fix.
function cafeComplaint() {
  const m = NPC.mood;
  const tone = m >= 0.6 ? 'polite' : m >= 0.35 ? 'annoyed' : 'angry';
  const main = cafe.issues.find((i) => i !== 'fumble') || (cafe.issues.includes('fumble') ? 'fumble' : 'sugar');
  const lines = {
    taste: {
      polite: T('Извините, кофе получился горьким. Можно переделать?', 'Sorry, the coffee came out bitter. Could you redo it?'),
      annoyed: T('Это горько. Вы же видели, как долго шёл кофе?', 'This is bitter. Didn’t you see how long the shot ran?'),
      angry: T('Это невозможно пить! Горечь страшная, я за это заплатил!', 'This is undrinkable! It’s so bitter, and I paid for it!'),
    },
    watery: {
      polite: T('Простите, латте какой-то водянистый…', 'Excuse me, the latte tastes a bit watery…'),
      annoyed: T('Кофе почти не чувствуется. Вы зерно пожалели?', 'I can barely taste coffee. Did you skimp on the beans?'),
      angry: T('Это молоко с запахом кофе, а не латте! Верните деньги!', 'This is milk that smells of coffee, not a latte! I want my money back!'),
    },
    foam: {
      polite: T('Извините, пены совсем нет. Так и должно быть?', 'Sorry, there’s no foam at all. Is that how it should be?'),
      annoyed: T('Пена осела за минуту. Это не латте.', 'The foam was gone in a minute. That’s not a latte.'),
      angry: T('Тёплое молоко без пены за такие деньги? Позовите старшего!', 'Warm milk with no foam, at this price? Get me your manager!'),
    },
    slow: {
      polite: T('Я долго ждал, и, кажется, вы добавили сироп. Я просил без сахара.', 'I waited a while, and I think you added syrup. I asked for no sugar.'),
      annoyed: T('Десять минут ждал — и с сахаром! Я же просил без сахара.', 'Ten minutes of waiting, and it has sugar! I asked for none.'),
      angry: T('Я опоздал из-за вас, и кофе ещё и сладкий! Жалобную книгу!', 'I’m late because of you, and it’s sweet too! Give me the complaints book!'),
    },
    fumble: {
      polite: T('Простите, но в стакане сахар. Я просил без.', 'Sorry, but there’s sugar in it. I asked for none.'),
      annoyed: T('Вы всё роняли, и в итоге насыпали сахар. Я просил без!', 'You kept fumbling, and then added sugar. I asked for none!'),
      angry: T('Я трижды сказал: без сахара! Жалобную книгу, пожалуйста!', 'I said three times: no sugar! The complaints book, please!'),
    },
    sugar: {
      polite: T('Латте отличный, но на кассе мне пробили сироп, а я просил без сахара.', 'The latte is great, but the till added syrup, and I asked for no sugar.'),
      annoyed: T('В заказе сахар. Я же говорил — без.', 'There’s sugar in my order. I said none.'),
      angry: T('Опять сахар! Я трижды повторил!', 'Sugar again! I said it three times!'),
    },
  };
  const face = { polite: '🙂', annoyed: '😒', angry: '😡' }[tone];
  return { text: lines[main][tone], face, tone };
}

if (typeof startQuest2Conflict === 'function') {
  startQuest2Conflict = function () {
    state.quest = 2;
    state.quest2StartedAt = Date.now();
    document.getElementById('vrQuestTitle').innerText = T('Квест 2: разговор с гостем', 'Quest 2: talking to the guest');
    const real = NPC.module === 'barista' && NPC.state !== 'hidden';
    if (customerObj && !real) customerObj.visible = true;
    player.pos.set(0, 1.65, 0.75);
    player.yaw = 0;
    player.pitch = 0.05;
    playTone(280, 'sawtooth', 0.4, 0.12);
    const c = cafeComplaint();
    if (real) { npcSay(c.text, 7000); if (c.tone !== 'polite') NPC.gesture = { kind: 'shake', t: 0 }; }
    const hud = document.getElementById('hudDockInner') || document.getElementById('hudBottom');
    const opts = [
      ['A', 'rose', T('«Вы сами так заказали, проверяйте чек перед оплатой»', '“That’s what you ordered. Check your receipt before paying.”')],
      ['B', 'emerald', T('«Простите за ошибку! Я переделаю за 1 минуту и угощу вас фирменным десертом»', '“Sorry about that! I’ll remake it in a minute, and the dessert is on us.”')],
      ['C', 'amber', T('«Подождите, я позову управляющего смены»', '“One moment, I’ll get the shift manager.”')],
    ];
    hud.innerHTML = `<div class="speech-bubble" id="typewriterBox">${c.face} <strong>${T('Клиент', 'Customer')}:</strong> <span id="typewriterText"></span></div><div>${opts.map(([k, col, text]) => `
      <div class="dialog-option" onclick="handleConflictAnswer('${k}')">
        <div class="dialog-tag" style="background:var(--${col}-bg); color:var(--${col}); border:1px solid var(--${col}-border);">${k}</div>
        <div>${text}</div>
      </div>`).join('')}</div>`;
    const span = document.getElementById('typewriterText');
    let i = 0;
    const full = `«${c.text}»`;
    const iv = setInterval(() => {
      if (!span.isConnected || i >= full.length) { clearInterval(iv); return; }
      span.textContent += full[i++];
    }, 22);
  };
}

if (typeof handleConflictAnswer === 'function') {
  const _answer = handleConflictAnswer;
  handleConflictAnswer = function (opt) {
    if (NPC.module === 'barista' && NPC.state !== 'hidden') {
      const r = {
        A: [-0.4, 'shake', T('Невероятно. Больше сюда не приду.', 'Unbelievable. I’m not coming back.')],
        B: [0.35, 'nod', NPC.mood < 0.35 ? T('…Ладно. Спасибо, что не спорите.', '…Fine. Thanks for not arguing.') : T('Спасибо, очень приятно!', 'Thank you, that’s kind!')],
        C: [-0.1, 'shake', T('Мне не нужен управляющий, мне нужен нормальный кофе.', 'I don’t need a manager, I need a proper coffee.')],
      }[opt];
      if (r) { npcMood(r[0], r[1]); npcSay(r[2], 3800); }
      setTimeout(() => { if (NPC.module === 'barista') npcLeave(CAFE_DOOR); }, 2600);
    }
    return _answer.call(this, opt);
  };
}

// =====================================================================================
// DOCTOR: the patient
// =====================================================================================
const clinic = { startedAt: 0, slow: false };

function clinicPatientSeat() {
  clinic.startedAt = Date.now();
  clinic.slow = false;
  NPC.seen.coughAt = Date.now() + 8000;
  npcShow('doctor', { role: T('Пациент', 'Patient'), mood: 0.55, sit: true, at: [DOC_PATIENT.x, DOC_PATIENT.z], faceYaw: 0, sitY: -0.32 })
    .then((ok) => {
      if (!ok) return;
      npcHidePlaceholder(scene.getObjectByName('patientBody'));
      npcSay(T('Здравствуйте, доктор. Кашляю уже пятый день…', 'Hello, doctor. I’ve been coughing for five days…'), 4500);
    });
}

const CLINIC_REACT = () => ({
  protocol: [T('Доктор, а руки вы точно обработали как следует?', 'Doctor, did you clean your hands properly?'), T('Спасибо, что руки обработали.', 'Thanks for cleaning your hands.')],
  attention: [T('Вы так долго смотрите на пульс… что-то не так?', 'You’re looking at my pulse for a long time… is something wrong?'), null],
  hearing: [T('Ай, манжета сильно давит… цифры точно верные?', 'Ow, the cuff is tight… are the numbers right?'), null],
  diagnosis: [T('Справа болит, когда кашляю… вы что-нибудь услышали?', 'It hurts on the right when I cough… did you hear anything?'), T('Значит, справа? Я так и чувствовал.', 'On the right, then? I could feel it.')],
});

function clinicOnSkill(trait, score) {
  if (NPC.module !== 'doctor' || NPC.state === 'hidden') return;
  const r = CLINIC_REACT()[trait];
  if (!r) return;
  if (score >= 85) { npcMood(0.08, 'nod'); if (r[1]) npcSay(r[1], 3000); }
  else if (score < 60) { npcMood(-0.14, 'shake'); npcSay(r[0]); }
}

setInterval(() => {
  if (NPC.module !== 'doctor' || NPC.state !== 'idle') return;
  if (Date.now() > NPC.seen.coughAt) {
    NPC.seen.coughAt = Date.now() + 14000 + Math.random() * 10000;
    npcSay(T('*кашляет*', '*coughs*'), 1600);
    NPC.gesture = { kind: 'nod', t: 0 };
    if (typeof playTone === 'function') { playTone(140, 'sawtooth', 0.09, 0.05); setTimeout(() => playTone(120, 'sawtooth', 0.09, 0.05), 160); }
  }
  if (!clinic.slow && Date.now() - clinic.startedAt > 150000) {
    clinic.slow = true;
    npcMood(-0.1);
    npcSay(T('Доктор, долго ещё? Мне правда тяжело дышать.', 'Doctor, will it take long? It really is hard to breathe.'));
  }
}, 1000);

// =====================================================================================
// IT: the store manager
// =====================================================================================
const IT_DOOR = [-3.5, -1.9], IT_SPOT = [-0.6, -1.9];

function itManagerLine() {
  const mins = Math.max(8, Math.round((typeof state !== 'undefined' ? state.timer : 60) / 4));
  const slips = typeof state !== 'undefined' ? state.misclicks : 0;
  const mood = Math.max(0.1, Math.min(0.8, 0.8 - mins / 80 - slips * 0.05));
  NPC.mood = mood;
  if (mood >= 0.55) return { mood, face: '🙂', text: T(`Сайт лежал ${mins} минут, но вы быстро разобрались. Что это было и повторится ли?`, `The site was down ${mins} minutes, but you were quick. What was it, and will it happen again?`) };
  if (mood >= 0.3) return { mood, face: '😟', text: T(`Сайт не работал ${mins} минут, клиенты не могли оплатить заказы! Что случилось и повторится ли это?`, `The site was down for ${mins} minutes and customers couldn’t pay! What happened, and will it happen again?`) };
  return { mood, face: '😠', text: T(`${mins} минут без продаж! Я теряю деньги каждую минуту. Объясните, что происходит?!`, `${mins} minutes without sales! I lose money every minute. Explain what is going on!`) };
}

// =====================================================================================
// SAFETY: the colleague
// =====================================================================================
window.npcColleagueLine = () => {
  const errs = typeof safetyState !== 'undefined' ? safetyState.errors : 0;
  if (errs >= 2) return T('«Ты сам сегодня уже правила нарушал — ну сними замок на минуту, никто не узнает!»', '“You’ve already broken the rules today — just take the lock off for a minute, nobody will know!”');
  if (errs === 1) return T('«Слушай, ты ж и так одну ошибку сделал. Сними замок на минуту, мне мотор проверить!»', '“Look, you already slipped once. Take the lock off for a minute, I need to test a motor!”');
  return T('«Мне на минуту нужно питание проверить мотор. Сними замок, я быстро!»', '“I need power for a minute to test a motor. Take the lock off, I’ll be quick!”');
};

if (typeof mgColleague === 'function') {
  const _mgColleague = mgColleague;
  mgColleague = function (done) {
    const p = typeof player !== 'undefined' ? player.pos : { x: 0, z: 1 };
    const at = [Math.min(4.2, p.x + 1.1), Math.max(-0.4, Math.min(4, p.z + 0.4))];
    const errs = typeof safetyState !== 'undefined' ? safetyState.errors : 0;
    npcShow('safety', { role: T('Коллега', 'Colleague'), mood: errs ? 0.6 : 0.75, from: [4.0, 3.5], at,
      onArrive: () => _mgColleague((...a) => {
        const ok = !(typeof safetyState !== 'undefined' && safetyState.errors > errs);
        if (ok) { npcMood(-0.15, 'nod'); npcSay(T('Ладно, понял. Подожду, пока закончишь.', 'Fine, got it. I’ll wait till you’re done.'), 3200); }
        else { npcMood(0.2, 'nod'); npcSay(T('Спасибо, я быстро!', 'Thanks, I’ll be quick!'), 2600); }
        setTimeout(() => { if (NPC.module === 'safety') npcLeave([4.0, 3.5]); }, 2600);
        if (done) done(...a);
      }),
    }).then((ok) => { if (!ok) _mgColleague(done); });
  };
}

// =====================================================================================
// wiring
// =====================================================================================
if (typeof fitRecord === 'function') {
  const _fitRecord = fitRecord;
  fitRecord = function (trait, score) {
    const r = _fitRecord.call(this, trait, score);
    cafeOnSkill(trait, score);
    clinicOnSkill(trait, score);
    return r;
  };
}

// adaptive prompts for the final talks
if (typeof startScenarioDecision === 'function') {
  const _startDecision = startScenarioDecision;
  startScenarioDecision = function (idx) {
    const def = getActiveScenario();
    const d = def && def.decisions[idx];
    if (def && d && d.kind === 'soft' && def.id === 'it') {
      const line = itManagerLine();
      d.prompt = () => `<div class="speech-bubble">${line.face} <strong>${T('Руководитель магазина', 'Store manager')}:</strong> «${line.text}»</div>`;
      npcShow('it', { role: T('Руководитель магазина', 'Store manager'), mood: line.mood, from: IT_DOOR, at: IT_SPOT,
        onArrive: () => npcSay(line.text, 6000) });
    }
    if (def && d && d.kind === 'soft' && def.id === 'doctor') {
      const m = NPC.module === 'doctor' ? NPC.mood : 0.5;
      const text = m >= 0.6
        ? T('Доктор, спасибо, что всё так подробно проверили. Это что-то серьёзное? Дома маленький ребёнок.', 'Doctor, thank you for checking everything so carefully. Is it serious? I have a small child at home.')
        : m >= 0.35
          ? T('Доктор, это что-то серьёзное? Мне страшно — дома маленький ребёнок.', 'Doctor, is it something serious? I’m scared — I have a small child at home.')
          : T('Вы так долго меня осматривали и хмурились… Это что-то серьёзное?! Дома маленький ребёнок!', 'You took so long and kept frowning… Is it serious?! I have a small child at home!');
      d.prompt = () => `<div class="speech-bubble">${m >= 0.35 ? '😟' : '😰'} <strong>${T('Пациент', 'Patient')}:</strong> «${text}»</div>`;
      npcSay(text, 6000);
    }
    return _startDecision.call(this, idx);
  };
}

if (typeof answerScenarioDecision === 'function') {
  const _answerDecision = answerScenarioDecision;
  answerScenarioDecision = function (optionId) {
    const def = getActiveScenario();
    const d = def && def.decisions[scenarioState.decision];
    if (d && d.kind === 'soft' && NPC.state !== 'hidden' && NPC.module === def.id) {
      const o = d.options.find((x) => x.id === optionId);
      const good = o && o.score >= 100;
      if (def.id === 'it') {
        npcMood(good ? 0.3 : -0.3, good ? 'nod' : 'shake');
        npcSay(good ? T('Понятно. Спасибо, жду отчёт.', 'Clear. Thanks, I’ll wait for the report.') : T('Я ничего не понял. Мне это не помогает.', 'I didn’t understand a thing. That doesn’t help me.'), 3500);
      } else if (def.id === 'doctor') {
        npcMood(good ? 0.3 : -0.3, good ? 'nod' : 'shake');
        npcSay(good ? T('Спасибо. Так спокойнее.', 'Thank you. I feel calmer.') : o && o.label === 'scary_guess' ? T('В больницу?!', 'Hospital?!') : T('…Понятно.', '…I see.'), 3500);
      }
    }
    return _answerDecision.call(this, optionId);
  };
  window.answerScenarioDecision = answerScenarioDecision;
}

(function wireNpc() {
  const wrap = (name, fn) => {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function (...args) {
      npcHide();
      const r = orig.apply(this, args);
      const runId = scenarioState.runId;
      setTimeout(() => { if (isScenarioRunActive(runId)) fn(args); }, 700);
      return r;
    };
  };
  wrap('startBaristaVR', () => cafeCustomerArrive());
  wrap('startSafetyVR', () => {});
  wrap('startScenario', (a) => { if (a[0] === 'doctor') clinicPatientSeat(); });
  // leaving the game hides whoever is in the room
  const _show = window.showScreen;
  window.showScreen = showScreen = function (id, ...rest) {
    if (id !== 'gameScreen' && id !== 'resultScreen') npcHide();
    return _show.call(this, id, ...rest);
  };
})();
