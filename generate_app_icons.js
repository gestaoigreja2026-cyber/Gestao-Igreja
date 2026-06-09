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
        .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toFormat('png')
        .toFile(path.join(__dirname, 'public', 'favicon.ico'));

    console.log('Generating 192x192 icon...');
    await sharp(source)
        .resize(134, 134, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .extend({
            top: 29, bottom: 29, left: 29, right: 29,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toFormat('png')
        .toFile(path.join(__dirname, 'public', 'logo-192.png'));
        
    console.log('Generating 256x256 icon...');
    await sharp(source)
        .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .extend({
            top: 38, bottom: 38, left: 38, right: 38,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toFormat('png')
        .toFile(path.join(__dirname, 'public', 'logo-256.png'));

    console.log('Generating 512x512 icon...');
    await sharp(source)
        .resize(360, 360, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .extend({
            top: 76, bottom: 76, left: 76, right: 76,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toFormat('png')
        .toFile(path.join(__dirname, 'public', 'logo-512.png'));
        
    console.log('Generating 1024x1024 icon...');
    await sharp(source)
        .resize(720, 720, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .extend({
            top: 152, bottom: 152, left: 152, right: 152,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toFormat('png')
        .toFile(path.join(__dirname, 'public', 'logo-1024.png'));

    console.log('PWA and Installer icons generated successfully!');
}

generate().catch(console.error);
