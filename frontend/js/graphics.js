// SynapKor — visual upgrade for every 3D room, applied after a module builds its scene.
//  - procedural textures (no downloads): wood planks, concrete, raised-floor tiles, vinyl, plaster,
//    and a fine grain on every plain surface so nothing looks like flat plastic
//  - bump from the same textures, so grout lines and planks catch the light
//  - shadows on every prop, sharper shadow maps
//  - lighting mood per profession: warm café, sodium-lit plant room, cool server room, clean clinic

const GFX = { cache: {}, lights: null, room: null, roomFrame: null };

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
  if (!GFX.lights) {
    const key = new THREE.DirectionalLight();
    key.position.set(-3, 5, 2.5);
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    const rim = new THREE.DirectionalLight();
    rim.position.set(3, 2.5, -4);
    scene.add(key, rim);
    GFX.lights = { key, rim };
  }
  const { key, rim } = GFX.lights;
  key.castShadow = window.innerWidth > 768 && !window.matchMedia('(pointer: coarse)').matches;
  key.color.setHex(mood.key);
  key.intensity = mood.keyI;
  rim.color.setHex(mood.rim);
  rim.intensity = mood.rimI;
  renderer.toneMappingExposure = mood.exposure;
  if (scene.fog && scene.fog.density !== undefined) scene.fog.density = mood.fog;
  return mood;
}

function enhanceScene(module) {
  if (typeof scene === 'undefined' || !scene || !renderer) return false;
  const room = scene.getObjectByName(module + 'Environment');
  if (!room) return false;
  const mood = gfxMood(module);
  if (GFX.room !== room) {
    const previous = GFX.room?.getObjectByName('roomAtmosphere');
    previous?.traverse(object => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    GFX.room = room;
    GFX.roomFrame = decorateRoom(room, module);
  }
  const size = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  room.traverse((o) => {
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
    if (big > 0.12) {
      // Keep the original material: indicators and liquids update it during play.
      mat.map = gfxTexture('grain');
      mat.needsUpdate = true;
    }
  });
  return true;
}


function decorateRoom(room, module) {
  const props = new THREE.Group();
  props.name = 'roomAtmosphere';
  room.add(props);
  const place = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    mesh.userData.gfxDone = true;
    props.add(mesh);
    return mesh;
  };
  const panel = (w, h, depth, color, x, y, z) =>
    place(box(w, h, depth, color, { roughness: 0.7 }), x, y, z);
  const glow = (w, h, d, color, x, y, z) =>
    place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.1, roughness: 0.42
    })), x, y, z);
  const lamp = (x, y, z, color, intensity) =>
    place(new THREE.PointLight(color, intensity, 4), x, y, z);
  const lens = (w, h, color, x, y, z) => panel(w, h, 0.045, color, x, y, z);

  if (module === 'it') {
    // Junction boxes, conduit and overhead task lights frame the working area.
    panel(7.4, 0.13, 0.08, 0x263748, 0, 0.13, -2.43);
    panel(7, 0.13, 0.17, 0x283843, 0, 2.68, -2.31);
    for (const x of [-2.65, -2.5, 3.0, 3.15]) panel(0.045, 2.35, 0.055, 0x384957, x, 1.49, -2.43);
    lens(0.42, 0.26, 0x4d6579, -2.58, 1.29, -2.35);
    lens(0.5, 0.34, 0x314659, 3.07, 1.76, -2.35);
    for (const x of [-2.25, 0.1, 2.45]) {
      panel(1.48, 0.09, 0.32, 0x26323b, x, 2.88, -1.05);
      glow(1.32, 0.018, 0.19, 0xb9dcff, x, 2.825, -1.05);
    }
    const status = glow(0.34, 0.035, 0.026, 0xff6754, 3.07, 1.84, -2.317);
    const accent = lamp(2.1, 2.2, -1.25, 0x419ac8, 0.4);
    const statusColors = { down: 0xff6754, working: 0xffc66c, restored: 0x45dfbc };
    return time => {
      const phase = itWorldStatus;
      status.material.color.setHex(statusColors[phase]);
      status.material.emissive.copy(status.material.color);
      status.material.emissiveIntensity = phase === 'restored' ? 0.8 : 0.7 + Math.sin(time * 4) * 0.32;
      accent.intensity = phase === 'restored' ? 0.6 : 0.35;
    };
  }
  if (module === 'barista') {
    const wood = 0x61412d;
    for (const x of [-1.35, 0, 1.35]) {
      panel(0.018, 1.4, 0.02, 0x272321, x, 3.1, -0.55);
      place(cyl(0.09, 0.22, 0.20, 0x28211e, { metalness: 0.48 }), x, 2.41, -0.55);
      glow(0.24, 0.016, 0.16, 0xffdeac, x, 2.303, -0.55);
    }
    const warm = lamp(0, 2.25, -0.48, 0xffbb76, 0.75);
    for (const y of [1.46, 1.9, 2.34]) {
      panel(1.13, 0.058, 0.28, wood, 2.05, y, -2.29);
      for (const x of [1.7, 1.93, 2.16, 2.39]) {
        place(cyl(0.069, 0.06, 0.13, y === 1.9 ? 0xc6976f : 0xece0ce, { roughness: 0.35 }), x, y + 0.094, -2.27);
      }
    }
    lens(0.94, 1.23, 0x4f3021, -2.15, 1.02, -2.44);
    lens(0.76, 1.08, 0xafc1be, -2.15, 1.02, -2.408);
    lens(0.035, 1.09, wood, -2.15, 1.02, -2.38);
    const stream = place(cyl(0.008, 0.013, 1, 0xe6d9c4), 0, 0, 0);
    stream.visible = false;
    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const latte = new THREE.Color(0xe5d4c0);
    const game = document.getElementById('gameScreen');
    return (time, delta) => {
      stream.visible = game.classList.contains('milk-pouring');
      if (stream.visible && pitcherObj && cupObj && cupLiquidMesh) {
        start.copy(pitcherObj.position).addScaledVector(up, 0.07);
        start.x -= 0.09;
        end.copy(cupObj.position).addScaledVector(up, 0.14);
        direction.subVectors(start, end);
        stream.position.copy(start).lerp(end, 0.5);
        stream.scale.set(1, direction.length(), 1);
        stream.quaternion.setFromUnitVectors(up, direction.normalize());
        cupLiquidMesh.scale.y = Math.min(0.75, cupLiquidMesh.scale.y + delta * 0.60);
        cupLiquidMesh.material.color.lerp(latte, Math.min(1, delta * 3.4));
      }
      const brewing = espressoStreamParticles?.visible || steamParticles?.visible;
      warm.intensity = brewing ? 0.82 + Math.sin(time * 4) * 0.05 : 0.75;
    };
  }
  if (module === 'doctor') {
    panel(7.2, 0.12, 0.07, 0xacc8be, 0, 0.12, -2.42);
    panel(7.2, 0.09, 0.06, 0x99b7a9, 0, 1.04, -2.42);
    panel(1.5, 0.09, 0.45, 0xcfdedc, 0.7, 2.85, -0.54);
    glow(1.39, 0.018, 0.36, 0xebfffd, 0.7, 2.797, -0.54);
    panel(1.26, 0.05, 0.07, 0x9daeab, 2.46, 2.54, -2.16);
    for (let i = 0; i < 12; i++) {
      place(cyl(0.072, 0.072, 1.39, i % 2 ? 0x79aaa3 : 0x9ac6bb), 1.96 + i * 0.088, 1.815, -2.22 + (i % 2) * 0.04);
    }
    const sensor = glow(0.025, 0.025, 0.02, 0x51e6bf, 1.81, 1.74, -2.437);
    return time => {
      sensor.material.emissiveIntensity = docVitals.spo2 ? 0.35 + Math.pow(Math.max(0, Math.sin(time * 10)), 3) : 0.02;
    };
  }

  // Guard rail and status fixtures in the maintenance bay.
  for (const x of [-3.65, 3.65]) {
    panel(0.15, 2.78, 0.15, 0x3d4b52, x, 1.39, -2.26);
    panel(0.36, 0.10, 0.23, 0xb48732, x, 0.05, -2.25);
    panel(0.32, 0.79, 0.06, 0x243238, x, 1.71, -2.14);
  }
  for (const x of [-2.65, 2.65]) {
    panel(1.16, 0.13, 0.50, 0x343738, x, 3.16, -0.94);
    glow(1.02, 0.02, 0.37, 0xffe2b7, x, 3.084, -0.94);
  }
  const power = glow(0.125, 0.07, 0.025, 0xf25f4c, -3.65, 1.86, -2.092);
  const pressure = glow(0.125, 0.07, 0.025, 0xffbd5b, 3.65, 1.86, -2.092);
  return time => {
    const energized = safetyState.powerState === 'ON';
    const vented = safetyState.valvePressure === 'ZERO';
    power.material.emissive.setHex(energized ? 0xf25f4c : 0x48d8af);
    pressure.material.emissive.setHex(vented ? 0x48d8af : 0xffbd5b);
    power.material.emissiveIntensity = energized ? 0.9 + Math.sin(time * 3) * 0.22 : 0.75;
  };
}

function updateRoomAtmosphere(time, delta) {
  if (!GFX.room?.parent || GFX.room.name !== currentProfession + 'Environment') return;
  GFX.roomFrame?.(time, delta);
}

