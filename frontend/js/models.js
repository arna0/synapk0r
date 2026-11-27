// Original procedural first-person hand, using the existing reach animation.
const MODELS = { hand: null };

async function loadHand() {
  if (MODELS.hand) return MODELS.hand;
  const obj = createProceduralHand();
  MODELS.hand = obj;
  return obj;
}

const HAND_POSE = { scale: 0.17, rx: -Math.PI / 2 + 0.25, ry: Math.PI + 0.12, rz: -0.35, x: -0.02, y: 0.0, z: 0.08 };

// Keeps the old group (the hand animations move rightHand) and swaps the blocky shapes for the hand.
async function useRealHand() {
  if (typeof rightHand === 'undefined' || !rightHand || rightHand.userData.realHand) return;
  try {
    const hand = await loadHand();
    hand.name = 'RealHand';
    hand.scale.setScalar(HAND_POSE.scale);
    hand.rotation.set(HAND_POSE.rx, HAND_POSE.ry, HAND_POSE.rz);
    hand.position.set(HAND_POSE.x, HAND_POSE.y, HAND_POSE.z);
    rightHand.children.forEach((c) => { c.visible = false; });
    rightHand.add(hand);
    rightHand.userData.realHand = true;
  } catch (e) {
    console.warn('[models] hand not loaded, keeping simple shapes', e);
  }
}

// ---------------------------------------------------------------- wiring
(function wireModels() {
  const after = (name) => {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function (...args) {
      const r = orig.apply(this, args);
      runLater(useRealHand, 600);
      return r;
    };
  };
  ['startScenario', 'startBaristaVR', 'startSafetyVR'].forEach(after);
})();
