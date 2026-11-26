import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await build({ entryPoints: ['cloud/worker.js'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true });
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
console.log('Built SynapKor review API');
