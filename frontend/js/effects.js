// SynapKor — Interaction feedback: hand animation, progress bar, popups.

// All timings use elapsed time, so tools move at the same speed on 30/60/120 Hz displays.
function animateHandPunch(onComplete) {
  if (!handsGroup || !rightHand) { onComplete?.(); return; }
  const hand = rightHand;
  const restY = hand.position.y, restX = hand.rotation.x;
  handsGroup.userData.animating = true;
  const started = performance.now(), owner = runNumber;
  let frame;
  const restore = () => {
    cancelAnimationFrame(frame);
    hand.position.z = -0.55; hand.position.y = restY; hand.rotation.x = restX;
    handsGroup.userData.animating = false;
  };
  const unregister = onRunEnd(restore);
  function tick(now) {
    if (owner !== runNumber) return;
    const progress = Math.min(1, (now - started) / 380);
    const reach = Math.sin(Math.PI * progress) ** 2;
    hand.position.z = -0.55 - reach * 0.18;
    hand.position.y = restY + reach * 0.025;
    hand.rotation.x = restX - reach * 0.12;
    if (progress < 1) frame = requestAnimationFrame(tick);
    else { unregister(); restore(); onComplete?.(); }
  }
  frame = requestAnimationFrame(tick);
}

function animateProp(object, targets, duration, onComplete, lift = 0) {
  if (!object) { onComplete?.(); return; }
  const tracks = Object.entries(targets).map(([key, to]) => ({ key, to, from: [object[key].x, object[key].y, object[key].z] }));
  const started = performance.now(), owner = runNumber;
  let frame;
  const unregister = onRunEnd(() => cancelAnimationFrame(frame));
  function tick(now) {
    if (owner !== runNumber) { unregister(); return; }
    const p = Math.min(1, (now - started) / duration);
    const ease = p * p * p * (p * (p * 6 - 15) + 10);
    for (const { key, from, to } of tracks) {
      object[key].set(
        from[0] + (to[0] - from[0]) * ease,
        from[1] + (to[1] - from[1]) * ease + (key === 'position' ? Math.sin(Math.PI * p) * lift : 0),
        from[2] + (to[2] - from[2]) * ease
      );
    }
    if (p < 1) frame = requestAnimationFrame(tick);
    else {
      for (const { key, to } of tracks) object[key].set(...to);
      unregister(); onComplete?.();
    }
  }
  frame = requestAnimationFrame(tick);
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
