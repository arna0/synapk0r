import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const restricted = ['hand.obj', 'hand_diffuse.jpg', 'hand_normal.jpg', 'walker.fbx'];
for (const area of ['frontend', 'mobile/assets/sim']) {
  for (const filename of restricted) {
    if (existsSync(path.join(root, area, 'models', filename))) {
      throw new Error('Unconfirmed third-party asset in release content: ' + area + '/models/' + filename);
    }
  }
}
for (const file of ['models.js', 'npc.js']) {
  const source = readFileSync(path.join(root, 'frontend/js', file), 'utf8');
  if (/models\/(hand|walker)/.test(source)) throw new Error('External scanned asset reference in ' + file);
}
console.log('Asset check passed: original procedural figures and hands.');
