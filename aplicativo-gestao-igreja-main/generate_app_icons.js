import fs from 'fs';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate() {
    const source = path.join(__dirname, 'public', 'novo-icone-app.png');

    if (!fs.existsSync(source)) {
        console.error('Source image not found:', source);
        process.exit(1);
    }

    console.log('Generating favicon...');
    await sharp(source)
        .resize(64, 64)
        .toFormat('png')
        .toFile(path.join(__dirname, 'public', 'favicon.ico'));

    console.log('Generating 192x192 icon...');
    await sharp(source)
        .resize(192, 192)
        .toFormat('png')
        .toFile(path.join(__dirname, 'public', 'logo-192.png'));

    console.log('Generating 512x512 icon...');
    await sharp(source)
        .resize(512, 512)
        .toFormat('png')
        .toFile(path.join(__dirname, 'public', 'logo-512.png'));

    console.log('PWA and Installer icons generated successfully!');
}

generate().catch(console.error);
