// SynapKor — Module "Barista": quest 1 (recipe), quest 2 (guest conflict), quest 3 (purchasing).

// ================= QUEST 1: HARD SKILLS PIPELINE =================
function handleFPSObjectClick(name) {
  if (isActionInProgress) return;
  if (state.quest === 1) {
    const currentTarget = state.stepsConfig[state.step];
    if (currentTarget && name === currentTarget.id) {
      isActionInProgress = true;
      executeStepAction(state.step, () => {
        runLater(() => {
          isActionInProgress = false;
        }, 300);
      });
    } else {
      state.misclicks++;
      sessionEvents.push({ t: Math.round((Date.now() - sessionStartedAt) / 100) / 10, action: `WRONG_OBJECT_${name}_EXPECTED_${currentTarget ? currentTarget.id : 'none'}`, ok: false });
      playTone(160, 'sawtooth', 0.25, 0.12);
      if (currentTarget) {
        showGuideToast(`Сейчас нужен другой предмет: «${OBJECT_LABELS[currentTarget.id]}» — ${currentTarget.name.toLowerCase()}`);
      }
    }
  }
}

function executeStepAction(stepIdx, onComplete) {
  const config = state.stepsConfig[stepIdx];

  switch(stepIdx) {
    case 0: // Portafilter -> Grinder Fork
      playTone(520, 'sine', 0.15, 0.1);
      animateHandPunch(() => {
        portafilterObj.position.set(-1.18, 1.28, -0.27);
        showComboPopup(config.popup);
        advanceStep();
        if (onComplete) onComplete();
      });
      break;

    case 1: // Grinder -> Tamping Mat
      playGrinderSound();
      showActionProgressBar('ПОМОЛ ЗЕРНА (18 грамм)...', 1400, () => {
        playSuccessChime();
        portafilterObj.position.set(-0.42, 1.18, 0.05);
        showComboPopup(config.popup);
        advanceStep();
        if (onComplete) onComplete();
      });
      break;

    case 2: // Tamper -> Lock into Left Group Head
      animateHandPunch(() => {
        playTamperThud();
        if (window.triggerCameraShake) window.triggerCameraShake(0.04);

        // Realistic smooth tamping sequence
        tamperObj.position.set(-0.42, 1.30, 0.05);
        runLater(() => {
          tamperObj.position.set(-0.42, 1.22, 0.05);
          runLater(() => {
            tamperObj.position.set(-0.18, 1.16, 0.05);
            portafilterObj.position.set(-0.70, 1.32, -0.17);
            showComboPopup(config.popup);
            advanceStep();
            if (onComplete) onComplete();
          }, 250);
        }, 200);
      });
      break;

    case 3: // Espresso Extraction into Cup
      playEspressoFlowSound();
      espressoStreamParticles.visible = true;
      cupLiquidMesh.visible = true;
      cupLiquidMesh.scale.set(1, 0.30, 1);
      cupLiquidMesh.material.color.setHex(0x3E271E);

      showActionProgressBar('ЭКСТРАКЦИЯ ЭСПРЕССО (9 БАР)...', 2000, () => {
        espressoStreamParticles.visible = false;
        playSuccessChime();
        showComboPopup(config.popup);
        advanceStep();
        if (onComplete) onComplete();
      });
      break;

    case 4: // Steaming Milk under Right Wand -> Pour into Cup
      playSteamSound();
      pitcherObj.position.set(-0.04, 1.18, -0.19);
      steamParticles.visible = true;

      showActionProgressBar('ВЗБИВАНИЕ ОВСЯНОГО МОЛОКА...', 1800, () => {
        steamParticles.visible = false;
        playSuccessChime();

        // Animate silky milk pouring over cup
        pitcherObj.position.set(-0.62, 1.36, -0.15);
        pitcherObj.rotation.z = -0.40;
        cupLiquidMesh.scale.set(1, 0.75, 1);
        cupLiquidMesh.material.color.setHex(0xE5D4C0);

        runLater(() => {
          pitcherObj.rotation.z = 0;
          pitcherObj.position.set(0.20, 1.16, -0.05);
          showComboPopup(config.popup);
          advanceStep();
          if (onComplete) onComplete();
        }, 700);
      });
      break;

    case 5: // Assemble Final Iced Latte & Present to Customer
      playIceDropSound();
      iceCubesGroup.visible = true;
      animateHandPunch(() => {
        cupLiquidMesh.scale.set(1, 0.90, 1);
        cupObj.position.set(0.0, 1.16, 0.12);
        advanceStep();
        renderQuestSuccess();
        if (onComplete) onComplete();
      });
      break;
  }
}

function advanceStep() {
  const done = state.stepsConfig[state.step];
  if (done) sessionEvents.push({ t: Math.round((Date.now() - sessionStartedAt) / 100) / 10, action: `STEP_DONE_${done.id}`, ok: true });
  state.step++;
  renderHUD();
}

function renderQuestSuccess() {
  renderHUDComplete();
  runLater(() => {
    const gameActive = document.getElementById('gameScreen').classList.contains('active');
    if (currentProfession === 'barista' && state.quest === 1 && gameActive) startQuest2Conflict();
  }, 1400);
}

// ================= QUEST 2: SOFT SKILLS =================
function startQuest2Conflict() {
  state.quest = 2;
  state.quest2StartedAt = Date.now();
  document.getElementById('vrQuestTitle').innerText = 'КВЕСТ 2: КОНФЛИКТ С ГОСТЕМ';
  if (customerObj) customerObj.visible = true;

  player.pos.set(0, 1.65, 0.75);
  player.yaw = 0;
  player.pitch = 0.05;

  playTone(280, 'sawtooth', 0.4, 0.12);

  const hud = document.getElementById('hudDockInner') || document.getElementById('hudBottom');
  hud.innerHTML = `
    <div class="speech-bubble" id="typewriterBox">
      😡 <strong>Клиент (в упор):</strong> <span id="typewriterText"></span>
    </div>
    <div>
      <button type="button" class="dialog-option release-choice" onclick="handleConflictAnswer('A')">
        <div class="dialog-tag">A</div>
        <div>«Вы сами так заказали, проверяйте чек перед оплатой»</div>
      </button>
      <button type="button" class="dialog-option release-choice" onclick="handleConflictAnswer('B')">
        <div class="dialog-tag">B</div>
        <div>«Простите за ошибку! Я переделаю за 1 минуту и угощу вас фирменным десертом»</div>
      </button>
      <button type="button" class="dialog-option release-choice" onclick="handleConflictAnswer('C')">
        <div class="dialog-tag">C</div>
        <div>«Подождите, я позову управляющего смены»</div>
      </button>
    </div>
  `;

  const fullText = "«Я трижды повторил: БЕЗ САХАРА! Вы испортили мой заказ, я требую жалобную книгу!»";
  let charIdx = 0;
  const txtSpan = document.getElementById('typewriterText');
  let typeIntv = runEvery(() => {
    if (txtSpan) {
      txtSpan.innerText += fullText[charIdx];
      charIdx++;
      if (charIdx >= fullText.length) clearInterval(typeIntv);
    } else {
      clearInterval(typeIntv);
    }
  }, 25);
}

function handleConflictAnswer(opt) {
  if (state.quest !== 2 || state.conflictChoice) return;
  state.conflictChoice = opt;
  sessionEvents.push({ t: Math.round((Date.now() - sessionStartedAt) / 100) / 10, action: 'CUSTOMER_DECISION_' + opt, ok: opt === 'B' });
  state.conflictResponseSec = Math.round((Date.now() - state.quest2StartedAt) / 100) / 10;
  playSuccessChime();
  if (customerObj) customerObj.visible = false;
  if (opt === 'B' && (fit.scores.timing ?? 0) < 85) {
    isActionInProgress = true;
    const before = fit.scores.timing ?? 0;
    mgShot(() => {
      isActionInProgress = false;
      sessionEvents.push({ t: Math.round((Date.now() - sessionStartedAt) / 100) / 10, action: 'BARISTA_REMAKE', ok: fit.scores.timing > before });
      startQuest3Management();
    });
    return;
  }
  startQuest3Management();
}

// ================= QUEST 3: MANAGEMENT =================
function startQuest3Management() {
  state.quest = 3;
  document.getElementById('vrQuestTitle').innerText = 'КВЕСТ 3: КАССА И ЗАКУПКА';

  const order = baristaOrder();
  const hud = document.getElementById('hudDockInner') || document.getElementById('hudBottom');
  const statement = gameText(
    `Спрос: ${order.demand} кг. На складе: ${order.stock} кг. Бюджет: ${formatTenge(order.budget)}.`,
    `Demand: ${order.demand} kg. In stock: ${order.stock} kg. Budget: ${formatTenge(order.budget)}.`,
    `Сұраныс: ${order.demand} кг. Қоймада: ${order.stock} кг. Бюджет: ${formatTenge(order.budget)}.`
  );
  const title = gameText('Заказ зерна на неделю', 'Weekly coffee order', 'Апталық кофе дәні тапсырысы');
  hud.innerHTML = `<p><strong>${title}</strong></p><p>${statement}</p><div>
    ${Object.entries(order.options).map(([id, [mass, price]], i) =>
      `<button type="button" class="dialog-option release-choice" onclick="handleBudgetAnswer('${id}')">
        <span class="dialog-tag">${i + 1}</span>
        <span>${mass} ${gameText('кг', 'kg', 'кг')} · ${formatTenge(price)}</span>
      </button>`
    ).join('')}
  </div>`;
}

function handleBudgetAnswer(opt) {
  if (state.quest !== 3 || state.budgetChoice) return;
  state.budgetChoice = opt;
  sessionEvents.push({ t: Math.round((Date.now() - sessionStartedAt) / 100) / 10, action: 'PURCHASE_DECISION_' + opt.toUpperCase(), ok: opt === 'optimal' });
  triggerEpicVictory();
}
