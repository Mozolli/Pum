import { cpSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, 'dist');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of ['index.html', 'style.css', 'game.js', 'model.js', 'pixel-art.js', 'audio.js']) {
  copyFileSync(join(root, file), join(output, file));
}

cpSync(join(root, 'assets'), join(output, 'assets'), { recursive: true });

const kontra = join(output, 'node_modules', 'kontra');
mkdirSync(kontra, { recursive: true });
copyFileSync(join(root, 'node_modules', 'kontra', 'kontra.min.mjs'), join(kontra, 'kontra.min.mjs'));
copyFileSync(join(root, 'node_modules', 'kontra', 'LICENSE'), join(kontra, 'LICENSE'));

console.log('Built GitHub Pages site in dist/.');
