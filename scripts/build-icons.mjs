import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
const sourceIcon = path.join(iconsDir, 'icon-1024.png');

if (!fs.existsSync(sourceIcon)) {
  console.error(`Source icon not found at ${sourceIcon}`);
  console.error('Drop a 1024x1024 PNG named icon-1024.png into assets/icons/ first.');
  process.exit(1);
}

console.log(`Generating app icons from ${sourceIcon}`);

try {
  execSync(`npx --yes electron-icon-builder --input="${sourceIcon}" --output="${iconsDir}" --flatten`, {
    stdio: 'inherit',
  });
  console.log('Icons generated.');
} catch (error) {
  console.error('Icon generation failed:', error?.message ?? error);
  console.error('Fallback: run pwa-asset-generator manually, or install electron-icon-builder as a dev dep.');
  process.exit(1);
}
