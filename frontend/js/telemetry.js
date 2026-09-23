// SynapKor — Shared session state and telemetry bridge (Flutter WebView / parent window).

// =========================================================================
// SYNAPKOR SAFETY & EQUIPMENT MAINTENANCE 3D FPS SIMULATION ENGINE
// =========================================================================

let currentProfession = 'safety'; // 'safety' | 'barista'

const safetyState = {
  powerState: 'ON',        // 'ON' | 'OFF'
  valvePressure: 'HIGH',   // 'HIGH' | 'NORMAL' | 'ZERO'
  ppeEquipped: false,      // bool
  lockoutApplied: false,   // bool
  voltageTested: false,    // bool
  valvesOpened: [false, false],
  selectedTool: null,      // 'multimeter' | 'loto' | null
  errors: 0,
  completed: false,
  stepsCompleted: []
};

// 3D Objects for Safety Environment
let safetyGroup = null;
let mainBreakerLever = null, breakerBase = null, lotoPadlockMesh = null;
let meter1Needle = null, meter2Needle = null, meter3Needle = null;
let valve1Wheel = null, valve2Wheel = null;
let steamParticles1 = null, steamParticles2 = null;
let redLedMesh = null, greenLedMesh = null, voltDisplayMesh = null;
let emergencyBeaconGroup = null, emergencyBeaconLight = null, emergencyBeaconDome = null, emergencyBeaconRotor = null;
let ppeStandMesh = null, testTerminalsMesh = null;
let transformerHumGain = null, transformerOsc1 = null, transformerOsc2 = null;

// ================= HOST BRIDGE (Flutter WebView / iframe parent) =================
// Every message to the host app is JSON: { type, ...data }.
function postToHost(message) {
  const json = JSON.stringify(message);
  try {
    if (window.FlutterChannel && window.FlutterChannel.postMessage) window.FlutterChannel.postMessage(json);
  } catch (e) { console.warn('FlutterChannel postMessage error:', e); }
  try {
    if (window.parent && window.parent !== window) window.parent.postMessage(json, '*');
  } catch (e) { console.warn('Parent postMessage error:', e); }
}

// Ordered action log of the current session (sent to the backend for AI feedback)
let sessionEvents = [];
let sessionStartedAt = Date.now();

function resetSessionEvents() {
  sessionEvents = [];
  sessionStartedAt = Date.now();
}

// ================= SAFETY ACTION LOG =================
function logAction(actionId, timestamp, isCorrectOrder) {
  const ts = timestamp || Date.now();
  const payload = {
    actionId: actionId,
    timestamp: ts,
    isCorrectOrder: isCorrectOrder,
    state: {
      powerState: safetyState.powerState,
      valvePressure: safetyState.valvePressure,
      ppeEquipped: safetyState.ppeEquipped,
      lockoutApplied: safetyState.lockoutApplied,
      voltageTested: safetyState.voltageTested
    }
  };

  sessionEvents.push({ t: Math.round((ts - sessionStartedAt) / 100) / 10, action: actionId, ok: isCorrectOrder });
  postToHost({ type: 'action', ...payload });

  // Update in-game telemetry console
  appendSafetyConsoleLog(actionId, isCorrectOrder, ts);
  console.log('[SynapKor logAction]', payload);
}

function appendSafetyConsoleLog(actionId, isCorrectOrder, ts) {
  const logList = document.getElementById('telemetryLogList');
  if (!logList) return;
  const d = new Date(ts);
  const timeStr = `${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${Math.floor(d.getMilliseconds()/100)}`;
  const entry = document.createElement('div');
  entry.className = `telemetry-log-entry ${isCorrectOrder ? 'ok' : 'err'}`;
  const icon = isCorrectOrder ? '✓' : '✗';
  entry.innerText = `${icon} [${timeStr}] ${actionId}`;
  logList.prepend(entry);
  while (logList.children.length > 5) {
    logList.removeChild(logList.lastChild);
  }
}
