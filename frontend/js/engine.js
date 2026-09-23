// SynapKor — Three.js engine: renderer, lighting, render loop, barista cafe scene, FPS hands.

// ================= GAME TELEMETRY & STATE =================
const state = {
  quest: 1,
  step: 0,
  timer: 0,
  timerInterval: null,
  misclicks: 0,
  conflictChoice: '',
  conflictResponseSec: 0,
  quest2StartedAt: 0,
  budgetChoice: '',
  stepsConfig: [
    { id: 'portafilter', name: 'Взять Холдер', hint: 'Наведите прицел и нажмите [E] / Клик', popup: 'HOLDER GRABBED!' },
    { id: 'grinder', name: 'Смолоть кофе', hint: 'Наведите на кофемолку и нажмите [E]', popup: 'FRESH GRIND 18g! ☕' },
    { id: 'tamper', name: 'Затемперовать', hint: 'Наведите на темпер и нажмите [E]', popup: 'PERFECT 20kg TAMP! 🔨' },
    { id: 'espressoMachine', name: 'Сварить эспрессо', hint: 'Наведите на кофемашину и нажмите [E]', popup: 'GOLDEN CREMA! +150 XP ✨' },
    { id: 'milkPitcher', name: 'Взбить овсяное молоко', hint: 'Наведите на питчер и нажмите [E]', popup: 'SILKY MICROFOAM! 🥛' },
    { id: 'glassCup', name: 'Собрать Iced Latte', hint: 'Наведите на стакан и нажмите [E]', popup: 'ICED OAT LATTE READY! 🏆' }
  ]
};

// ================= 3D CINEMATIC GRAPHICS ENGINE =================
let scene, camera, renderer, raycaster;
let interactiveObjects = [];
let handsGroup, rightHand;
let portafilterObj, grinderObj, tamperObj, machineObj, pitcherObj, oatMilkObj, cupObj, customerObj;
let espressoStreamParticles, steamParticles, iceCubesGroup;
let cupLiquidMesh;
let baristaGroup = null;

const player = {
  pos: new THREE.Vector3(0, 1.65, 0.95),
  velocity: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  pitch: -0.22,
  speed: 3.2,
  sprintSpeed: 5.0,
  keys: { KeyW: false, KeyS: false, KeyA: false, KeyD: false, Shift: false },
  // Arena boundaries behind barista counter
  minX: -2.2, maxX: 2.2,
  minZ: 0.15, maxZ: 2.4,
  // Standard FPS vertical pitch clamp (-87 to +87 degrees)
  minPitch: -Math.PI * 0.48,
  maxPitch: Math.PI * 0.48,
  // Head bobbing & breathing sway
  headBobTimer: 0,
  baseEyeHeight: 1.65,
  swayX: 0,
  swayY: 0
};
window.player = player;

// Movement limits per module (barista counter vs. industrial workshop)
const ARENA_BOUNDS = {
  barista: { minX: -2.2, maxX: 2.2, minZ: 0.15, maxZ: 2.4 },
  safety:  { minX: -5.0, maxX: 5.0, minZ: -0.6, maxZ: 4.5 }
};
function applyArenaBounds(mode) {
  Object.assign(player, ARENA_BOUNDS[mode]);
  player.velocity.set(0, 0, 0);
}

function setMoveKey(code, val) {
  if (player.keys.hasOwnProperty(code)) player.keys[code] = val;
}

function initThreeFPS() {
  const container = document.getElementById('threeCanvas');
  if (!container || renderer) return;

  const wrap = document.getElementById('viewportWrap');
  const width = wrap ? wrap.clientWidth : (container.clientWidth || 400);
  const height = wrap ? wrap.clientHeight : (container.clientHeight || 460);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15181D);
  scene.fog = new THREE.FogExp2(0x15181D, 0.035);

  camera = new THREE.PerspectiveCamera(72, width / height, 0.05, 50);
  camera.position.set(player.pos.x, player.baseEyeHeight, player.pos.z);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // CLEAN STUDIO COLOR GRADING & ACES TONEMAPPING
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();

  // Soft studio environment for realistic metal / glass reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(buildStudioEnvScene(), 0.04).texture;
  pmrem.dispose();

  // Balanced lighting: soft sky/ground fill + one key light with shadows
  const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0x2A2D33, 0.35);
  scene.add(hemiLight);

  const warmCounterSpot = new THREE.SpotLight(0xFFF4E5, 1.4, 14, Math.PI / 3.4, 0.45, 1.0);
  warmCounterSpot.position.set(0, 3.6, 1.2);
  warmCounterSpot.castShadow = true;
  warmCounterSpot.shadow.mapSize.width = 1024;
  warmCounterSpot.shadow.mapSize.height = 1024;
  warmCounterSpot.shadow.bias = -0.0005;
  scene.add(warmCounterSpot);

  const fillLight = new THREE.DirectionalLight(0xFFFFFF, 0.55);
  fillLight.position.set(2.5, 4, 3);
  scene.add(fillLight);

  build3DEnvironment();
  build3DFPSHands();
  setupFPSControls(container);

  let clock = new THREE.Clock();
  let shakeIntensity = 0;
  let guideRenderTimer = 0;
  createGuideArrow();

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.08);
    const time = clock.getElapsedTime();

    // ================= STANDARD FPS WASD VECTOR MOVEMENT =================
    let inputForward = 0;
    let inputStrafe = 0;
    if (player.keys.KeyW) inputForward += 1;
    if (player.keys.KeyS) inputForward -= 1;
    if (player.keys.KeyD) inputStrafe += 1;
    if (player.keys.KeyA) inputStrafe -= 1;

    const inputLength = Math.hypot(inputForward, inputStrafe);
    const currentMaxSpeed = player.keys.Shift ? player.sprintSpeed : player.speed;

    let targetVelX = 0;
    let targetVelZ = 0;

    if (inputLength > 0.001) {
      const normF = inputForward / inputLength;
      const normS = inputStrafe / inputLength;

      // Instantaneous forward/right vectors based on real-time camera yaw:
      // Forward Vector in XZ plane: (sin(yaw), -cos(yaw))
      // Right Vector in XZ plane: (cos(yaw), sin(yaw))
      const sinYaw = Math.sin(player.yaw);
      const cosYaw = Math.cos(player.yaw);

      targetVelX = (sinYaw * normF + cosYaw * normS) * currentMaxSpeed;
      targetVelZ = (-cosYaw * normF + sinYaw * normS) * currentMaxSpeed;
    }

    // Snappy, silky-smooth standard FPS responsiveness (instant reaction + micro-easing)
    const accelFactor = Math.min(delta * 24.0, 1.0);
    player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, targetVelX, accelFactor);
    player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, targetVelZ, accelFactor);

    player.pos.x += player.velocity.x * delta;
    player.pos.z += player.velocity.z * delta;

    // Bar Counter Collision: slide smoothly along counter without stopping strafe
    if (currentProfession === 'barista' && player.pos.z < 0.22 && player.pos.x > -1.65 && player.pos.x < 1.65) {
      player.pos.z = 0.22;
      if (player.velocity.z < 0) player.velocity.z = 0;
    }

    // Arena boundary limits
    player.pos.x = THREE.MathUtils.clamp(player.pos.x, player.minX, player.maxX);
    player.pos.z = THREE.MathUtils.clamp(player.pos.z, player.minZ, player.maxZ);

    // ================= NATURAL HEAD BOBBING & CAMERA HEIGHT =================
    const currentSpeed = Math.hypot(player.velocity.x, player.velocity.z);
    const isMoving = currentSpeed > 0.08;

    if (isMoving) {
      player.headBobTimer += delta * (currentSpeed * 3.8);
    } else {
      player.headBobTimer += delta * 1.5;
    }

    const bobY = isMoving ? Math.sin(player.headBobTimer * 2.0) * 0.016 : Math.sin(player.headBobTimer) * 0.003;
    const bobX = isMoving ? Math.cos(player.headBobTimer) * 0.008 : 0;

    camera.position.set(
      player.pos.x + bobX,
      player.baseEyeHeight + bobY,
      player.pos.z
    );

    if (shakeIntensity > 0) {
      camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity *= 0.88;
      if (shakeIntensity < 0.001) shakeIntensity = 0;
    }

    // ================= STANDARD FPS EULER LOOK TARGET =================
    const cosPitch = Math.cos(player.pitch);
    const dirX = Math.sin(player.yaw) * cosPitch;
    const dirY = Math.sin(player.pitch);
    const dirZ = -Math.cos(player.yaw) * cosPitch;

    const targetLook = new THREE.Vector3(
      camera.position.x + dirX,
      camera.position.y + dirY,
      camera.position.z + dirZ
    );
    camera.lookAt(targetLook);

    // ================= VIEWMODEL FPS HANDS WITH INERTIA SWAY =================
    player.swayX = THREE.MathUtils.lerp(player.swayX, 0, delta * 9);
    player.swayY = THREE.MathUtils.lerp(player.swayY, 0, delta * 9);

    if (handsGroup) {
      handsGroup.position.copy(camera.position);
      handsGroup.rotation.set(
        camera.rotation.x + player.swayY * 0.06,
        camera.rotation.y + player.swayX * 0.06,
        camera.rotation.z
      );
      if (!handsGroup.userData.animating) {
        handsGroup.position.y += Math.sin(time * 2.2) * 0.004;
        handsGroup.position.x += Math.cos(time * 1.1) * 0.002;
      }
    }

    checkCenterRaycast();
    updateObjectLabels();
    updateGuideArrow(time);
    guideRenderTimer += delta;
    if (guideRenderTimer > 0.2) { guideRenderTimer = 0; renderGuide(); }

    if (customerObj && customerObj.visible) {
      customerObj.position.y = 1.3 + Math.sin(time * 3.2) * 0.012;
      customerObj.rotation.y = Math.sin(time * 1.8) * 0.05;
    }

    if (espressoStreamParticles && espressoStreamParticles.visible) {
      const p = espressoStreamParticles.geometry.attributes.position.array;
      for (let i = 1; i < p.length; i += 3) {
        p[i] -= delta * 1.8;
        if (p[i] < 1.21) p[i] = 1.37;
      }
      espressoStreamParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (steamParticles && steamParticles.visible) {
      const sp = steamParticles.geometry.attributes.position.array;
      for (let i = 1; i < sp.length; i += 3) {
        sp[i] += delta * 0.45;
        if (sp[i] > 1.55) sp[i] = 1.30;
      }
      steamParticles.geometry.attributes.position.needsUpdate = true;
    }

    // ================= SAFETY ENGINEER 3D SIMULATION UPDATES =================
    if (currentProfession === 'safety') {
      // 1. Emergency Strobe Beacon Animation
      if (emergencyBeaconLight && emergencyBeaconDome && emergencyBeaconRotor) {
        if (safetyState.powerState === 'ON' || safetyState.valvePressure !== 'ZERO') {
          const strobe = Math.pow(Math.sin(time * 8.0), 6) * 5.0 + Math.sin(time * 16.0) * 0.4 + 0.3;
          emergencyBeaconLight.intensity = strobe;
          emergencyBeaconDome.material.emissiveIntensity = strobe * 0.7;
          emergencyBeaconRotor.rotation.y = time * 8.5;
        } else {
          emergencyBeaconLight.intensity = 0.05;
          emergencyBeaconDome.material.emissiveIntensity = 0.1;
        }
      }

      // 2. Animated Needles with physical micro-jitter
      // Voltmeter needle (380V -> 0V)
      if (meter1Needle) {
        const voltTarget = (safetyState.powerState === 'ON') ? (0.65 + Math.sin(time * 24.0) * 0.015) : -1.25;
        meter1Needle.rotation.z = THREE.MathUtils.lerp(meter1Needle.rotation.z, voltTarget, 0.08);
      }

      // Manometer 1 (Steam line: 8.5 bar -> 4 bar -> 0 bar)
      if (meter2Needle) {
        let p1Target = 0.72; // High (8.5 bar)
        if (safetyState.valvesOpened[0] && safetyState.valvesOpened[1]) {
          p1Target = -1.25; // 0 bar
        } else if (safetyState.valvesOpened[0]) {
          p1Target = -0.15; // 4 bar
        }
        if (safetyState.valvePressure !== 'ZERO') p1Target += Math.sin(time * 18.0) * 0.012;
        meter2Needle.rotation.z = THREE.MathUtils.lerp(meter2Needle.rotation.z, p1Target, 0.06);
      }

      // Manometer 2 (Pneumatic line: 6.2 bar -> 0 bar)
      if (meter3Needle) {
        let p2Target = 0.55; // 6.2 bar
        if (safetyState.valvesOpened[1] && safetyState.valvesOpened[0]) {
          p2Target = -1.25; // 0 bar
        } else if (safetyState.valvesOpened[1]) {
          p2Target = -0.30;
        }
        if (safetyState.valvePressure !== 'ZERO') p2Target += Math.sin(time * 20.0) * 0.01;
        meter3Needle.rotation.z = THREE.MathUtils.lerp(meter3Needle.rotation.z, p2Target, 0.06);
      }

      // 3. Steam particle discharge
      if (steamParticles1 && steamParticles1.visible) {
        const pos1 = steamParticles1.geometry.attributes.position.array;
        for (let i = 1; i < pos1.length; i += 3) {
          pos1[i] -= delta * 1.2;
          if (pos1[i] < -0.8) pos1[i] = 0;
        }
        steamParticles1.geometry.attributes.position.needsUpdate = true;
      }

      if (steamParticles2 && steamParticles2.visible) {
        const pos2 = steamParticles2.geometry.attributes.position.array;
        for (let i = 1; i < pos2.length; i += 3) {
          pos2[i] -= delta * 1.2;
          if (pos2[i] < -0.8) pos2[i] = 0;
        }
        steamParticles2.geometry.attributes.position.needsUpdate = true;
      }

      // 4. Status LEDs
      if (redLedMesh) {
        redLedMesh.material.emissiveIntensity = (safetyState.powerState === 'ON') ? 1.8 : 0.05;
      }
      if (greenLedMesh) {
        const isSafe = (safetyState.powerState === 'OFF' && safetyState.lockoutApplied);
        greenLedMesh.material.emissiveIntensity = isSafe ? 1.8 : 0.05;
      }
    }

    // Dynamic Pulsing Target Beacon Ring (Barista mode)
    const beacon = scene.getObjectByName('targetBeaconRing');
    if (beacon) {
      if (currentProfession === 'barista' && state.quest === 1) {
        beacon.visible = true;
        const pulse = 1.0 + Math.sin(time * 5.0) * 0.18;
        beacon.scale.set(pulse, pulse, pulse);

        switch(state.step) {
          case 0: beacon.position.set(portafilterObj ? portafilterObj.position.x : 0, 1.165, portafilterObj ? portafilterObj.position.z : 0); break;
          case 1: beacon.position.set(grinderObj ? grinderObj.position.x : 0, 1.165, grinderObj ? grinderObj.position.z : 0); break;
          case 2: beacon.position.set(tamperObj ? tamperObj.position.x : 0, 1.165, tamperObj ? tamperObj.position.z : 0); break;
          case 3: beacon.position.set(-0.70, 1.165, -0.17); break;
          case 4: beacon.position.set(pitcherObj ? pitcherObj.position.x : 0, 1.165, pitcherObj ? pitcherObj.position.z : 0); break;
          case 5: beacon.position.set(cupObj ? cupObj.position.x : 0, 1.165, cupObj ? cupObj.position.z : 0); break;
        }
      } else {
        beacon.visible = false;
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  window.triggerCameraShake = function(intensity = 0.035) {
    shakeIntensity = intensity;
  };
}

function buildStudioEnvScene() {
  const envScene = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(12, 6, 12),
    new THREE.MeshBasicMaterial({ color: 0x1C1F24, side: THREE.BackSide })
  );
  envScene.add(room);
  // Bright softbox panels give metals readable highlights
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xA8ACB2 });
  [[0, 2.9, 0, Math.PI / 2, 0, 4, 2], [-5.9, 1, 0, 0, Math.PI / 2, 3, 2], [5.9, 1.5, -2, 0, -Math.PI / 2, 2, 1.5], [0, 1.5, 5.9, 0, Math.PI, 3, 1.5]]
    .forEach(([x, y, z, rx, ry, pw, ph]) => {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), panelMat);
      panel.position.set(x, y, z);
      panel.rotation.set(rx, ry, 0);
      envScene.add(panel);
    });
  return envScene;
}

function createTextTexture(lines, bg, fg, w = 256, h = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => {
    ctx.font = ln.font;
    ctx.fillText(ln.text, w / 2, h / (lines.length + 1) * (i + 1));
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

function build3DEnvironment() {
  interactiveObjects = [];
  hoveredObject = null;
  baristaGroup = new THREE.Group();
  baristaGroup.name = 'baristaEnvironment';
  scene.add(baristaGroup);

  // 1. Back Wall & Menu Board
  const wallGeo = new THREE.PlaneGeometry(10, 6);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xD9D2C7, roughness: 0.9 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 2.5, -2.5);
  baristaGroup.add(wall);

  const cafeFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 8),
    new THREE.MeshStandardMaterial({ color: 0x5A4A3E, roughness: 0.8 })
  );
  cafeFloor.rotation.x = -Math.PI / 2;
  cafeFloor.position.set(0, 0, 1);
  cafeFloor.receiveShadow = true;
  baristaGroup.add(cafeFloor);

  for (const sx of [-5, 5]) {
    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), wallMat);
    sideWall.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    sideWall.position.set(sx, 2.5, 1);
    baristaGroup.add(sideWall);
  }

  const menuGeo = new THREE.PlaneGeometry(2.4, 1.2);
  const menuMat = new THREE.MeshStandardMaterial({
    map: createTextTexture([
      { text: 'MENU', font: '800 34px "Plus Jakarta Sans", sans-serif' },
      { text: 'Espresso · Latte · Iced Oat Latte', font: '500 20px "Plus Jakarta Sans", sans-serif' }
    ], '#2B2B2B', '#F5F0E6', 512, 256),
    roughness: 0.8
  });
  const menuBoard = new THREE.Mesh(menuGeo, menuMat);
  menuBoard.position.set(0, 2.4, -2.48);
  baristaGroup.add(menuBoard);

  const signGeo = new THREE.BoxGeometry(1.6, 0.06, 0.04);
  const signMat = new THREE.MeshStandardMaterial({ color: 0xF5F0E6, emissive: 0xFFF4E0, emissiveIntensity: 0.6 });
  const neonSign = new THREE.Mesh(signGeo, signMat);
  neonSign.position.set(0, 3.1, -2.46);
  baristaGroup.add(neonSign);

  const shelfGeo = new THREE.BoxGeometry(1.4, 0.04, 0.3);
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3E2723, roughness: 0.7 });
  const shelf = new THREE.Mesh(shelfGeo, shelfMat);
  shelf.position.set(-1.4, 1.9, -1.8);
  baristaGroup.add(shelf);

  const syrupColors = [0xFFA502, 0xFF4757, 0x2ED573];
  syrupColors.forEach((color, i) => {
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.25, 16),
      new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.1 })
    );
    bottle.position.set(-1.8 + i * 0.18, 2.05, -1.8);
    baristaGroup.add(bottle);
  });

  // 2. Bar Counter Top
  const counterGeo = new THREE.BoxGeometry(3.6, 1.1, 1.6);
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x3B2C24, roughness: 0.7, metalness: 0.0 });
  const counter = new THREE.Mesh(counterGeo, counterMat);
  counter.position.set(0, 0.55, -0.4);
  counter.receiveShadow = true;
  baristaGroup.add(counter);

  const topGeo = new THREE.BoxGeometry(3.7, 0.06, 1.7);
  const topMat = new THREE.MeshStandardMaterial({ color: 0xA87A52, roughness: 0.6, metalness: 0.0 });
  const counterTop = new THREE.Mesh(topGeo, topMat);
  counterTop.position.set(0, 1.12, -0.4);
  counterTop.receiveShadow = true;
  baristaGroup.add(counterTop);

  // 3. Authentic Commercial Dual-Group Espresso Machine (La Marzocco / Victoria Arduino Style)
  machineObj = new THREE.Group();
  machineObj.name = 'espressoMachine';

  // Main Stainless Steel Chassis
  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.58, 0.58),
    new THREE.MeshStandardMaterial({ color: 0xE8E8EE, metalness: 0.95, roughness: 0.12 })
  );
  bodyMesh.position.set(0, 0.32, 0);
  bodyMesh.castShadow = true;
  machineObj.add(bodyMesh);

  // Front Control Panel (Matte Black / Brushed Steel)
  const panelMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.18, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x1A1A26, roughness: 0.4, metalness: 0.5 })
  );
  panelMesh.position.set(0, 0.45, 0.30);
  machineObj.add(panelMesh);

  // Pressure Gauge Dials (Boiler & Pump)
  for (let i = -1; i <= 1; i += 2) {
    const gauge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.9, roughness: 0.1, emissive: 0x00FFB3, emissiveIntensity: 0.2 })
    );
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(i * 0.38, 0.45, 0.32);
    machineObj.add(gauge);
  }

  // Dual Chrome Group Heads (Left & Right)
  for (let i = -1; i <= 1; i += 2) {
    const groupHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.98, roughness: 0.05 })
    );
    groupHead.position.set(i * 0.20, 0.28, 0.28);
    machineObj.add(groupHead);

    // Group head chrome collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.015, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xEEEEEE, metalness: 0.98, roughness: 0.05 })
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(i * 0.20, 0.35, 0.28);
    machineObj.add(collar);
  }

  // Left Steam Wand
  const leftWand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.30, 16),
    new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.98, roughness: 0.08 })
  );
  leftWand.position.set(-0.46, 0.28, 0.24);
  leftWand.rotation.z = 0.35;
  leftWand.rotation.x = 0.2;
  machineObj.add(leftWand);

  // Right Steam Wand (Articulated towards Milk Steaming Station)
  const rightWand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.32, 16),
    new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.98, roughness: 0.08 })
  );
  rightWand.position.set(0.46, 0.26, 0.26);
  rightWand.rotation.z = -0.38;
  rightWand.rotation.x = 0.25;
  machineObj.add(rightWand);

  // Metal Drip Tray Grid
  const dripTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.04, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xCCCCCC, metalness: 0.9, roughness: 0.3 })
  );
  dripTray.position.set(0, 0.04, 0.24);
  machineObj.add(dripTray);

  // Cup Warmer Rack on Top + Stacked Cups
  const rack = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.02, 0.48),
    new THREE.MeshStandardMaterial({ color: 0xAAAAAA, metalness: 0.8, roughness: 0.4 })
  );
  rack.position.set(0, 0.62, 0);
  machineObj.add(rack);

  // Ceramic Cups on Top
  for (let c = 0; c < 3; c++) {
    const ceramicCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.025, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: c % 2 === 0 ? 0xFFFFFF : 0x00FFB3, roughness: 0.2 })
    );
    ceramicCup.position.set(-0.25 + c * 0.22, 0.66, -0.05);
    machineObj.add(ceramicCup);
  }

  machineObj.position.set(-0.50, 1.15, -0.45);
  baristaGroup.add(machineObj);
  interactiveObjects.push(machineObj);

  // 4. Portafilter / Holder (Station 1 - Left-Center Counter)
  portafilterObj = new THREE.Group();
  portafilterObj.name = 'portafilter';
  const basket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.052, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x8C939B, metalness: 0.9, roughness: 0.25 })
  );
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.24, 16),
    new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.4 })
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0, 0.14);
  portafilterObj.add(basket);
  portafilterObj.add(handle);
  portafilterObj.position.set(-0.42, 1.18, 0.05);
  baristaGroup.add(portafilterObj);
  baristaGroup.traverse(o => { if (o.isMesh) o.castShadow = true; });
  interactiveObjects.push(portafilterObj);

  // 5. Commercial On-Demand Grinder (Left)
  grinderObj = new THREE.Group();
  grinderObj.name = 'grinder';
  const grinderBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.52, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x181822, roughness: 0.3, metalness: 0.7 })
  );
  grinderBody.position.y = 0.26;

  // Transparent Bean Hopper
  const hopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.06, 0.26, 20),
    new THREE.MeshStandardMaterial({ color: 0x8899AA, transparent: true, opacity: 0.8, roughness: 0.05 })
  );
  hopper.position.y = 0.65;

  // Roasted Coffee Beans inside Hopper
  const beansCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.04, 0.18, 16),
    new THREE.MeshStandardMaterial({ color: 0x3E271E, roughness: 0.9 })
  );
  beansCore.position.y = 0.62;

  // Dosing Spout & Fork
  const spout = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.08, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xDDDDDD, metalness: 0.9 })
  );
  spout.position.set(0, 0.24, 0.15);

  grinderObj.add(grinderBody);
  grinderObj.add(hopper);
  grinderObj.add(beansCore);
  grinderObj.add(spout);
  grinderObj.position.set(-1.18, 1.15, -0.42);
  baristaGroup.add(grinderObj);
  interactiveObjects.push(grinderObj);

  // 6. Heavy Stainless Steel Tamper & Dedicated Silicone Mat (Station 2)
  tamperObj = new THREE.Group();
  tamperObj.name = 'tamper';

  // Dedicated Silicone Tamping Mat
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.015, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
  );
  mat.position.set(0, 0, 0);

  const tamperBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.054, 0.054, 0.035, 24),
    new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.98, roughness: 0.08 })
  );
  tamperBase.position.y = 0.025;

  const tamperGrip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.034, 0.095, 20),
    new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.35 })
  );
  tamperGrip.position.y = 0.08;

  tamperObj.add(mat);
  tamperObj.add(tamperBase);
  tamperObj.add(tamperGrip);
  tamperObj.position.set(-0.18, 1.16, 0.05);
  baristaGroup.add(tamperObj);
  interactiveObjects.push(tamperObj);

  // 7. PROMINENT STAINLESS STEEL MILK PITCHER (Station 3 - Steaming)
  pitcherObj = new THREE.Group();
  pitcherObj.name = 'milkPitcher';

  // Pitcher Body with Classic Tapered Pouring Spout
  const pitcherMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.078, 0.16, 28, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xB8BEC6,
      metalness: 0.9,
      roughness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    })
  );
  pitcherMesh.position.y = 0.08;
  pitcherObj.add(pitcherMesh);

  // Pitcher Bottom
  const pitcherBottom = new THREE.Mesh(
    new THREE.CircleGeometry(0.078, 28),
    new THREE.MeshStandardMaterial({ color: 0xDDDDDD, metalness: 0.9, side: THREE.DoubleSide })
  );
  pitcherBottom.rotation.x = Math.PI / 2;
  pitcherObj.add(pitcherBottom);

  // Pitcher Handle
  const pitcherHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.009, 12, 24, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xEEEEEE, metalness: 0.95, roughness: 0.1 })
  );
  pitcherHandle.rotation.y = Math.PI / 2;
  pitcherHandle.position.set(0, 0.08, -0.075);
  pitcherObj.add(pitcherHandle);

  // Place Pitcher PROMINENTLY in front of the counter
  pitcherObj.position.set(0.20, 1.16, -0.05);
  baristaGroup.add(pitcherObj);
  interactiveObjects.push(pitcherObj);

  // 7b. Standalone Oat Milk Carton (Stationary next to steaming station)
  oatMilkObj = new THREE.Group();
  oatMilkObj.name = 'oatMilkCarton';
  const oatMilkCarton = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.22, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x3867D6, roughness: 0.3 })
  );
  oatMilkCarton.position.set(0, 0.11, 0);
  oatMilkObj.add(oatMilkCarton);

  const oatCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2 })
  );
  oatCap.position.set(0, 0.23, 0);
  oatMilkObj.add(oatCap);
  oatMilkObj.position.set(0.38, 1.16, -0.05);
  baristaGroup.add(oatMilkObj);

  // Active Target Pulsing Beacon Ring (Follows current step)
  const ringGeo = new THREE.RingGeometry(0.09, 0.13, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x0052FF,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  const targetBeaconRing = new THREE.Mesh(ringGeo, ringMat);
  targetBeaconRing.name = 'targetBeaconRing';
  targetBeaconRing.rotation.x = Math.PI / 2;
  targetBeaconRing.position.set(-0.42, 1.165, 0.05);
  baristaGroup.add(targetBeaconRing);

  // 8. Physical Glass Cup with Liquid Layering (On Espresso Drip Tray)
  cupObj = new THREE.Group();
  cupObj.name = 'glassCup';
  const glassMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.048, 0.19, 28),
    new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.55,
      roughness: 0.04,
      metalness: 0.05,
      transmission: 0.92,
      ior: 1.52
    })
  );
  glassMesh.position.y = 0.095;
  cupObj.add(glassMesh);

  // Base-anchored Liquid Mesh (scales strictly upwards, preventing clipping through glass bottom)
  const liquidGeo = new THREE.CylinderGeometry(0.060, 0.046, 0.16, 24);
  liquidGeo.translate(0, 0.08, 0);
  cupLiquidMesh = new THREE.Mesh(
    liquidGeo,
    new THREE.MeshStandardMaterial({ color: 0x3E271E, roughness: 0.2 })
  );
  cupLiquidMesh.position.set(0, 0.015, 0);
  cupLiquidMesh.scale.set(1, 0.001, 1);
  cupLiquidMesh.visible = false;
  cupObj.add(cupLiquidMesh);

  // Centered Ice Cubes (strictly within inner cup radius)
  iceCubesGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const ice = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.032, 0.032),
      new THREE.MeshPhysicalMaterial({ color: 0xCCFFFF, transparent: true, opacity: 0.75, roughness: 0.08 })
    );
    ice.position.set((Math.random() - 0.5) * 0.024, 0.07 + i * 0.022, (Math.random() - 0.5) * 0.024);
    ice.rotation.set(Math.random(), Math.random(), Math.random());
    iceCubesGroup.add(ice);
  }
  iceCubesGroup.visible = false;
  cupObj.add(iceCubesGroup);

  cupObj.position.set(-0.70, 1.21, -0.17);
  baristaGroup.add(cupObj);
  [grinderObj, tamperObj, pitcherObj, oatMilkObj, cupObj].forEach(g => g.traverse(o => { if (o.isMesh) o.castShadow = true; }));
  interactiveObjects.push(cupObj);

  // 9. Customer Avatar
  customerObj = new THREE.Group();
  customerObj.name = 'customerAvatar';

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xFFCBA4, roughness: 0.6 })
  );
  headMesh.position.y = 0.45;
  const torsoMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 0.65, 20),
    new THREE.MeshStandardMaterial({ color: 0x34495E, roughness: 0.7 })
  );
  customerObj.add(headMesh);
  customerObj.add(torsoMesh);
  customerObj.position.set(0, 1.3, -1.6);
  customerObj.visible = false;
  baristaGroup.add(customerObj);

  createParticleEffects();
  rebuildObjectLabels();
}

function createParticleEffects() {
  const streamGeo = new THREE.BufferGeometry();
  const count = 50;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -0.70 + (Math.random() - 0.5) * 0.015;
    positions[i * 3 + 1] = 1.21 + Math.random() * 0.16;
    positions[i * 3 + 2] = -0.17 + (Math.random() - 0.5) * 0.015;
  }
  streamGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const streamMat = new THREE.PointsMaterial({ color: 0x4A2511, size: 0.024, transparent: true, opacity: 0.95 });
  espressoStreamParticles = new THREE.Points(streamGeo, streamMat);
  espressoStreamParticles.visible = false;
  baristaGroup.add(espressoStreamParticles);

  const steamGeo = new THREE.BufferGeometry();
  const sCount = 80;
  const sPos = new Float32Array(sCount * 3);
  for (let i = 0; i < sCount; i++) {
    sPos[i * 3] = -0.04 + (Math.random() - 0.5) * 0.06;
    sPos[i * 3 + 1] = 1.30 + Math.random() * 0.22;
    sPos[i * 3 + 2] = -0.19 + (Math.random() - 0.5) * 0.06;
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const steamMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.045, transparent: true, opacity: 0.65 });
  steamParticles = new THREE.Points(steamGeo, steamMat);
  steamParticles.visible = false;
  baristaGroup.add(steamParticles);
}

function build3DFPSHands() {
  handsGroup = new THREE.Group();

  rightHand = new THREE.Group();
  const palm = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.04, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.5, metalness: 0.2 })
  );
  const fingers = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.03, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x0052FF, roughness: 0.3, emissive: 0x002277, emissiveIntensity: 0.4 })
  );
  fingers.position.set(0, 0, -0.09);
  palm.name = 'HandPalm';
  fingers.name = 'HandFingers';
  palm.userData.baseColor = 0x1E293B;
  fingers.userData.baseColor = 0x0052FF;
  rightHand.add(palm);
  rightHand.add(fingers);

  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.075, 0.45, 16),
    new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.8 })
  );
  arm.rotation.x = Math.PI / 3;
  arm.position.set(0, -0.15, 0.25);
  rightHand.add(arm);

  rightHand.position.set(0.32, -0.37, -0.55);
  handsGroup.add(rightHand);
  scene.add(handsGroup);
}
