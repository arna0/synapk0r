// SynapKor — Procedural WebAudio sound effects.

// ================= WEBAUDIO PROCEDURAL SOUND SYNTHESIS =================
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, gainVal = 0.1) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e){}
}

function playNoise(duration, filterFreq, gainVal = 0.1) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch(e){}
}

function playGrinderSound() {
  playTone(110, 'sawtooth', 1.2, 0.18);
  playNoise(1.2, 800, 0.12);
}

function playTamperThud() {
  playTone(60, 'sine', 0.35, 0.3);
  playTone(120, 'triangle', 0.2, 0.2);
}

function playEspressoFlowSound() {
  playNoise(2.2, 1200, 0.14);
  playTone(280, 'sine', 2.0, 0.08);
}

function playSteamSound() {
  playNoise(2.0, 2400, 0.18);
  playTone(450, 'sawtooth', 1.8, 0.06);
}

function playIceDropSound() {
  playTone(880, 'sine', 0.15, 0.15);
  setTimeout(() => playTone(1100, 'sine', 0.2, 0.12), 80);
  setTimeout(() => playTone(1320, 'sine', 0.25, 0.1), 160);
}

function playSuccessChime() {
  playTone(523.25, 'sine', 0.25, 0.15);
  setTimeout(() => playTone(659.25, 'sine', 0.25, 0.15), 100);
  setTimeout(() => playTone(783.99, 'sine', 0.35, 0.18), 200);
  setTimeout(() => playTone(1046.5, 'sine', 0.5, 0.2), 300);
}

function playVictoryFanfare() {
  playTone(523.25, 'sine', 0.25, 0.2);
  setTimeout(() => playTone(659.25, 'sine', 0.25, 0.2), 120);
  setTimeout(() => playTone(783.99, 'sine', 0.3, 0.2), 240);
  setTimeout(() => playTone(1046.5, 'sine', 0.6, 0.25), 360);
  setTimeout(() => playTone(1318.5, 'sine', 0.8, 0.3), 500);
}
