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
  if (GFX.lights) scene.remove(GFX.lights);
  const g = new THREE.Group();
  const key = new THREE.DirectionalLight(mood.key, mood.keyI);
  key.position.set(-3, 5, 2.5);
  key.castShadow = window.innerWidth > 768;
  key.shadow.mapSize.set(2048, 2048);
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

function enhanceScene(module) {
  if (typeof scene === 'undefined' || !scene || !renderer) return false;
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
      setTimeout(() => enhanceScene(module), 1500);
      return;
    }
    setTimeout(run, 250);
  };
  setTimeout(run, 350);
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
