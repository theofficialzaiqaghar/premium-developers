/**
 * Rasterize root logo.svg only — no design changes.
 * Outputs PNGs for OG, icons, and schema fallbacks.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const logoSvg = path.join(root, 'logo.svg');
const iconsDir = path.join(root, 'assets', 'icons');
const ogDir = path.join(root, 'assets', 'images', 'og');

const svg = await readFile(logoSvg);

await mkdir(iconsDir, { recursive: true });
await mkdir(ogDir, { recursive: true });

const sizes = [
  { out: path.join(iconsDir, 'icon-32.png'), size: 32 },
  { out: path.join(iconsDir, 'apple-touch-icon.png'), size: 180 },
  { out: path.join(iconsDir, 'logo-512.png'), size: 512 },
];

for (const { out, size } of sizes) {
  await sharp(svg, { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out);
}

const ogW = 1200;
const ogH = 630;
const logoPx = 320;
const logoPng = await sharp(svg, { density: 300 })
  .resize(logoPx, logoPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: ogW,
    height: ogH,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([{ input: logoPng, gravity: 'center' }])
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(path.join(ogDir, 'premium-developers-og.jpg'));

console.log('Exported rasters from logo.svg');
