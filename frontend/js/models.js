// SynapKor — real 3D models in the rooms.
//  - models/hand.obj: a scanned hand with forearm, used as the first-person hand in every module.
//  - models/walker.fbx: a person walking (Renderpeople "Nathan", rigmodels.com, free for students'
//    personal use). Walks back and forth in the background of each room on a path checked to be
//    clear of furniture: a customer, a colleague, another engineer, a visitor.
// Both load lazily after the room is ready; if anything fails, the simple shapes stay.

// ---------------------------------------------------------------- first-person hand
const MODELS = { hand: null, loadingWalker: null };

// The OBJ is a right hand with forearm, Y-up, fingers along +Y, back of the hand facing +Z,
// 2.5 units long. Turned so the fingers point forward and the back of the hand faces up.
async function loadHand() {
  if (MODELS.hand) return MODELS.hand;
  if (!THREE.OBJLoader) throw new Error('OBJLoader missing');
  const obj = await new Promise((res, rej) => new THREE.OBJLoader().load('models/hand.obj', res, undefined, rej));
  const tl = new THREE.TextureLoader();
  const map = tl.load('models/hand_diffuse.jpg');
  map.encoding = THREE.sRGBEncoding;
  const normalMap = tl.load('models/hand_normal.jpg');
  const mat = new THREE.MeshStandardMaterial({ map, normalMap, color: 0xd9c3b3, roughness: 0.72, metalness: 0 });
  obj.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = false; o.userData.gfxDone = true; } });
  MODELS.hand = obj;
  return obj;
}

const HAND_POSE = { scale: 0.17, rx: -Math.PI / 2 + 0.25, ry: Math.PI + 0.12, rz: -0.35, x: -0.02, y: 0.0, z: 0.08 };

// Keeps the old group (the hand animations move rightHand) and swaps the blocky shapes for the hand.
async function useRealHand() {
  if (typeof rightHand === 'undefined' || !rightHand || rightHand.userData.realHand) return;
  try {
    const hand = await loadHand();
    hand.name = 'RealHand';
    hand.scale.setScalar(HAND_POSE.scale);
    hand.rotation.set(HAND_POSE.rx, HAND_POSE.ry, HAND_POSE.rz);
    hand.position.set(HAND_POSE.x, HAND_POSE.y, HAND_POSE.z);
    rightHand.children.forEach((c) => { c.visible = false; });
    rightHand.add(hand);
    rightHand.userData.realHand = true;
  } catch (e) {
    console.warn('[models] hand not loaded, keeping simple shapes', e);
  }
}

// ---------------------------------------------------------------- walking person
const WALK_PATHS = {
  // checked against each room's furniture: no desk, rack or machine on these lines
  barista: { a: [-3.6, -2.2], b: [3.6, -2.2] },   // a customer walking past behind the counter
  safety: { a: [4.0, 3.5], b: [4.0, -1.9] },     // a colleague along the right side of the plant room
  it: { a: [-3.5, -1.9], b: [0.2, -1.9] },       // an engineer between the desks and the back wall
  doctor: { a: [-3.2, 2.2], b: [-3.2, -1.9] },   // a visitor along the left wall
};

function loadWalker() {
  if (MODELS.loadingWalker) return MODELS.loadingWalker;
  MODELS.loadingWalker = new Promise((resolve, reject) => {
    if (!THREE.FBXLoader) { reject(new Error('FBXLoader missing')); return; }
    new THREE.FBXLoader().load('models/walker.fbx', (obj) => {
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true; o.userData.gfxDone = true;
          o.frustumCulled = false;
          o.raycast = () => {};   // never blocks clicks on the equipment behind him
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => { if (m.map) m.map.encoding = THREE.sRGBEncoding; if (m.shininess !== undefined) m.shininess = 8; });
        }
      });
      // in-place walk: keep the hips' height, drop their forward travel
      obj.animations.forEach((clip) => clip.tracks.forEach((t) => {
        if (/hips.*\.position$/i.test(t.name) || /root.*\.position$/i.test(t.name)) {
          for (let i = 0; i < t.values.length; i += 3) { t.values[i] = t.values[0]; t.values[i + 2] = t.values[2]; }
        }
      }));
      resolve(obj);
    }, undefined, reject);
  });
  return MODELS.loadingWalker;
}

const walkerState = { obj: null, mixer: null, path: null, t: 0, dir: 1, module: null };

async function placeWalker(module) {
  const path = WALK_PATHS[module];
  if (!path || typeof scene === 'undefined' || !scene) return;
  try {
    const src = await loadWalker();
    if (walkerState.obj) scene.remove(walkerState.obj);
    const obj = src; // one walker at a time, reused between rooms
    const box = new THREE.Box3().setFromObject(obj);
    const h = box.max.y - box.min.y || 180;
    const s = obj.userData.baseScale || (1.78 / h);
    obj.userData.baseScale = s;
    obj.scale.setScalar(s);
    scene.add(obj);
    walkerState.obj = obj;
    walkerState.path = path;
    walkerState.module = module;
    walkerState.t = Math.random();
    walkerState.dir = 1;
    if (!walkerState.mixer) {
      walkerState.mixer = new THREE.AnimationMixer(obj);
      if (obj.animations[0]) walkerState.mixer.clipAction(obj.animations[0]).play();
    }
  } catch (e) {
    console.warn('[models] walker not loaded', e);
  }
}

let walkerLast = performance.now();
function tickWalker() {
  requestAnimationFrame(tickWalker);
  const now = performance.now();
  const dt = Math.min(0.1, (now - walkerLast) / 1000);
  walkerLast = now;
  const w = walkerState;
  if (!w.obj || !w.path || !w.obj.parent) return;
  const game = document.getElementById('gameScreen');
  if (game && !game.classList.contains('active')) return;
  if (w.mixer) w.mixer.update(dt);
  const [ax, az] = w.path.a, [bx, bz] = w.path.b;
  const len = Math.hypot(bx - ax, bz - az);
  w.t += (w.dir * 1.15 * dt) / len;            // ~1.15 m/s, a calm walk
  if (w.t >= 1) { w.t = 1; w.dir = -1; }
  if (w.t <= 0) { w.t = 0; w.dir = 1; }
  const x = ax + (bx - ax) * w.t, z = az + (bz - az) * w.t;
  w.obj.position.set(x, 0, z);
  const heading = Math.atan2((bx - ax) * w.dir, (bz - az) * w.dir);
  w.obj.rotation.y += (heading - w.obj.rotation.y) * Math.min(1, dt * 6);
}
requestAnimationFrame(tickWalker);

// ---------------------------------------------------------------- wiring
(function wireModels() {
  const after = (name, moduleOf) => {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function (...args) {
      const r = orig.apply(this, args);
      const module = moduleOf(args);
      setTimeout(() => { useRealHand(); placeWalker(module); }, 600);
      return r;
    };
  };
  after('startScenario', (a) => a[0]);
  after('startBaristaVR', () => 'barista');
  after('startSafetyVR', () => 'safety');
})();
