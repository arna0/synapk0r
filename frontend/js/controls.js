// SynapKor — First-person input: pointer lock, WASD, mouse drag, multi-touch, raycast hover.

// ================= FPS INPUT CONTROLS & LOOK =================
let hoveredObject = null;
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
let totalDragDistance = 0;
let isActionInProgress = false;
let controlsInitialized = false;

// Multi-Touch Identifiers (Simultaneous Move & Look)
let cameraTouchId = null;
let cameraTouchPrevX = 0;
let cameraTouchPrevY = 0;
let dpadTouchId = null;

function setupFPSControls(container) {
  if (controlsInitialized) return;
  controlsInitialized = true;

  const viewportWrap = document.getElementById('viewportWrap') || container;

  // Desktop Pointer Lock on click
  const UI_OVERLAY_SELECTOR = 'button, #virtualDpad, #mobileActionTrigger, .vr-status-bar, .safety-inventory-bar, .multimeter-hud-panel, .victory-modal-overlay, .telemetry-log-panel, .intro-overlay, .guide-panel, .guide-toggle-btn';
  viewportWrap.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest(UI_OVERLAY_SELECTOR)) return;
    const victoryModal = document.getElementById('victoryModal');
    if (victoryModal && victoryModal.style.display === 'flex') return;
    if (isIntroVisible()) return;
    if (window.innerWidth > 768 && !document.pointerLockElement) {
      try {
        const req = viewportWrap.requestPointerLock || viewportWrap.mozRequestPointerLock || viewportWrap.webkitRequestPointerLock;
        if (req) { req.call(viewportWrap); return; }
      } catch(err){}
    }
    if (totalDragDistance <= 12) {
      triggerCenterInteraction();
    }
  });

  function onPointerLockChange() {
    const isLocked = (document.pointerLockElement === viewportWrap || document.mozPointerLockElement === viewportWrap || document.webkitPointerLockElement === viewportWrap);
    const badge = document.getElementById('pointerLockBadge');
    const hint = document.getElementById('desktopAimHint');
    if (badge) badge.style.display = isLocked ? 'flex' : 'none';
    if (hint) hint.style.display = isLocked ? 'none' : 'flex';
  }

  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('mozpointerlockchange', onPointerLockChange);
  document.addEventListener('webkitpointerlockchange', onPointerLockChange);

  // Mouse movement when pointer locked
  document.addEventListener('mousemove', (e) => {
    const isLocked = (document.pointerLockElement === viewportWrap || document.mozPointerLockElement === viewportWrap || document.webkitPointerLockElement === viewportWrap);
    if (isLocked) {
      const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
      const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
      const lookSens = 0.0022;

      player.yaw += movementX * lookSens;
      player.pitch -= movementY * lookSens;
      player.pitch = THREE.MathUtils.clamp(player.pitch, player.minPitch, player.maxPitch);

      player.swayX = THREE.MathUtils.clamp(player.swayX - movementX * 0.004, -0.35, 0.35);
      player.swayY = THREE.MathUtils.clamp(player.swayY - movementY * 0.004, -0.35, 0.35);
    }
  });

  // Keyboard support (WASD + Arrow Keys + Shift Sprint + E/Space Interact)
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const gameActive = document.getElementById('gameScreen').classList.contains('active');
    if (e.code === 'KeyW' || e.code === 'ArrowUp') player.keys.KeyW = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') player.keys.KeyS = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') player.keys.KeyA = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') player.keys.KeyD = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.keys.Shift = true;

    if ((e.code === 'KeyE' || e.code === 'Space') && gameActive) {
      e.preventDefault();
      triggerCenterInteraction();
    }
    if (e.code === 'KeyH' && gameActive) toggleGuide();
    if ((e.code === 'Enter' || e.code === 'Escape') && gameActive && isIntroVisible()) { e.preventDefault(); closeIntro(); return; }
    if (currentProfession === 'safety' && gameActive && !isIntroVisible()) {
      if (e.code === 'Digit1') togglePPE();
      if (e.code === 'Digit2') selectInventoryTool('multimeter');
      if (e.code === 'Digit3') selectInventoryTool('loto');
    }
    if (gameActive && !isIntroVisible() && getActiveScenario()) handleScenarioKey(e.code);
    if (e.code === 'KeyF') {
      toggleFullScreen();
    }
    if (e.code === 'KeyM') {
      const app = document.getElementById('appContainer');
      if (app) {
        const isDesktop = app.classList.contains('mode-desktop');
        setDeviceMode(isDesktop ? 'mobile-frame' : 'desktop');
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') player.keys.KeyW = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') player.keys.KeyS = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') player.keys.KeyA = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') player.keys.KeyD = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.keys.Shift = false;
  });

  // Mouse drag fallback on PC (when pointer lock is not active)
  viewportWrap.addEventListener('mousedown', (e) => {
    if (e.target && e.target.closest(UI_OVERLAY_SELECTOR)) return;
    isDragging = true;
    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
    totalDragDistance = 0;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    const isLocked = (document.pointerLockElement === viewportWrap || document.mozPointerLockElement === viewportWrap || document.webkitPointerLockElement === viewportWrap);
    if (isDragging && !isLocked) {
      const deltaX = e.clientX - previousMouseX;
      const deltaY = e.clientY - previousMouseY;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
      totalDragDistance += Math.abs(deltaX) + Math.abs(deltaY);

      const lookSens = 0.0035;
      player.yaw += deltaX * lookSens;
      player.pitch -= deltaY * lookSens;
      player.pitch = THREE.MathUtils.clamp(player.pitch, player.minPitch, player.maxPitch);

      player.swayX = THREE.MathUtils.clamp(player.swayX - deltaX * 0.004, -0.35, 0.35);
      player.swayY = THREE.MathUtils.clamp(player.swayY - deltaY * 0.004, -0.35, 0.35);
    }
  });

  // ================= MULTI-TOUCH ENGINE (SIMULTANEOUS MOVE & LOOK) =================
  const dpadEl = document.getElementById('virtualDpad');

  function updateDpadFromTouch(touch) {
    if (!dpadEl) return;
    const rect = dpadEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const deadZone = 12;

    player.keys.KeyW = dy < -deadZone;
    player.keys.KeyS = dy > deadZone;
    player.keys.KeyA = dx < -deadZone;
    player.keys.KeyD = dx > deadZone;

    const btnW = dpadEl.querySelector('[data-dir="w"]');
    const btnS = dpadEl.querySelector('[data-dir="s"]');
    const btnA = dpadEl.querySelector('[data-dir="a"]');
    const btnD = dpadEl.querySelector('[data-dir="d"]');
    if (btnW) btnW.classList.toggle('active', player.keys.KeyW);
    if (btnS) btnS.classList.toggle('active', player.keys.KeyS);
    if (btnA) btnA.classList.toggle('active', player.keys.KeyA);
    if (btnD) btnD.classList.toggle('active', player.keys.KeyD);
  }

  function clearDpadVisuals() {
    if (!dpadEl) return;
    dpadEl.querySelectorAll('.dpad-btn').forEach(b => {
      if (!b.classList.contains('dpad-action-center')) b.classList.remove('active');
    });
  }

  viewportWrap.addEventListener('touchstart', (e) => {
    const vRect = viewportWrap.getBoundingClientRect();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const target = document.elementFromPoint(t.clientX, t.clientY);

      if (target && target.closest('#mobileActionTrigger')) {
        // handled by the button's own onclick
      } else if (target && target.closest('#virtualDpad')) {
        dpadTouchId = t.identifier;
        updateDpadFromTouch(t);
      } else if (target && target.closest(UI_OVERLAY_SELECTOR)) {
        // taps on HUD panels / buttons are not camera or movement input
      } else if (t.clientX < vRect.left + vRect.width * 0.40 && t.clientY > vRect.top + vRect.height * 0.35) {
        // Left touch area as joystick
        dpadTouchId = t.identifier;
        updateDpadFromTouch(t);
      } else {
        // Camera Look Touch (Right side or general look)
        if (cameraTouchId === null) {
          cameraTouchId = t.identifier;
          cameraTouchPrevX = t.clientX;
          cameraTouchPrevY = t.clientY;
        }
      }
    }
  }, { passive: false });

  viewportWrap.addEventListener('touchmove', (e) => {
    if (e.cancelable) e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      if (t.identifier === dpadTouchId) {
        updateDpadFromTouch(t);
      } else if (t.identifier === cameraTouchId) {
        const deltaX = t.clientX - cameraTouchPrevX;
        const deltaY = t.clientY - cameraTouchPrevY;
        cameraTouchPrevX = t.clientX;
        cameraTouchPrevY = t.clientY;

        const touchSens = 0.0042;
        player.yaw += deltaX * touchSens;
        player.pitch -= deltaY * touchSens;
        player.pitch = THREE.MathUtils.clamp(player.pitch, player.minPitch, player.maxPitch);

        player.swayX = THREE.MathUtils.clamp(player.swayX - deltaX * 0.003, -0.3, 0.3);
        player.swayY = THREE.MathUtils.clamp(player.swayY - deltaY * 0.003, -0.3, 0.3);
      }
    }
  }, { passive: false });

  function onTouchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      if (t.identifier === dpadTouchId) {
        dpadTouchId = null;
        player.keys.KeyW = false;
        player.keys.KeyS = false;
        player.keys.KeyA = false;
        player.keys.KeyD = false;
        clearDpadVisuals();
      }

      if (t.identifier === cameraTouchId) {
        cameraTouchId = null;
      }
    }
  }

  viewportWrap.addEventListener('touchend', onTouchEnd, { passive: true });
  viewportWrap.addEventListener('touchcancel', onTouchEnd, { passive: true });
}

function checkCenterRaycast() {
  if (!camera) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(interactiveObjects, true);

  const tip = document.getElementById('hoverTooltip');
  const tipText = document.getElementById('tooltipText');
  const crosshair = document.getElementById('mainCrosshair');

  if (intersects.length > 0 && intersects[0].distance < 2.5) {
    let topObj = intersects[0].object;
    while (topObj.parent && topObj.parent !== scene && !interactiveObjects.includes(topObj)) {
      topObj = topObj.parent;
    }

    if (hoveredObject !== topObj) {
      if (hoveredObject) setMeshGlow(hoveredObject, false);
      hoveredObject = topObj;
      setMeshGlow(hoveredObject, true);
    }

    crosshair.classList.add('hovered');
    tip.style.display = 'flex';
    tipText.innerText = getObjectActionHint(topObj.name);
  } else {
    if (hoveredObject) setMeshGlow(hoveredObject, false);
    hoveredObject = null;
    crosshair.classList.remove('hovered');
    tip.style.display = 'none';
  }
}

function triggerCenterInteraction() {
  if (isActionInProgress || isIntroVisible()) return;
  if (hoveredObject) {
    if (currentProfession === 'safety') {
      handleSafetyInteraction(hoveredObject.name);
    } else if (getActiveScenario()) {
      handleScenarioClick(hoveredObject.name);
    } else {
      handleFPSObjectClick(hoveredObject.name);
    }
  } else {
    state.misclicks++;
  }
}

function setMeshGlow(objGroup, enabled) {
  objGroup.traverse((child) => {
    if (child.isMesh && child.material) {
      if (enabled) {
        child.userData.origEmissive = child.material.emissive ? child.material.emissive.getHex() : 0x000000;
        if (child.material.emissive) child.material.emissive.setHex(0x0052FF);
      } else {
        if (child.material.emissive && child.userData.origEmissive !== undefined) {
          child.material.emissive.setHex(child.userData.origEmissive);
        }
      }
    }
  });
}

function getObjectActionHint(name) {
  const scn = getActiveScenario();
  if (scn) return getScenarioObjectHint(scn, name);
  if (currentProfession === 'safety') {
    switch(name) {
      case 'mainBreaker':
        return (safetyState.powerState === 'ON')
          ? 'Главный рубильник 380В: [E] Отключить питание (Power OFF)'
          : (safetyState.lockoutApplied ? 'Рубильник: Заблокирован замком LOTO' : 'Рубильник: Обесточен (0.0V)');
      case 'lotoPadlock':
        return 'Проушина замка: [E] Навесить замок LOTO';
      case 'valve1':
        return safetyState.valvesOpened[0]
          ? 'Предохранительный клапан 1: Открыт (Давление сброшено)'
          : 'Предохранительный клапан 1: [E] Стравить давление пара';
      case 'valve2':
        return safetyState.valvesOpened[1]
          ? 'Предохранительный клапан 2: Открыт (Давление сброшено)'
          : 'Предохранительный клапан 2: [E] Стравить давление пневматики';
      case 'testTerminals':
        return 'Контрольные шины 380В: [E] Замерить мультиметром True RMS';
      case 'ppeStand':
        return safetyState.ppeEquipped
          ? 'Стенд СИЗ: [E] Снять диэлектрические перчатки'
          : 'Стенд СИЗ: [E] Экипировать диэлектрические перчатки (1000В)';
      case 'meter1':
        return `Вольтметр сети: ${safetyState.powerState === 'ON' ? '380 V (ОПАСНО)' : '0.0 V (ОБЕСТОЧЕНО)'}`;
      case 'meter2':
        return `Манометр пара: ${safetyState.valvePressure === 'ZERO' ? '0.0 БАР' : (safetyState.valvesOpened[0] ? '4.0 БАР (СТРАВЛИВАНИЕ)' : '8.5 БАР (ВЫСОКОЕ)')}`;
      case 'meter3':
        return `Манометр пневматики: ${safetyState.valvePressure === 'ZERO' ? '0.0 БАР' : (safetyState.valvesOpened[1] ? '3.0 БАР (СТРАВЛИВАНИЕ)' : '6.2 БАР')}`;
      default:
        return '[E] Взаимодействовать';
    }
  }
  switch(name) {
    case 'portafilter': return 'Холдер: [E] Взять в руку';
    case 'grinder': return 'Кофемолка: [E] Смолоть 18г зерна';
    case 'tamper': return 'Темпер: [E] Спрессовать (20кг)';
    case 'espressoMachine': return 'Кофемашина: [E] Включить пролив';
    case 'milkPitcher': return 'Питчер: [E] Взбить овсяное молоко';
    case 'glassCup': return 'Стакан: [E] Собрать Iced Latte';
    default: return '[E] Взаимодействовать';
  }
}
