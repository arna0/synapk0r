// Original procedural figures. Geometry is built locally from Three.js primitives.
function createProceduralPerson() {
  const root = new THREE.Group();
  root.name = 'SynapKorPerson';
  const bones = {};
  const skin = new THREE.MeshStandardMaterial({ color: 0xb77e5e, roughness: 0.82 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x446789, roughness: 0.9 });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x253247, roughness: 0.95 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x29221f, roughness: 1 });
  const shoes = new THREE.MeshStandardMaterial({ color: 0x18202b, roughness: 0.8 });
  function joint(name, parent, x, y, z = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    bones[name] = group;
    return group;
  }
  function oval(parent, material, x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }
  const hips = joint('hip', root, 0, 0.93);
  oval(hips, trousers, 0, 0, 0, 0.19, 0.14, 0.13);
  const spine = joint('spine_02', hips, 0, 0.18);
  oval(spine, shirt, 0, 0.12, 0, 0.235, 0.30, 0.135);
  const neck = joint('neck', spine, 0, 0.40);
  oval(neck, skin, 0, 0.025, 0, 0.068, 0.09, 0.065);
  const head = joint('head', neck, 0, 0.17);
  oval(head, skin, 0, 0, 0, 0.125, 0.165, 0.12);
  oval(head, hair, 0, 0.085, -0.015, 0.128, 0.085, 0.12);
  oval(head, skin, 0, -0.01, 0.113, 0.025, 0.035, 0.028);
  for (const side of [-1, 1]) {
    oval(head, hair, side * 0.045, 0.025, 0.112, 0.012, 0.014, 0.008);
    oval(head, skin, side * 0.124, -0.005, 0, 0.023, 0.041, 0.025);
    const suffix = side < 0 ? 'l' : 'r';
    const arm = joint('upperarm_' + suffix, spine, side * 0.245, 0.25);
    oval(arm, shirt, 0, -0.145, 0, 0.075, 0.17, 0.075);
    const forearm = joint('lowerarm_' + suffix, arm, 0, -0.29);
    oval(forearm, skin, 0, -0.13, 0, 0.052, 0.145, 0.055);
    oval(forearm, skin, 0, -0.29, 0, 0.055, 0.085, 0.032);
    const thigh = joint('upperleg_' + suffix, hips, side * 0.105, -0.07);
    oval(thigh, trousers, 0, -0.20, 0, 0.09, 0.23, 0.09);
    const shin = joint('lowerleg_' + suffix, thigh, 0, -0.40);
    oval(shin, trousers, 0, -0.18, 0, 0.065, 0.21, 0.07);
    oval(shin, shoes, 0, -0.38, 0.055, 0.075, 0.06, 0.14);
  }
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.gfxDone = true;
    mesh.raycast = () => {};
  });
  return { root, bones };
}

function createProceduralHand() {
  const hand = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc59070, roughness: 0.8 });
  function part(x, y, sx, sy, sz, angle = 0) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), skin);
    mesh.position.set(x, y, 0);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.z = angle;
    mesh.userData.gfxDone = true;
    hand.add(mesh);
  }
  part(0, 0.52, 0.25, 0.68, 0.20);
  part(0, 1.28, 0.33, 0.42, 0.14);
  [0.35, 0.47, 0.44, 0.32].forEach((length, i) => {
    part(-0.25 + i * 0.165, 1.61 + length * 0.48, 0.073, length * 0.62, 0.075, (i - 1.5) * -0.06);
  });
  part(-0.37, 1.29, 0.10, 0.27, 0.085, -0.55);
  return hand;
}
