// SynapKor — visual upgrade for every 3D room, applied after a module builds its scene.
//  - procedural textures (no downloads): wood planks, concrete, raised-floor tiles, vinyl, plaster,
//    and a fine grain on every plain surface so nothing looks like flat plastic
//  - bump from the same textures, so grout lines and planks catch the light
//  - shadows on every prop, sharper shadow maps
//  - lighting mood per profession: warm café, sodium-lit plant room, cool server room, clean clinic

const GFX = { cache: {}, lights: null, module: null };

function gfxCanvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}

function gfxNoise(ctx, s, lo, hi, alpha = 1) {
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = lo + Math.random() * (hi - lo);
    img.data[i] = img.data[i] * (1 - alpha) + n * alpha;
    img.data[i + 1] = img.data[i + 1] * (1 - alpha) + n * alpha;
    img.data[i + 2] = img.data[i + 2] * (1 - alpha) + n * alpha;
  }
  ctx.putImageData(img, 0, 0);
}

const GFX_PAINTERS = {
  grain: (ctx, s) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, s, s); gfxNoise(ctx, s, 226, 255); },
  plaster: (ctx, s) => {
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`; ctx.beginPath(); ctx.arc(Math.random() * s, Math.random() * s, Math.random() * 9 + 2, 0, 7); ctx.fill(); }
    gfxNoise(ctx, s, 232, 255, 0.5);
  },
  wood: (ctx, s) => {
    const rows = 6, h = s / rows;
    for (let r = 0; r < rows; r++) {
      const base = 205 + Math.random() * 40;
      ctx.fillStyle = `rgb(${base},${base * 0.93},${base * 0.86})`;
      ctx.fillRect(0, r * h, s, h);
      for (let k = 0; k < 40; k++) {
        ctx.strokeStyle = `rgba(80,50,30,${Math.random() * 0.08})`;
        ctx.lineWidth = Math.random() * 2;
        const y = r * h + Math.random() * h;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(s * 0.3, y + rand(-3, 3), s * 0.7, y + rand(-3, 3), s, y); ctx.stroke();
      }
      const cut = Math.random() * s;
      ctx.fillStyle = 'rgba(40,25,15,0.35)'; ctx.fillRect(cut, r * h, 2, h);
      ctx.fillStyle = 'rgba(40,25,15,0.45)'; ctx.fillRect(0, r * h, s, 2);
    }
    gfxNoise(ctx, s, 225, 255, 0.25);
  },
  concrete: (ctx, s) => {
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.05})`; ctx.beginPath(); ctx.arc(Math.random() * s, Math.random() * s, Math.random() * 14 + 2, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, s - 2, s - 2);
    gfxNoise(ctx, s, 200, 255, 0.35);
  },
  tiles: (ctx, s) => {
    const n = 4, t = s / n;
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
      const v = 228 + Math.random() * 18;
      ctx.fillStyle = `rgb(${v},${v},${v + 3})`;
      ctx.fillRect(x * t, y * t, t, t);
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      for (let k = 0; k < 6; k++) ctx.fillRect(x * t + 10, y * t + 10 + k * 18, t - 20, 2);
    }
    ctx.strokeStyle = 'rgba(30,35,45,0.55)'; ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * t, 0); ctx.lineTo(i * t, s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * t); ctx.lineTo(s, i * t); ctx.stroke(); }
    gfxNoise(ctx, s, 225, 255, 0.2);
  },
  vinyl: (ctx, s) => {
    ctx.fillStyle = '#eef0f2'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2200; i++) { ctx.fillStyle = `rgba(90,110,130,${Math.random() * 0.12})`; ctx.fillRect(Math.random() * s, Math.random() * s, rand(1, 4), rand(1, 4)); }
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, s / 2); ctx.lineTo(s, s / 2); ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s); ctx.stroke();
  },
};

function gfxTexture(kind) {
  if (!GFX.cache[kind]) {
    const tex = new THREE.CanvasTexture(gfxCanvas(512, GFX_PAINTERS[kind]));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
    GFX.cache[kind] = tex;
  }
  return GFX.cache[kind];
}

function gfxApply(mesh, kind, repeat, bump) {
  const tex = gfxTexture(kind).clone();
  tex.needsUpdate = true;
  tex.repeat.set(repeat[0], repeat[1]);
  const m = mesh.material.clone();
  m.map = tex;
  if (bump) { m.bumpMap = tex; m.bumpScale = bump; }
  m.needsUpdate = true;
  mesh.material = m;
}

const GFX_MOODS = {
  barista: { floor: 'wood', floorRep: 0.8, exposure: 1.08, key: 0xffd9a8, keyI: 0.55, rim: 0xff9a5a, rimI: 0.35, fog: 0.03 },
  safety: { floor: 'concrete', floorRep: 0.6, exposure: 1.0, key: 0xffe2b0, keyI: 0.5, rim: 0x6fa8ff, rimI: 0.3, fog: 0.04 },
  it: { floor: 'tiles', floorRep: 1.6, exposure: 1.02, key: 0xcfe3ff, keyI: 0.45, rim: 0x2dd4bf, rimI: 0.45, fog: 0.035 },
  doctor: { floor: 'vinyl', floorRep: 0.9, exposure: 1.12, key: 0xffffff, keyI: 0.6, rim: 0xbfdcff, rimI: 0.25, fog: 0.02 },
};

function gfxMood(module) {
  const mood = GFX_MOODS[module] || GFX_MOODS.barista;
  if (GFX.lights?.userData.module === module) return mood;
  if (GFX.lights) {
    GFX.lights.traverse(light => light.shadow?.dispose());
    scene.remove(GFX.lights);
  }
  const g = new THREE.Group();
  g.userData.module = module;
  const key = new THREE.DirectionalLight(mood.key, mood.keyI);
  key.position.set(-3, 5, 2.5);
  key.castShadow = window.innerWidth > 768;
  key.shadow.mapSize.set(window.innerWidth > 768 ? 1024 : 512, window.innerWidth > 768 ? 1024 : 512);
  key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const rim = new THREE.DirectionalLight(mood.rim, mood.rimI);
  rim.position.set(3, 2.5, -4);
  g.add(key, rim);
  scene.add(g);
  GFX.lights = g;
  renderer.toneMappingExposure = mood.exposure;
  if (scene.fog && scene.fog.density !== undefined) scene.fog.density = mood.fog;
  return mood;
}

// Atmosphere props sit against the walls and are excluded from interaction raycasts.
function dressRoom(module, room) {
  if (!room || room.getObjectByName('roomDetails')) return;
  const details = new THREE.Group();
  details.name = 'roomDetails';
  room.add(details);

  const timber = 0x815536;
  const cream = 0xf1e5d0;
  const teal = 0x3c7770;
  const metal = 0x455463;
  const props = new Map();
  function block(w, h, d, x, y, z, color, lit = false) {
    const key = `${color}:${lit}`;
    if (!props.has(key)) {
      props.set(key, lit ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.78 }));
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), props.get(key));
    mesh.position.set(x, y, z);
    mesh.receiveShadow = !lit;
    mesh.userData.gfxDone = true;
    details.add(mesh);
    return mesh;
  }
  function sign(x, y, width, title, subtitle, background) {
    const map = createTextTexture([
      { text: title, font: '800 37px sans-serif' },
      { text: subtitle, font: '600 23px sans-serif' }
    ], background, '#fff6e8', 512, 192);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.375), new THREE.MeshBasicMaterial({ map }));
    panel.position.set(x, y, -2.37);
    details.add(panel);
  }

  if (module === 'barista') {
    block(9.7, 0.18, 0.06, 0, 0.18, -2.43, timber);
    for (const side of [-1, 1]) {
      const x = side * 2.62;
      block(1.55, 0.07, 0.34, x, 1.77, -2.29, timber);
      block(1.55, 0.07, 0.34, x, 2.11, -2.29, timber);
      for (let i = 0; i < 4; i++) {
        block(0.19, 0.25, 0.16, x - 0.51 + i * 0.32, 1.93, -2.23, [cream, timber, teal, 0xd99660][i]);
        block(0.14, 0.13, 0.12, x - 0.51 + i * 0.32, 2.21, -2.23, cream);
      }
      block(0.22, 0.045, 0.22, x, 2.68, -1.3, 0xffd4a0, true);
      block(0.28, 0.10, 0.28, x, 2.75, -1.3, timber);
      block(0.025, 0.9, 0.025, x, 3.22, -1.3, metal);
    }
    return;
  }

  if (module === 'it') {
    block(7.7, 0.12, 0.16, 0, 2.87, -2.3, metal);
    block(7.7, 0.026, 0.025, 0, 2.81, -2.20, 0x6dcac7, true);
    for (const x of [-3, -1.5, 1.5, 3]) {
      block(0.018, 0.62, 0.04, x, 2.55, -2.4, metal);
    }
    sign(-2.66, 2.37, 1.19, 'NETWORK', 'OPERATIONS', '#243944');
    sign(2.66, 2.37, 1.19, 'SERVER ROOM', 'RACK ROW A', '#243944');
    return;
  }

  if (module === 'doctor') {
    block(7.52, 0.09, 0.055, 0, 1.17, -2.43, 0xa7c7c0);
    sign(0, 2.26, 1.08, 'CONSULTATION', 'ROOM 01', '#406c67');
    for (const x of [-2.7, 2.64]) {
      block(0.76, 0.52, 0.055, x, 2.19, -2.43, teal);
      block(0.69, 0.45, 0.058, x, 2.19, -2.41, 0xe7eeea);
      for (const dy of [-0.095, 0, 0.095]) block(0.43, 0.024, 0.025, x, 2.19 + dy, -2.37, 0x94b7af);
    }
    for (const x of [-2, 0, 2]) block(1.15, 0.035, 0.21, x, 3.05, -0.6, 0xeafcff, true);
    return;
  }

  if (module === 'safety') {
    for (const x of [-3.4, 3.4]) {
      block(0.11, 1.50, 0.14, x, 2.43, -2.31, metal);
      block(0.52, 0.20, 0.22, x, 2.88, -2.28, 0xe4b44c);
      block(0.52, 0.055, 0.22, x, 2.74, -2.28, metal);
    }
    block(9.8, 0.12, 0.16, 0, 3.17, -2.33, metal);
    sign(-3.37, 2.33, 1.06, 'WORKSHOP', 'SECTOR 01', '#323b44');
    sign(3.37, 2.33, 1.06, 'MAINTENANCE', 'SERVICE AREA', '#323b44');
  }
}

function enhanceScene(module) {
  if (typeof scene === 'undefined' || !scene || !renderer) return false;
  if (currentProfession !== module || !document.getElementById('gameScreen')?.classList.contains('active')) return false;
  const room = scene.getObjectByName(module + 'Environment');
  if (!room) return false;
  dressRoom(module, room);
  const mood = gfxMood(module);
  const size = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible || o.userData.gfxDone) return;
    o.userData.gfxDone = true;
    const mat = o.material;
    if (!mat || Array.isArray(mat) || !mat.isMeshStandardMaterial) return;
    if (mat.transparent || mat.map || (mat.emissive && mat.emissive.getHex() !== 0 && mat.emissiveIntensity > 0.2)) return;
    const geo = o.geometry;
    if (!geo) return;
    if (!geo.boundingBox) geo.computeBoundingBox();
    geo.boundingBox.getSize(size);
    o.getWorldScale(scale);
    size.multiply(scale);
    o.getWorldPosition(pos);
    o.receiveShadow = true;
    const big = Math.max(size.x, size.y, size.z);
    if (big < 3) o.castShadow = true;
    const isPlane = geo.type === 'PlaneGeometry' || geo.type === 'PlaneBufferGeometry';
    // floors: wide, thin, low (planes are usually rotated flat)
    const flatArea = isPlane ? size.x * Math.max(size.y, size.z) : size.x * size.z;
    const thin = isPlane ? true : size.y < 0.2;
    if (thin && flatArea > 6 && pos.y < 0.25) {
      const w = size.x, d = isPlane ? Math.max(size.y, size.z) : size.z;
      gfxApply(o, mood.floor, [w * mood.floorRep, d * mood.floorRep], 0.012);
      return;
    }
    // walls: tall and thin
    if (size.y > 2 && Math.min(size.x, size.z) < 0.3 && Math.max(size.x, size.z) > 2) {
      const w = Math.max(size.x, size.z);
      gfxApply(o, module === 'safety' ? 'concrete' : 'plaster', [w / 3, size.y / 3], 0.004);
      return;
    }
    // everything else: fine grain, scaled to the object's size
    if (big > 0.12) gfxApply(o, 'grain', [Math.max(1, big * 2), Math.max(1, big * 2)], 0.002);
  });
  return true;
}

function enhanceSoon(module) {
  let tries = 0;
  const run = () => {
    if (enhanceScene(module) || ++tries > 20) {
      // props added a little later (hands, effects) get shadows too
      runLater(() => {
        enhanceScene(module);
        const room = scene?.getObjectByName(module + 'Environment');
        if (room) room.userData.enhancementComplete = true;
      }, 1500);
      return;
    }
    runLater(run, 250);
  };
  runLater(run, 350);
}

(function wireGraphics() {
  const wrap = (name, moduleOf) => {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function (...args) {
      const r = orig.apply(this, args);
      enhanceSoon(moduleOf(args));
      return r;
    };
  };
  wrap('startScenario', (a) => a[0]);
  wrap('startBaristaVR', () => 'barista');
  wrap('startSafetyVR', () => 'safety');
})();
