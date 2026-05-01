#!/usr/bin/env node
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const publicDir = path.join(root, 'public');
const buildDir = path.join(root, 'build');
const SIZES = [192, 256, 512, 1024];
const sourcePath = process.argv[2] || path.join(publicDir, 'logo-source.png');

async function main() {
  await mkdir(publicDir, { recursive: true });
  await mkdir(buildDir, { recursive: true });

  for (const size of SIZES) {
    const outPath = path.join(publicDir, `logo-${size}.png`);
    await sharp(sourcePath).resize(size, size).png({ quality: 100 }).toFile(outPath);
    console.log(`Criado: logo-${size}.png`);
  }

  const iconPath = path.join(buildDir, 'icon.png');
  await sharp(sourcePath).resize(256, 256).png({ quality: 100 }).toFile(iconPath);
  console.log(`Criado: build/icon.png`);

  const mainLogo = path.join(publicDir, 'logo-app.png');
  await sharp(sourcePath).resize(512, 512).png({ quality: 100 }).toFile(mainLogo);
  console.log(`Criado: logo-app.png`);

  console.log('Pronto.');
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
