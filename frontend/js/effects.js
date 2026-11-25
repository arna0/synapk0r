// SynapKor — Interaction feedback: hand animation, progress bar, popups.

function animateHandPunch(onComplete) {
  if (!handsGroup || !rightHand) { if (onComplete) onComplete(); return; }
  handsGroup.userData.animating = true;
  const started = performance.now();
  const owner = runNumber;

  function step(now) {
    if (owner !== runNumber) return;
    const progress = (now - started) / 210;
    if (progress <= 0.5) {
      rightHand.position.z = -0.55 - progress * 0.4;
    } else if (progress <= 1.0) {
      rightHand.position.z = -0.75 + (progress - 0.5) * 0.4;
    } else {
      rightHand.position.z = -0.55;
      handsGroup.userData.animating = false;
      if (onComplete) onComplete();
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function showActionProgressBar(title, durationMs, onFinished) {
  const wrap = document.getElementById('actionProgress');
  const titleEl = document.getElementById('actionProgressTitle');
  const fillEl = document.getElementById('actionProgressFill');
  titleEl.innerText = title;
  wrap.style.display = 'flex';
  fillEl.style.width = '0%';

  let start = Date.now();
  let intv = setInterval(() => {
    let elapsed = Date.now() - start;
    let pct = Math.min((elapsed / durationMs) * 100, 100);
    fillEl.style.width = pct + '%';
    if (pct >= 100) {
      clearInterval(intv);
      setTimeout(() => {
        wrap.style.display = 'none';
        if (onFinished) onFinished();
      }, 150);
    }
  }, 30);
}

function showComboPopup(text) {
  const el = document.getElementById('comboPopup');
  el.innerText = text;
  el.classList.add('active');
  setTimeout(() => { el.classList.remove('active'); }, 1200);
}
