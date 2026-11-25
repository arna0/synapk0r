// SynapKor — Module "Barista": quest 1 (recipe), quest 2 (guest conflict), quest 3 (purchasing).

// ================= QUEST 1: HARD SKILLS PIPELINE =================
function handleFPSObjectClick(name) {
  if (isActionInProgress) return;
  if (state.quest === 1) {
    const currentTarget = state.stepsConfig[state.step];
    if (currentTarget && name === currentTarget.id) {
      isActionInProgress = true;
      executeStepAction(state.step, () => {
        setTimeout(() => {
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

  const runId = scenarioState.runId;
  switch(stepIdx) {
    case 0: // Portafilter -> Grinder Fork
      playTone(520, 'sine', 0.15, 0.1);
      animateHandPunch(() => {
        if (!isScenarioRunActive(runId)) return;
        tweenObject(portafilterObj, { x: -1.18, y: 1.28, z: -0.27 }, 380, () => {
          showComboPopup(config.popup);
          advanceStep();
          onComplete?.();
        });
      });
      break;

    case 1: // Grinder -> Tamping Mat
      playGrinderSound();
      showActionProgressBar('ПОМОЛ ЗЕРНА (18 грамм)...', 1400, () => {
        if (!isScenarioRunActive(runId)) return;
        playSuccessChime();
        tweenObject(portafilterObj, { x: -0.42, y: 1.18, z: 0.05 }, 430, () => {
          showComboPopup(config.popup);
          advanceStep();
          onComplete?.();
        });
      });
      break;

    case 2: // Tamper -> Lock into Left Group Head
      animateHandPunch(() => {
        playTamperThud();
        if (window.triggerCameraShake) window.triggerCameraShake(0.04);

        if (!isScenarioRunActive(runId)) return;
        tweenObject(tamperObj, { x: -0.42, y: 1.22, z: 0.05 }, 285, () => {
          tweenObject(tamperObj, { x: -0.18, y: 1.16, z: 0.05 }, 380);
          tweenObject(portafilterObj, { x: -0.70, y: 1.32, z: -0.17 }, 530, () => {
            showComboPopup(config.popup);
            advanceStep();
            onComplete?.();
          });
        });
      });
      break;

    case 3: // Espresso Extraction into Cup
      playEspressoFlowSound();
      espressoStreamParticles.visible = true;
      cupLiquidMesh.visible = true;
      cupLiquidMesh.scale.set(1, 0.025, 1);
      cupLiquidMesh.material.color.setHex(0x3E271E);

      showActionProgressBar('ЭКСТРАКЦИЯ ЭСПРЕССО (9 БАР)...', 2000, () => {
        if (!isScenarioRunActive(runId)) return;
        espressoStreamParticles.visible = false;
        cupLiquidMesh.scale.y = 0.30;
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
        if (!isScenarioRunActive(runId)) return;
        steamParticles.visible = false;
        playSuccessChime();

        tweenObject(pitcherObj, { x: -0.57, y: 1.43, z: -0.15, rot: [0, 0, -0.67] }, 390, () => {
          document.getElementById('gameScreen').classList.add('milk-pouring');
          setTimeout(() => {
            if (!isScenarioRunActive(runId)) return;
            document.getElementById('gameScreen').classList.remove('milk-pouring');
            cupLiquidMesh.scale.y = 0.75;
            cupLiquidMesh.material.color.setHex(0xE5D4C0);
            tweenObject(pitcherObj, { x: 0.20, y: 1.16, z: -0.05, rot: [0, 0, 0] }, 450, () => {
              showComboPopup(config.popup);
              advanceStep();
              onComplete?.();
            });
          }, 740);
        });
      });
      break;

    case 5: // Assemble Final Iced Latte & Present to Customer
      playIceDropSound();
      iceCubesGroup.visible = true;
      animateHandPunch(() => {
        if (!isScenarioRunActive(runId)) return;
        cupLiquidMesh.scale.set(1, 0.90, 1);
        tweenObject(cupObj, { x: 0, y: 1.16, z: 0.12 }, 530, () => {
          showComboPopup(config.popup);
          renderQuestSuccess();
          onComplete?.();
        });
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
  setTimeout(() => {
    const gameActive = document.getElementById('gameScreen').classList.contains('active');
    if (currentProfession === 'barista' && state.quest === 1 && gameActive) startQuest2Conflict();
  }, 1400);
}

// ================= QUEST 2: SERVICE PRIORITIES =================
let cafeServicePriority = '';

const CAFE_SERVICE_OPTIONS = {
  guest: ['Сначала переделать напиток', 'Гость получил новый напиток. Два заказа в очереди пришлось задержать.'],
  queue: ['Сначала закрыть два заказа', 'Два заказа выданы. Гость с жалобой ждал без объяснения.'],
  coordinate: ['Назвать гостю время и попросить коллегу помочь', 'Коллега взял очередь. Гость знает, когда получит новый напиток.']
};

function startQuest2Conflict() {
  state.quest = 2;
  state.quest2StartedAt = Date.now();
  cafeServicePriority = '';
  document.getElementById('vrQuestTitle').innerText = 'Смена бариста · час пик';
  const real = NPC.module === 'barista' && NPC.state !== 'hidden';
  if (customerObj && !real) customerObj.visible = true;
  player.pos.set(0, 1.65, 0.75);
  player.yaw = 0;
  player.pitch = 0.05;
  const hud = document.getElementById('hudDockInner');
  hud.innerHTML = `
    <div class="work-tickets" aria-label="${trRu('Очередь заказов')}">
      <span>#24 · Espresso</span><span>#25 · Latte</span><span data-priority="true">${trRu('Возврат · Iced Oat Latte')}</span>
    </div>
    <p class="case-question">Два заказа ждут выдачи. Гость просит переделать напиток. Коллега свободен. Что сделаете первым?</p>
    <p class="cafe-complaint"></p>
    ${Object.entries(CAFE_SERVICE_OPTIONS).map(([id, [label]]) =>
      `<button type="button" class="dialog-option scenario-option" onclick="chooseCafeServicePriority('${id}')">${label}</button>`
    ).join('')}`;
  hud.querySelector('.cafe-complaint').textContent = cafeComplaint().text;
}

function chooseCafeServicePriority(option) {
  if (!Object.hasOwn(CAFE_SERVICE_OPTIONS, option) || state.quest !== 2 || cafeServicePriority) return;
  cafeServicePriority = option;
  sessionEvents.push({ t: scenarioNow(), action: 'BARISTA_PRIORITY_' + option, ok: option === 'coordinate' });
  const hud = document.getElementById('hudDockInner');
  hud.innerHTML = `
    <p class="service-outcome" role="status">${CAFE_SERVICE_OPTIONS[option][1]}</p>
    <p class="case-question">Что вы скажете гостю?</p>
    <button type="button" class="dialog-option scenario-option" onclick="handleConflictAnswer('A')">«Проверьте чек. Я сделал то, что заказано»</button>
    <button type="button" class="dialog-option scenario-option" onclick="handleConflictAnswer('B')">«Извините за ошибку. Я переделаю напиток и скажу, когда он будет готов»</button>
    <button type="button" class="dialog-option scenario-option" onclick="handleConflictAnswer('C')">«Я позову управляющего»</button>`;
  hud.querySelector('button').focus();
}

function handleConflictAnswer(opt) {
  if (state.quest !== 2 || !cafeServicePriority || !['A', 'B', 'C'].includes(opt)) return;
  state.conflictChoice = opt;
  sessionEvents.push({ t: scenarioNow(), action: 'BARISTA_GUEST_' + opt, ok: opt === 'B' });
  state.conflictResponseSec = Math.round((Date.now() - state.quest2StartedAt) / 100) / 10;
  playSuccessChime();
  if (customerObj) customerObj.visible = false;
  startQuest3Management();
}

// ================= QUEST 3: MANAGEMENT =================
function startQuest3Management() {
  state.quest = 3;
  document.getElementById('vrQuestTitle').innerText = 'КВЕСТ 3: КАССА И ЗАКУПКА';

  const hud = document.getElementById('hudDockInner') || document.getElementById('hudBottom');
  hud.innerHTML = `
    <div style="font-size:12px; color:var(--amber); font-weight:700; margin-bottom:4px;">
      💼 3D POS ТЕРМИНАЛ: Закупка зерна на неделю
    </div>
    <p style="font-size:12px; color:var(--text-muted-dark); margin-bottom:10px;">
      Бюджет кофейни: 120 000 ₸. Расход: 35 кг/неделю. Выберите оптимальный заказ:
    </p>
    <div>
      <div class="dialog-option" onclick="handleBudgetAnswer('low')">
        <div class="dialog-tag" style="border:1px solid var(--border-dark);">1</div>
        <div><strong>45 000 ₸ (15 кг)</strong> — Экономия (высокий риск дефицита)</div>
      </div>
      <div class="dialog-option" onclick="handleBudgetAnswer('optimal')">
        <div class="dialog-tag" style="border:1px solid var(--emerald); color:var(--emerald);">2</div>
        <div><strong>90 000 ₸ (35 кг)</strong> — Оптимально (100% покрытие + 30 000 ₸ резерв)</div>
      </div>
      <div class="dialog-option" onclick="handleBudgetAnswer('high')">
        <div class="dialog-tag" style="border:1px solid var(--rose); color:var(--rose);">3</div>
        <div><strong>135 000 ₸ (55 кг)</strong> — Перерасход бюджета на 15 000 ₸</div>
      </div>
    </div>
  `;
}

function handleBudgetAnswer(opt) {
  state.budgetChoice = opt;
  sessionEvents.push({ t: scenarioNow(), action: 'BARISTA_STOCK_' + opt, ok: opt === 'optimal' });
  triggerEpicVictory();
}
