// SynapKor — Screen navigation, HUD, device modes, module start / exit.

// ================= UI HELPERS =================
function renderHUD() {
  const hud = document.getElementById('hudDockInner') || document.getElementById('hudBottom');
  if (!hud) return;
  hud.innerHTML = `
    <div class="steps-bar">
      ${state.stepsConfig.map((s, idx) => `
        <div class="step-pill ${idx < state.step ? 'done' : (idx === state.step ? 'active' : '')}">
          ${idx < state.step ? '✓ ' : (idx + 1) + '. '}${s.name.split(' ')[0]}
        </div>
      `).join('')}
    </div>
    <div style="background:var(--surface-slate); border:1px solid var(--border-dark); border-radius:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:10px; font-weight:700; color:var(--text-muted-dark); text-transform:uppercase; letter-spacing:0.5px;">ТЕКУЩАЯ ЦЕЛЬ</div>
        <div style="font-size:13px; font-weight:700; color:var(--text-on-dark);">${state.stepsConfig[state.step] ? state.stepsConfig[state.step].name : 'Готово'}</div>
      </div>
      <div style="font-size:12px; color:var(--text-muted-dark); font-weight:500;">${state.stepsConfig[state.step] ? state.stepsConfig[state.step].hint : ''}</div>
    </div>
  `;
}

function renderHUDComplete() {
  const hud = document.getElementById('hudDockInner') || document.getElementById('hudBottom');
  if (!hud) return;
  hud.innerHTML = `
    <div style="background:rgba(16,185,129,0.15); border:1px solid var(--emerald); border-radius:12px; padding:14px; text-align:center;">
      <h3 style="color:var(--emerald); font-size:14px; font-weight:800;">✨ ICED OAT LATTE УСПЕШНО СВАРЕН!</h3>
      <p style="font-size:12px; color:#E2E8F0; margin-top:4px;">100% соблюдение рецептуры и идеальная последовательность моторики.</p>
    </div>
  `;
}

function handleWindowResize() {
  const viewport = document.getElementById('viewportWrap');
  if (!viewport || !renderer || !camera) return;
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  if (w <= 0 || h <= 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
}
window.addEventListener('resize', handleWindowResize);
window.addEventListener('orientationchange', () => setTimeout(handleWindowResize, 150));
document.addEventListener('fullscreenchange', () => setTimeout(handleWindowResize, 150));

function setDeviceMode(mode) {
  const container = document.getElementById('appContainer');
  if (!container) return;

  if (mode === 'mobile-frame') {
    container.classList.remove('mode-desktop');
    container.classList.add('mode-mobile-frame');
  } else {
    container.classList.remove('mode-mobile-frame');
    container.classList.add('mode-desktop');
  }

  const isDesk = mode === 'desktop';
  document.getElementById('btnModeDesktop')?.classList.toggle('active', isDesk);
  document.getElementById('btnModeMobile')?.classList.toggle('active', !isDesk);
  document.getElementById('gameBtnModeDesktop')?.classList.toggle('active', isDesk);
  document.getElementById('gameBtnModeMobile')?.classList.toggle('active', !isDesk);

  setTimeout(handleWindowResize, 100);
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(()=>{});
  } else {
    document.exitFullscreen?.().catch(()=>{});
  }
  setTimeout(handleWindowResize, 200);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const scr = document.getElementById(id);
  if (scr) scr.classList.add('active');
  setTimeout(handleWindowResize, 50);
}

function startBaristaVR() {
  currentProfession = 'barista';
  document.getElementById('gameScreen').classList.remove('safety-mode');
  stopTransformerHum();
  const safetyHud = document.getElementById('safetyHudBar');
  if (safetyHud) safetyHud.style.display = 'none';
  const inventoryBar = document.getElementById('safetyInventoryBar');
  if (inventoryBar) inventoryBar.style.display = 'none';
  const telemetryPanel = document.getElementById('telemetryLogPanel');
  if (telemetryPanel) telemetryPanel.style.display = 'none';
  const multimeterHud = document.getElementById('multimeterHud');
  if (multimeterHud) multimeterHud.style.display = 'none';

  document.getElementById('vrQuestTitle').innerText = 'КВЕСТ 1: ICED OAT LATTE';

  isActionInProgress = false;
  resetSafetyToolsUI();
  state.quest = 1;
  state.step = 0;
  state.timer = 0;
  state.misclicks = 0;
  state.conflictChoice = '';
  state.budgetChoice = '';
  resetSessionEvents();
  document.getElementById('vrTimer').innerText = '00:00';

  applyArenaBounds('barista');
  player.pos.set(0, 1.65, 0.95);
  player.baseEyeHeight = 1.65;
  player.yaw = 0;
  player.pitch = -0.28;

  if (portafilterObj) {
    portafilterObj.position.set(-0.42, 1.18, 0.05);
    portafilterObj.rotation.set(0, 0, 0);
  }
  if (tamperObj) {
    tamperObj.position.set(-0.18, 1.16, 0.05);
  }
  if (pitcherObj) {
    pitcherObj.position.set(0.20, 1.16, -0.05);
    pitcherObj.rotation.set(0, 0, 0);
  }
  if (oatMilkObj) {
    oatMilkObj.position.set(0.38, 1.16, -0.05);
  }
  if (cupObj) {
    cupObj.position.set(-0.70, 1.21, -0.17);
  }
  if (cupLiquidMesh) {
    cupLiquidMesh.visible = false;
    cupLiquidMesh.scale.set(1, 0.001, 1);
  }
  if (iceCubesGroup) {
    iceCubesGroup.visible = false;
  }
  if (customerObj) {
    customerObj.visible = false;
  }
  if (espressoStreamParticles) {
    espressoStreamParticles.visible = false;
  }
  if (steamParticles) {
    steamParticles.visible = false;
  }

  const victoryModal = document.getElementById('victoryModal');
  if (victoryModal) victoryModal.style.display = 'none';

  showScreen('gameScreen');
  setTimeout(() => {
    initThreeFPS();
    if (scene) {
      const oldSafety = scene.getObjectByName('safetyEnvironment');
      if (oldSafety) scene.remove(oldSafety);
      removeScenarioScenes();
      // Always rebuild so objects, interactive list and quest props start fresh
      const oldBarista = scene.getObjectByName('baristaEnvironment');
      if (oldBarista) scene.remove(oldBarista);
      build3DEnvironment();
    }
    renderHUD();
    handleWindowResize();
  }, 100);
  setGuideVisible(guideVisible);
  showIntro('barista');

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timer++;
    const m = String(Math.floor(state.timer / 60)).padStart(2, '0');
    const s = String(state.timer % 60).padStart(2, '0');
    document.getElementById('vrTimer').innerText = `${m}:${s}`;
  }, 1000);
}

function restartCurrentSimulation() {
  if (getActiveScenario()) startScenario(currentProfession);
  else if (currentProfession === 'safety') startSafetyVR();
  else startBaristaVR();
}

function resetSafetyToolsUI() {
  safetyState.selectedTool = null;
  document.querySelectorAll('.safety-inv-slot').forEach(sl => sl.classList.remove('active', 'equipped'));
  const multimeterHud = document.getElementById('multimeterHud');
  if (multimeterHud) multimeterHud.style.display = 'none';
  const alertBanner = document.getElementById('safetyAlertBanner');
  if (alertBanner) alertBanner.style.display = 'none';
  updateFPSHandsForPPE(false);
}

function exitToHome() {
  if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  document.getElementById('introOverlay')?.classList.remove('visible');
  clearInterval(state.timerInterval);
  stopTransformerHum();
  const safetyHud = document.getElementById('safetyHudBar');
  if (safetyHud) safetyHud.style.display = 'none';
  const inventoryBar = document.getElementById('safetyInventoryBar');
  if (inventoryBar) inventoryBar.style.display = 'none';
  const telemetryPanel = document.getElementById('telemetryLogPanel');
  if (telemetryPanel) telemetryPanel.style.display = 'none';
  const multimeterHud = document.getElementById('multimeterHud');
  if (multimeterHud) multimeterHud.style.display = 'none';
  showScreen('homeScreen');
  if (typeof renderCareerProfile === 'function') renderCareerProfile();
}

// Initial responsive check on load
window.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth <= 768) {
    setDeviceMode('desktop');
  }
  // Deep link used by host apps: index.html?module=barista | safety | it | doctor
  const module = new URLSearchParams(location.search).get('module');
  if (module === 'barista') startBaristaVR();
  else if (module === 'safety') startSafetyVR();
  else if (SCENARIOS[module]) startScenario(module);
});
