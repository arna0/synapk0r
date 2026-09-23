// SynapKor — Module "Safety engineer": sounds, procedural textures, 3D workshop, LOTO logic.

// ================= INDUSTRIAL PROCEDURAL SOUNDS =================
function startTransformerHum() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    if (transformerHumGain) return;

    transformerOsc1 = ctx.createOscillator();
    transformerOsc2 = ctx.createOscillator();
    transformerHumGain = ctx.createGain();

    transformerOsc1.type = 'sawtooth';
    transformerOsc1.frequency.setValueAtTime(50, ctx.currentTime); // 50 Hz EU/CIS standard mains

    transformerOsc2.type = 'sine';
    transformerOsc2.frequency.setValueAtTime(100, ctx.currentTime); // 100 Hz harmonic

    transformerHumGain.gain.setValueAtTime(0.001, ctx.currentTime);
    transformerHumGain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.0);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, ctx.currentTime);

    transformerOsc1.connect(filter);
    transformerOsc2.connect(filter);
    filter.connect(transformerHumGain);
    transformerHumGain.connect(ctx.destination);

    transformerOsc1.start();
    transformerOsc2.start();
  } catch(e){}
}

function stopTransformerHum() {
  try {
    if (transformerHumGain) {
      const ctx = getAudioContext();
      transformerHumGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      setTimeout(() => {
        if (transformerOsc1) { try { transformerOsc1.stop(); transformerOsc2.stop(); } catch(e){} }
        transformerOsc1 = null;
        transformerOsc2 = null;
        transformerHumGain = null;
      }, 550);
    }
  } catch(e){}
}

function playBreakerClack() {
  // Heavy mechanical metallic clack
  playTone(180, 'sawtooth', 0.18, 0.25);
  playNoise(0.22, 600, 0.28);
  setTimeout(() => playTone(80, 'triangle', 0.28, 0.35), 40);
}

function playValveHiss() {
  playNoise(1.6, 1800, 0.25);
  playTone(320, 'sine', 1.2, 0.08);
}

function playMultimeterBeep() {
  playTone(2400, 'sine', 0.12, 0.22);
}

function playAlarmBuzzer() {
  playTone(160, 'sawtooth', 0.35, 0.3);
  setTimeout(() => playTone(140, 'sawtooth', 0.35, 0.3), 180);
}

function showSafetyAlert(text) {
  const banner = document.getElementById('safetyAlertBanner');
  const textEl = document.getElementById('safetyAlertText');
  if (!banner || !textEl) return;
  textEl.innerText = text;
  banner.style.display = 'flex';
  clearTimeout(banner._hideTimer);
  banner._hideTimer = setTimeout(() => {
    banner.style.display = 'none';
  }, 3200);
}

// ================= PROCEDURAL TEXTURE GENERATORS =================
function createHazardStripeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFC107'; // Vivid safety yellow
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#1A1A1A'; // Dark hazard stripes
  const stripeWidth = 32;
  for (let i = -256; i < 512; i += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 256, 256);
    ctx.lineTo(i + 256 + stripeWidth, 256);
    ctx.lineTo(i + stripeWidth, 0);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createVoltageWarningTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFCC00';
  ctx.fillRect(0, 0, 512, 256);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(6, 6, 500, 244);

  // Hazard Triangle
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(110, 40);
  ctx.lineTo(190, 190);
  ctx.lineTo(30, 190);
  ctx.closePath();
  ctx.fill();

  // Lightning symbol
  ctx.fillStyle = '#FFCC00';
  ctx.beginPath();
  ctx.moveTo(115, 65);
  ctx.lineTo(95, 120);
  ctx.lineTo(115, 120);
  ctx.lineTo(95, 175);
  ctx.lineTo(135, 110);
  ctx.lineTo(115, 110);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ОПАСНО: 380 В', 220, 90);
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ВЫСОКОЕ НАПРЯЖЕНИЕ', 220, 130);
  ctx.font = '16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('НЕ ВКЛЮЧАТЬ! РАБОТАЮТ ЛЮДИ', 220, 170);

  return new THREE.CanvasTexture(canvas);
}

function createLotoSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 512, 256);

  // Red Danger Header
  ctx.fillStyle = '#D32F2F';
  ctx.fillRect(8, 8, 496, 70);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DANGER / ОПАСНО', 256, 56);

  // Body text
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('НЕ ВКЛЮЧАТЬ!', 256, 130);
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('РАБОТАЮТ ЛЮДИ НА ЛИНИИ', 256, 170);
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillStyle = '#B91C1C';
  ctx.fillText('LOCKOUT / TAGOUT PROTOCOL', 256, 210);

  return new THREE.CanvasTexture(canvas);
}

function createDialTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Face background
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#334155';
  ctx.stroke();

  // Scale Arc
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#64748B';
  ctx.beginPath();
  ctx.arc(128, 128, 90, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  // Colored Zones
  if (type === 'volts') {
    // Red warning zone > 400V
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 128, 90, Math.PI * 1.85, Math.PI * 2.25);
    ctx.stroke();
  } else if (type === 'pressure1' || type === 'pressure2') {
    // Green zone
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 128, 90, Math.PI * 0.75, Math.PI * 1.4);
    ctx.stroke();
    // Red zone
    ctx.strokeStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(128, 128, 90, Math.PI * 1.6, Math.PI * 2.25);
    ctx.stroke();
  }

  // Ticks & Labels
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  if (type === 'volts') {
    ctx.fillText('0', 60, 180);
    ctx.fillText('220', 70, 90);
    ctx.fillText('380', 128, 60);
    ctx.fillText('500', 190, 180);
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('VOLTS ~ 50Hz', 128, 175);
  } else if (type === 'pressure1') {
    ctx.fillText('0', 60, 180);
    ctx.fillText('4', 70, 90);
    ctx.fillText('8.5', 128, 60);
    ctx.fillText('16', 190, 180);
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('STEAM (BAR)', 128, 175);
  } else {
    ctx.fillText('0', 60, 180);
    ctx.fillText('3', 70, 90);
    ctx.fillText('6.2', 128, 60);
    ctx.fillText('10', 190, 180);
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PNEUMATIC (BAR)', 128, 175);
  }

  return new THREE.CanvasTexture(canvas);
}

// ================= 3D SAFETY ENVIRONMENT BUILDER =================
function build3DSafetyEnvironment() {
  if (!scene) return;
  safetyGroup = new THREE.Group();
  safetyGroup.name = 'safetyEnvironment';
  interactiveObjects = [];
  hoveredObject = null;

  // 1. Industrial Concrete Floor with Clearance Hazard Stripes
  const floorGeo = new THREE.PlaneGeometry(12, 12);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x4A4D52,
    roughness: 0.9,
    metalness: 0.0
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  safetyGroup.add(floor);

  // Hazard Safety Striped Zone directly in front of the switchboard
  const hazardTex = createHazardStripeTexture();
  hazardTex.repeat.set(4, 2);
  const hazardGeo = new THREE.PlaneGeometry(3.6, 1.8);
  const hazardMat = new THREE.MeshStandardMaterial({
    map: hazardTex,
    roughness: 0.6
  });
  const hazardFloor = new THREE.Mesh(hazardGeo, hazardMat);
  hazardFloor.rotation.x = -Math.PI / 2;
  hazardFloor.position.set(0, 0.01, -0.4);
  hazardFloor.receiveShadow = true;
  safetyGroup.add(hazardFloor);

  // 2. Concrete & Corrugated Steel Factory Walls
  const backWallGeo = new THREE.PlaneGeometry(12, 5.5);
  const backWallMat = new THREE.MeshStandardMaterial({
    color: 0x5C6168,
    roughness: 0.95,
    metalness: 0.0
  });
  const backWall = new THREE.Mesh(backWallGeo, backWallMat);
  backWall.position.set(0, 2.75, -2.5);
  backWall.receiveShadow = true;
  safetyGroup.add(backWall);

  // Side Walls
  const sideWallGeo = new THREE.PlaneGeometry(12, 5.5);
  const leftWall = new THREE.Mesh(sideWallGeo, backWallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-5.5, 2.75, 0);
  safetyGroup.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeo, backWallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(5.5, 2.75, 0);
  safetyGroup.add(rightWall);

  // Structural Steel I-Beams (Pillars)
  for (let x of [-3.2, 3.2]) {
    const pillarGeo = new THREE.BoxGeometry(0.3, 5.5, 0.3);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8, roughness: 0.3 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, 2.75, -2.35);
    safetyGroup.add(pillar);
  }

  // Overhead Cable Tray across the ceiling
  const trayGeo = new THREE.BoxGeometry(10, 0.1, 0.6);
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x4B5563, metalness: 0.9, roughness: 0.3, wireframe: false });
  const cableTray = new THREE.Mesh(trayGeo, trayMat);
  cableTray.position.set(0, 4.2, -1.8);
  safetyGroup.add(cableTray);

  // Heavy Industrial Wall Pipes (Steam & Pneumatic)
  const steamPipeMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.4, metalness: 0.6 }); // Yellow/Orange
  const steamPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9.0, 16), steamPipeMat);
  steamPipe.rotation.z = Math.PI / 2;
  steamPipe.position.set(0, 3.7, -2.4);
  safetyGroup.add(steamPipe);

  const airPipeMat = new THREE.MeshStandardMaterial({ color: 0x0284C7, roughness: 0.4, metalness: 0.6 }); // Blue
  const airPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 9.0, 16), airPipeMat);
  airPipe.rotation.z = Math.PI / 2;
  airPipe.position.set(0, 3.45, -2.4);
  safetyGroup.add(airPipe);

  // 3. Safety Warning Signs on Wall
  const voltSignGeo = new THREE.PlaneGeometry(1.2, 0.6);
  const voltSignMat = new THREE.MeshBasicMaterial({ map: createVoltageWarningTexture() });
  const voltSign = new THREE.Mesh(voltSignGeo, voltSignMat);
  voltSign.position.set(-1.8, 2.9, -2.48);
  safetyGroup.add(voltSign);

  const lotoSignGeo = new THREE.PlaneGeometry(1.2, 0.6);
  const lotoSignMat = new THREE.MeshBasicMaterial({ map: createLotoSignTexture() });
  const lotoSign = new THREE.Mesh(lotoSignGeo, lotoSignMat);
  lotoSign.position.set(1.8, 2.9, -2.48);
  safetyGroup.add(lotoSign);

  // ================= HIGH VOLTAGE SWITCHGEAR CABINET =================
  const cabinetGroup = new THREE.Group();
  cabinetGroup.position.set(0, 1.1, -1.35);

  // Main Heavy Steel Cabinet (RAL 7035 Industrial Grey)
  const cabGeo = new THREE.BoxGeometry(2.4, 2.2, 0.7);
  const cabMat = new THREE.MeshStandardMaterial({
    color: 0x9DA4AC, // RAL 7035 light grey
    metalness: 0.2,
    roughness: 0.55
  });
  const cabinet = new THREE.Mesh(cabGeo, cabMat);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  cabinetGroup.add(cabinet);

  // Cabinet Door Bevel Frame
  const frameGeo = new THREE.BoxGeometry(2.32, 2.12, 0.04);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x7D858E, metalness: 0.2, roughness: 0.5 });
  const doorFrame = new THREE.Mesh(frameGeo, frameMat);
  doorFrame.position.set(0, 0, 0.36);
  cabinetGroup.add(doorFrame);

  // Copper Grounding Busbar at bottom
  const busbarGeo = new THREE.BoxGeometry(2.0, 0.05, 0.03);
  const busbarMat = new THREE.MeshStandardMaterial({ color: 0xB45309, metalness: 0.95, roughness: 0.2 });
  const busbar = new THREE.Mesh(busbarGeo, busbarMat);
  busbar.position.set(0, -0.95, 0.38);
  cabinetGroup.add(busbar);

  // ----------------- 1. MAIN KNIFE SWITCH / BREAKER -----------------
  const breakerGroup = new THREE.Group();
  breakerGroup.name = 'mainBreaker';
  breakerGroup.position.set(0, 0.05, 0.40);

  // Base plate
  const bPlateGeo = new THREE.BoxGeometry(0.45, 0.65, 0.06);
  const bPlateMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.5, metalness: 0.7 });
  breakerBase = new THREE.Mesh(bPlateGeo, bPlateMat);
  breakerGroup.add(breakerBase);

  // Pivot Joint
  const pivotJoint = new THREE.Group();
  pivotJoint.position.set(0, 0, 0.04);

  // Breaker Handle / Lever
  const handleBarGeo = new THREE.BoxGeometry(0.06, 0.34, 0.04);
  const handleBarMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.3, metalness: 0.8 }); // Warning Orange/Yellow
  const handleBar = new THREE.Mesh(handleBarGeo, handleBarMat);
  handleBar.position.set(0, 0.17, 0);

  // Red Ergonomic Grip Knob
  const knobGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16);
  const knobMat = new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.2 });
  const knob = new THREE.Mesh(knobGeo, knobMat);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(0, 0.34, 0);
  handleBar.add(knob);

  // Padlock Hasp (Проушина под замок LOTO)
  const haspGeo = new THREE.TorusGeometry(0.03, 0.008, 8, 16);
  const haspMat = new THREE.MeshStandardMaterial({ color: 0x94A3B8, metalness: 0.95 });
  const hasp = new THREE.Mesh(haspGeo, haspMat);
  hasp.position.set(0, 0.02, 0.03);
  breakerGroup.add(hasp);

  pivotJoint.add(handleBar);
  breakerGroup.add(pivotJoint);
  mainBreakerLever = pivotJoint;

  // Set initial ON position (angled UP +35 deg)
  mainBreakerLever.rotation.z = -0.6; // ON position

  // 3D LOTO Padlock Model (attached to hasp when lockoutApplied is true)
  const lotoGroup = new THREE.Group();
  lotoGroup.name = 'lotoPadlock';
  lotoGroup.position.set(0, -0.04, 0.05);

  // Red Padlock Body
  const padBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.10, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xDC2626, roughness: 0.3 })
  );
  lotoGroup.add(padBody);

  // Brass Shackle
  const shackle = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.008, 8, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xF59E0B, metalness: 0.9, roughness: 0.2 })
  );
  shackle.position.set(0, 0.05, 0);
  lotoGroup.add(shackle);

  // Yellow LOTO Tag
  const tagMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.14),
    new THREE.MeshBasicMaterial({ color: 0xFEF08A })
  );
  tagMesh.position.set(0.06, -0.03, 0.02);
  lotoGroup.add(tagMesh);

  lotoGroup.visible = false;
  lotoPadlockMesh = lotoGroup;
  breakerGroup.add(lotoPadlockMesh);

  cabinetGroup.add(breakerGroup);
  interactiveObjects.push(breakerGroup);

  // ----------------- 2. 3 DIAL METERS (VOLTS, P1, P2) -----------------
  const dialConfigs = [
    { name: 'meter1', type: 'volts', x: -0.65, y: 0.65 },
    { name: 'meter2', type: 'pressure1', x: 0.0, y: 0.65 },
    { name: 'meter3', type: 'pressure2', x: 0.65, y: 0.65 }
  ];

  dialConfigs.forEach((cfg) => {
    const dialGroup = new THREE.Group();
    dialGroup.name = cfg.name;
    dialGroup.position.set(cfg.x, cfg.y, 0.37);

    // Dial Housing Rim
    const rimGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.04, 32);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.9, roughness: 0.15 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    dialGroup.add(rim);

    // Dial Face with Canvas Texture
    const faceGeo = new THREE.CircleGeometry(0.18, 32);
    const faceMat = new THREE.MeshBasicMaterial({ map: createDialTexture(cfg.type) });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 0, 0.022);
    dialGroup.add(face);

    // Animated Needle Pointer
    const needleGeo = new THREE.BoxGeometry(0.008, 0.14, 0.005);
    const needleMat = new THREE.MeshBasicMaterial({ color: 0xDC2626 });
    const needle = new THREE.Mesh(needleGeo, needleMat);
    needle.geometry.translate(0, 0.06, 0); // pivot at base
    needle.position.set(0, 0, 0.025);
    dialGroup.add(needle);

    // Center Pin
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.01, 16),
      new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    pin.rotation.x = Math.PI / 2;
    pin.position.set(0, 0, 0.03);
    dialGroup.add(pin);

    if (cfg.type === 'volts') meter1Needle = needle;
    else if (cfg.type === 'pressure1') meter2Needle = needle;
    else if (cfg.type === 'pressure2') meter3Needle = needle;

    cabinetGroup.add(dialGroup);
    interactiveObjects.push(dialGroup);
  });

  // ----------------- 3. 2 PRESSURE RELIEF VALVES -----------------
  const valveConfigs = [
    { name: 'valve1', x: -1.25, y: -0.2, rotZ: Math.PI / 2 },
    { name: 'valve2', x: 1.25, y: -0.2, rotZ: -Math.PI / 2 }
  ];

  valveConfigs.forEach((cfg, idx) => {
    const valveGroup = new THREE.Group();
    valveGroup.name = cfg.name;
    valveGroup.position.set(cfg.x, cfg.y, 0.15);

    // Pipe stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.35, 16),
      new THREE.MeshStandardMaterial({ color: 0x64748B, metalness: 0.8, roughness: 0.3 })
    );
    stem.rotation.z = cfg.rotZ;
    valveGroup.add(stem);

    // Red Cast Iron Handwheel (Маховик)
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(idx === 0 ? -0.2 : 0.2, 0, 0);

    const rimMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.022, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xDC2626, metalness: 0.4, roughness: 0.35 })
    );
    wheelGroup.add(rimMesh);

    // Spokes
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.26, 8),
        new THREE.MeshStandardMaterial({ color: 0xDC2626 })
      );
      spoke.rotation.z = (Math.PI / 4) * s;
      wheelGroup.add(spoke);
    }

    // Valve Exhaust Nozzle pointing downward
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.15, 12),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 })
    );
    nozzle.position.set(0, -0.15, 0);
    valveGroup.add(nozzle);

    wheelGroup.rotation.y = Math.PI / 2;
    valveGroup.add(wheelGroup);

    if (idx === 0) valve1Wheel = wheelGroup;
    else valve2Wheel = wheelGroup;

    // Steam Particle System
    const pCount = 35;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 0.1;
      pPos[i+1] = -Math.random() * 0.6;
      pPos[i+2] = (Math.random() - 0.5) * 0.1;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xE2E8F0,
      size: 0.07,
      transparent: true,
      opacity: 0.7
    });
    const steamSystem = new THREE.Points(pGeo, pMat);
    steamSystem.position.set(0, -0.2, 0);
    steamSystem.visible = false;
    valveGroup.add(steamSystem);

    if (idx === 0) steamParticles1 = steamSystem;
    else steamParticles2 = steamSystem;

    cabinetGroup.add(valveGroup);
    interactiveObjects.push(valveGroup);
  });

  // ----------------- 4. STATUS LED PANEL & DIGITAL DISPLAY -----------------
  const ledPanel = new THREE.Group();
  ledPanel.position.set(0, 0.96, 0.37);

  // Red LED (DANGER: LIVE POWER)
  const redGeo = new THREE.SphereGeometry(0.04, 16, 16);
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xFF0000,
    emissive: 0xFF0000,
    emissiveIntensity: 1.8,
    roughness: 0.2
  });
  redLedMesh = new THREE.Mesh(redGeo, redMat);
  redLedMesh.position.set(-0.25, 0, 0);
  ledPanel.add(redLedMesh);

  // Green LED (SAFE: DISCONNECTED)
  const greenGeo = new THREE.SphereGeometry(0.04, 16, 16);
  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x00FF66,
    emissive: 0x00FF66,
    emissiveIntensity: 0.05,
    roughness: 0.2
  });
  greenLedMesh = new THREE.Mesh(greenGeo, greenMat);
  greenLedMesh.position.set(0.25, 0, 0);
  ledPanel.add(greenLedMesh);

  cabinetGroup.add(ledPanel);

  // ----------------- 5. TEST TERMINALS BUSBAR -----------------
  const testTerminals = new THREE.Group();
  testTerminals.name = 'testTerminals';
  testTerminals.position.set(0, -0.55, 0.38);

  const termBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.2, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.7 })
  );
  testTerminals.add(termBox);

  // 3 Test Terminal Studs (L1, L2, L3)
  for (let t = -1; t <= 1; t++) {
    const stud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xF59E0B, metalness: 0.95 }) // Brass studs
    );
    stud.rotation.x = Math.PI / 2;
    stud.position.set(t * 0.18, 0, 0.035);
    testTerminals.add(stud);
  }
  cabinetGroup.add(testTerminals);
  interactiveObjects.push(testTerminals);

  safetyGroup.add(cabinetGroup);

  // ================= EMERGENCY ROTATING STROBE BEACON =================
  emergencyBeaconGroup = new THREE.Group();
  emergencyBeaconGroup.position.set(0, 3.25, -2.4);

  // Base bracket
  const bBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8 })
  );
  bBase.rotation.x = Math.PI / 2;
  emergencyBeaconGroup.add(bBase);

  // Ribbed Fluted Red Polycarbonate Dome
  const bDome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.22, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0xDC2626,
      emissive: 0xDC2626,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      transmission: 0.6
    })
  );
  bDome.rotation.x = Math.PI / 2;
  bDome.position.set(0, 0, 0.12);
  emergencyBeaconDome = bDome;
  emergencyBeaconGroup.add(bDome);

  // Internal Rotating Reflector
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.15, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.98 })
  );
  rotor.position.set(0, 0, 0.12);
  emergencyBeaconRotor = rotor;
  emergencyBeaconGroup.add(rotor);

  // Dynamic Pulsating Point Light
  emergencyBeaconLight = new THREE.PointLight(0xFF2A2A, 2.2, 10, 1.5);
  emergencyBeaconLight.position.set(0, 0, 0.18);
  emergencyBeaconGroup.add(emergencyBeaconLight);

  safetyGroup.add(emergencyBeaconGroup);

  // ================= PPE STORAGE STAND (LEFT WALL) =================
  const ppeStand = new THREE.Group();
  ppeStand.name = 'ppeStand';
  ppeStand.position.set(-4.5, 1.6, -1.0);

  const standCabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.2, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x0284C7, metalness: 0.5, roughness: 0.3 })
  );
  ppeStand.add(standCabinet);

  // Stand Sign
  const ppeSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.2),
    new THREE.MeshBasicMaterial({ map: createTextTexture([
      { text: 'СИЗ', font: '800 54px "Plus Jakarta Sans", sans-serif' },
      { text: 'перчатки · щиток', font: '600 22px "Plus Jakarta Sans", sans-serif' }
    ], '#FFFFFF', '#0B4A8B') })
  );
  ppeSign.position.set(0, 0.45, 0.13);
  ppeStand.add(ppeSign);

  safetyGroup.add(ppeStand);
  interactiveObjects.push(ppeStand);

  // Gloves hanging on the PPE cabinet so it reads as a PPE station
  for (const gx of [-0.12, 0.12]) {
    const glove = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.22, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xFFB703, roughness: 0.6 })
    );
    glove.position.set(gx, 0.05, 0.15);
    ppeStand.add(glove);
  }
  safetyGroup.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  floor.castShadow = false;

  scene.add(safetyGroup);
  rebuildObjectLabels();
}

// ================= FPS HANDS GLOVES CUSTOMIZATION =================
function updateFPSHandsForPPE(isEquipped) {
  if (!handsGroup) return;
  handsGroup.traverse((child) => {
    if (child.isMesh && child.name.includes('Hand')) {
      if (isEquipped) {
        // Dielectric Rubber Safety Gloves (High-visibility Yellow/Orange)
        child.material.color.setHex(0xFFB703);
        child.material.roughness = 0.4;
        child.material.metalness = 0.05;
      } else {
        // Standard work hands (restore original colors)
        child.material.color.setHex(child.userData.baseColor !== undefined ? child.userData.baseColor : 0x334155);
        child.material.roughness = 0.5;
        child.material.metalness = 0.2;
      }
    }
  });
}

// ================= INVENTORY & TOOLS INTERACTION =================
function togglePPE() {
  safetyState.ppeEquipped = !safetyState.ppeEquipped;
  const invSlot = document.getElementById('invPPE');
  const pill = document.getElementById('pillPPE');
  const dot = document.getElementById('dotPPE');
  const text = document.getElementById('textPPE');

  if (safetyState.ppeEquipped) {
    if (invSlot) invSlot.classList.add('equipped');
    if (pill) { pill.className = 'safety-hud-pill safe'; }
    if (dot) { dot.className = 'status-dot safe'; }
    if (text) { text.innerText = 'СИЗ: ДИЭЛЕКТРИЧЕСКИЕ ПЕРЧАТКИ (1000В)'; }
    updateFPSHandsForPPE(true);
    playSuccessChime();
    showComboPopup('🧤 СИЗ ЭКИПИРОВАНЫ: ДОПУСК К ЩИТУ! +100 XP');
    logAction('EQUIP_PPE_SUCCESS', Date.now(), true);
  } else {
    if (invSlot) invSlot.classList.remove('equipped');
    if (pill) { pill.className = 'safety-hud-pill warning'; }
    if (dot) { dot.className = 'status-dot warning'; }
    if (text) { text.innerText = 'СИЗ: НЕ НАДЕТЫ'; }
    updateFPSHandsForPPE(false);
    logAction('UNEQUIP_PPE', Date.now(), false);
  }
}

function selectInventoryTool(toolId) {
  if (safetyState.selectedTool === toolId) {
    safetyState.selectedTool = null;
  } else {
    safetyState.selectedTool = toolId;
  }

  document.querySelectorAll('.safety-inv-slot').forEach(s => s.classList.remove('active'));
  const multimeterHud = document.getElementById('multimeterHud');

  if (safetyState.selectedTool === 'multimeter') {
    const slot = document.getElementById('invMultimeter');
    if (slot) slot.classList.add('active');
    if (multimeterHud) multimeterHud.style.display = 'flex';
    playMultimeterBeep();
    updateMultimeterDisplay();
  } else {
    if (multimeterHud) multimeterHud.style.display = 'none';
  }

  if (safetyState.selectedTool === 'loto') {
    const slot = document.getElementById('invLOTO');
    if (slot) slot.classList.add('active');
    showComboPopup('🔒 Выбран замок LOTO: Наведите на рубильник [E]');
  }
}

function toggleMultimeterTool(show) {
  if (!show) {
    safetyState.selectedTool = null;
    const slot = document.getElementById('invMultimeter');
    if (slot) slot.classList.remove('active');
    const hud = document.getElementById('multimeterHud');
    if (hud) hud.style.display = 'none';
  }
}

function updateMultimeterDisplay() {
  const digits = document.getElementById('lcdDigits');
  const tag = document.getElementById('multimeterStatusTag');
  if (!digits || !tag) return;

  if (safetyState.powerState === 'ON') {
    digits.innerText = (378.0 + Math.random() * 4.5).toFixed(1);
    tag.className = 'multimeter-status-tag danger';
    tag.innerText = '⚡ ОПАСНОЕ НАПРЯЖЕНИЕ (380V)';
  } else {
    digits.innerText = '000.0';
    tag.className = 'multimeter-status-tag safe';
    tag.innerText = '🟢 ОБЕСТОЧЕНО (0.00 V RMS)';
  }
}

function testVoltageWithMultimeter() {
  if (isActionInProgress) return;
  isActionInProgress = true;
  playMultimeterBeep();
  animateHandPunch(() => {
    isActionInProgress = false;
    updateMultimeterDisplay();
    if (safetyState.powerState === 'ON') {
      safetyState.errors++;
      logAction('TEST_VOLTAGE_LIVE_DANGER', Date.now(), false);
      showSafetyAlert('⚡ ВНИМАНИЕ! Напряжение 380V НЕ снято! Опасность поражения током!');
    } else {
      safetyState.voltageTested = true;
      logAction('TEST_VOLTAGE_CONFIRMED_ZERO', Date.now(), true);
      showComboPopup('🟢 НАПРЯЖЕНИЕ ОТСУТСТВУЕТ (0.0V): БЕЗОПАСНО +150 XP');
      checkSafetyCompletion();
    }
  });
}

// ================= MAIN INTERACTION ROUTER =================
function handleSafetyInteraction(targetName) {
  if (isActionInProgress) return;

  // 0. LOTO PADLOCK (tool selected + breaker targeted)
  if (targetName === 'lotoPadlock' || (targetName === 'mainBreaker' && safetyState.selectedTool === 'loto')) {
    applyLotoLock();
    return;
  }

  // 1. MAIN HIGH-VOLTAGE BREAKER
  if (targetName === 'mainBreaker') {
    if (!safetyState.ppeEquipped) {
      safetyState.errors++;
      playAlarmBuzzer();
      showSafetyAlert('⚠️ НАРУШЕНИЕ ТБ! Запрещено касаться рубильника без диэлектрических перчаток (СИЗ)!');
      logAction('VIOLATION_BREAKER_NO_PPE', Date.now(), false);
      return;
    }

    if (safetyState.lockoutApplied) {
      showSafetyAlert('🔒 Рубильник заблокирован навесным замком LOTO! Снятие запрещено регламентом.');
      return;
    }

    if (safetyState.powerState === 'ON') {
      isActionInProgress = true;
      animateHandPunch(() => {
        playBreakerClack();
        stopTransformerHum();
        if (mainBreakerLever) mainBreakerLever.rotation.z = 0.6; // Angled DOWN (OFF)
        safetyState.powerState = 'OFF';

        // Update HUD Pill
        const pill = document.getElementById('pillPower');
        const dot = document.getElementById('dotPower');
        const text = document.getElementById('textPower');
        if (pill) pill.className = 'safety-hud-pill safe';
        if (dot) dot.className = 'status-dot safe';
        if (text) text.innerText = 'ПИТАНИЕ: 0.0V OFF (ОБЕСТОЧЕНО)';

        showComboPopup('⚡ РУБИЛЬНИК ВЫКЛЮЧЕН! ПОРЯДОК ВЕРЕН +150 XP');
        logAction('SWITCH_POWER_BREAKER_OFF', Date.now(), true);
        isActionInProgress = false;
        checkSafetyCompletion();
      });
    } else {
      showSafetyAlert('💡 Рубильник уже обесточен. Установите замок LOTO [3] и проверьте напряжение [2].');
    }
    return;
  }

  // 3. PRESSURE RELIEF VALVES
  if (targetName === 'valve1') {
    operateValve(0);
    return;
  }
  if (targetName === 'valve2') {
    operateValve(1);
    return;
  }

  // 4. TEST TERMINALS
  if (targetName === 'testTerminals') {
    if (safetyState.selectedTool !== 'multimeter') {
      showSafetyAlert('💡 Возьмите мультиметр [2], чтобы выполнить замер на шинах.');
      return;
    }
    testVoltageWithMultimeter();
    return;
  }

  // 5. PPE STAND
  if (targetName === 'ppeStand') {
    togglePPE();
    return;
  }
}

function applyLotoLock() {
  if (safetyState.powerState === 'ON') {
    safetyState.errors++;
    playAlarmBuzzer();
    showSafetyAlert('⚠️ ГРУБОЕ НАРУШЕНИЕ ТБ! Запрещено устанавливать замок LOTO на включенный рубильник!');
    logAction('VIOLATION_LOTO_WHILE_POWER_ON', Date.now(), false);
    return;
  }

  if (safetyState.lockoutApplied) {
    showSafetyAlert('🔒 Замок LOTO уже установлен на рубильнике.');
    return;
  }

  if (!safetyState.ppeEquipped) {
    safetyState.errors++;
    playAlarmBuzzer();
    showSafetyAlert('⚠️ НАРУШЕНИЕ ТБ! Установка замка LOTO на щит без диэлектрических перчаток (СИЗ) запрещена!');
    logAction('VIOLATION_LOTO_NO_PPE', Date.now(), false);
    return;
  }

  isActionInProgress = true;
  animateHandPunch(() => {
    if (lotoPadlockMesh) lotoPadlockMesh.visible = true;
    safetyState.lockoutApplied = true;
    playBreakerClack();
    playSuccessChime();

    const pill = document.getElementById('pillLOTO');
    const dot = document.getElementById('dotLOTO');
    const text = document.getElementById('textLOTO');
    if (pill) pill.className = 'safety-hud-pill safe';
    if (dot) dot.className = 'status-dot safe';
    if (text) text.innerText = 'LOTO: БЛОКИРОВКА АКТИВНА';

    showComboPopup('🔒 LOTO ЗАМОК УСТАНОВЛЕН: НЕ ВКЛЮЧАТЬ! +150 XP');
    logAction('APPLY_LOTO_LOCK_SUCCESS', Date.now(), true);
    if (safetyState.selectedTool === 'loto') selectInventoryTool('loto');
    isActionInProgress = false;
    checkSafetyCompletion();
  });
}

function operateValve(idx) {
  if (safetyState.valvesOpened[idx]) {
    showSafetyAlert(`Клапан ${idx + 1} уже открыт, давление стравливается.`);
    return;
  }

  isActionInProgress = true;
  animateHandPunch(() => {
    playValveHiss();
    const wheel = idx === 0 ? valve1Wheel : valve2Wheel;
    const particles = idx === 0 ? steamParticles1 : steamParticles2;
    if (wheel) wheel.rotation.z += Math.PI * 2;
    if (particles) particles.visible = true;

    safetyState.valvesOpened[idx] = true;

    if (safetyState.valvesOpened[0] && safetyState.valvesOpened[1]) {
      safetyState.valvePressure = 'ZERO';
      const pill = document.getElementById('pillPressure');
      const dot = document.getElementById('dotPressure');
      const text = document.getElementById('textPressure');
      if (pill) pill.className = 'safety-hud-pill safe';
      if (dot) dot.className = 'status-dot safe';
      if (text) text.innerText = 'ДАВЛЕНИЕ: 0.0 БАР (СБРОШЕНО)';
      showComboPopup('💨 ДАВЛЕНИЕ В КОНТУРАХ ПОЛНОСТЬЮ СБРОШЕНО! +150 XP');
      logAction('PRESSURE_VALVES_RELIEVED_ZERO', Date.now(), true);
    } else {
      safetyState.valvePressure = 'NORMAL';
      const text = document.getElementById('textPressure');
      if (text) text.innerText = 'ДАВЛЕНИЕ: 4.0 БАР (СТРАВЛИВАНИЕ)';
      showComboPopup(`💨 Клапан ${idx + 1} открыт: стравливание давления +75 XP`);
      logAction(`OPEN_VALVE_${idx + 1}_PRESSURE_RELIEF`, Date.now(), true);
    }

    isActionInProgress = false;
    checkSafetyCompletion();
  });
}

function checkSafetyCompletion() {
  const isReady = (
    safetyState.ppeEquipped &&
    safetyState.powerState === 'OFF' &&
    safetyState.lockoutApplied &&
    safetyState.voltageTested &&
    safetyState.valvePressure === 'ZERO'
  );

  if (isReady && !safetyState.completed) {
    safetyState.completed = true;
    clearInterval(state.timerInterval);
    setTimeout(() => {
      // Deactivate Emergency Strobe & turn on steady Green Safe Beacon
      if (emergencyBeaconLight) emergencyBeaconLight.intensity = 0;
      if (greenLedMesh) greenLedMesh.material.emissiveIntensity = 2.0;

      playVictoryFanfare();
      logAction('SAFETY_EQUIPMENT_READY_ALL_CLEAR', Date.now(), true);

      // Display Victory Modal
      const modal = document.getElementById('victoryModal');
      if (modal) {
        document.getElementById('victoryTitle').innerText = 'Регламент безопасности успешно выполнен!';
        document.getElementById('victoryText').innerHTML = `
          <strong>Оборудование обесточено (0.0V), заблокировано по LOTO, а давление сброшено до 0 бар.</strong><br>
          Ошибок нарушения ТБ: <span style="color:${safetyState.errors === 0 ? '#10B981' : '#EF4444'}; font-weight:bold;">${safetyState.errors}</span><br>
          Специалист полностью готов к безопасному ТО агрегатов.
        `;
        modal.style.display = 'flex';
      }
    }, 500);
  }
}

// ================= START SAFETY VR ENTRY POINT =================
function startSafetyVR() {
  currentProfession = 'safety';
  document.getElementById('gameScreen').classList.add('safety-mode');
  isActionInProgress = false;

  safetyState.powerState = 'ON';
  safetyState.valvePressure = 'HIGH';
  safetyState.ppeEquipped = false;
  safetyState.lockoutApplied = false;
  safetyState.voltageTested = false;
  safetyState.valvesOpened = [false, false];
  safetyState.selectedTool = null;
  safetyState.errors = 0;
  safetyState.completed = false;
  resetSessionEvents();

  // Reset player position strictly at eye-level y: 1.6
  applyArenaBounds('safety');
  player.pos.set(0, 1.6, 1.2);
  player.baseEyeHeight = 1.6;
  player.yaw = 0;
  player.pitch = -0.15;

  // Setup HUD UI
  document.getElementById('vrQuestTitle').innerText = 'ИНЖЕНЕР ПО ТБ: РЕГЛАМЕНТ LOTO И 380В';
  const safetyHudBar = document.getElementById('safetyHudBar');
  if (safetyHudBar) safetyHudBar.style.display = 'flex';
  const inventoryBar = document.getElementById('safetyInventoryBar');
  if (inventoryBar) inventoryBar.style.display = 'flex';
  const telemetryPanel = document.getElementById('telemetryLogPanel');
  if (telemetryPanel) telemetryPanel.style.display = 'flex';

  // Reset Pills
  document.getElementById('pillPower').className = 'safety-hud-pill danger';
  document.getElementById('dotPower').className = 'status-dot danger';
  document.getElementById('textPower').innerText = 'ПИТАНИЕ: 380V ON';

  document.getElementById('pillPressure').className = 'safety-hud-pill danger';
  document.getElementById('dotPressure').className = 'status-dot danger';
  document.getElementById('textPressure').innerText = 'ДАВЛЕНИЕ: 8.5 БАР';

  document.getElementById('pillPPE').className = 'safety-hud-pill warning';
  document.getElementById('dotPPE').className = 'status-dot warning';
  document.getElementById('textPPE').innerText = 'СИЗ: НЕ НАДЕТЫ';

  document.getElementById('pillLOTO').className = 'safety-hud-pill warning';
  document.getElementById('dotLOTO').className = 'status-dot warning';
  document.getElementById('textLOTO').innerText = 'LOTO: НЕТ';

  resetSafetyToolsUI();
  document.getElementById('vrTimer').innerText = '00:00';
  const hudDock = document.getElementById('hudDockInner');
  if (hudDock) hudDock.innerHTML = '';

  const victoryModal = document.getElementById('victoryModal');
  if (victoryModal) victoryModal.style.display = 'none';

  showScreen('gameScreen');

  setTimeout(() => {
    initThreeFPS();
    if (scene) {
      // Remove barista objects if present
      const oldBarista = scene.getObjectByName('baristaEnvironment');
      if (oldBarista) scene.remove(oldBarista);
      const oldSafety = scene.getObjectByName('safetyEnvironment');
      if (oldSafety) scene.remove(oldSafety);

      build3DSafetyEnvironment();
    }
    startTransformerHum();
    handleWindowResize();
  }, 100);

  clearInterval(state.timerInterval);
  state.timer = 0;
  state.timerInterval = setInterval(() => {
    state.timer++;
    const m = String(Math.floor(state.timer / 60)).padStart(2, '0');
    const s = String(state.timer % 60).padStart(2, '0');
    document.getElementById('vrTimer').innerText = `${m}:${s}`;
  }, 1000);

  logAction('SESSION_START_SAFETY_ENGINEER', Date.now(), true);
  setGuideVisible(guideVisible);
  showIntro('safety');
}

// Window exports for UI event handlers, Dart bridge, and tests
window.safetyState = safetyState;
window.startSafetyVR = startSafetyVR;
window.handleSafetyInteraction = handleSafetyInteraction;
window.togglePPE = togglePPE;
window.selectInventoryTool = selectInventoryTool;
window.toggleMultimeterTool = toggleMultimeterTool;
window.testVoltageWithMultimeter = testVoltageWithMultimeter;
window.applyLotoLock = applyLotoLock;
window.operateValve = operateValve;
window.logAction = logAction;
Object.defineProperty(window, 'currentProfession', { get: () => currentProfession, configurable: true });
