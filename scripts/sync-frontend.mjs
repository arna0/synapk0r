// Copies the web client (frontend/) into the Flutter app assets (mobile/assets/sim/).
// Run before `flutter run` / `flutter build`:  node scripts/sync-frontend.mjs
// (Manual copy instead of fs.cpSync: cpSync crashes on Windows paths with non-ASCII characters in Node 24.)
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'frontend');
const dest = path.join(root, 'mobile', 'assets', 'sim');

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else copyFileSync(a, b);
  }
}

rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);
console.log(`Synced ${path.relative(root, src)} -> ${path.relative(root, dest)}`);
