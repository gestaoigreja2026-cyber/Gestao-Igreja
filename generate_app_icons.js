import fs from 'fs';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generate() {
    const source = join(__dirname, 'public', 'LOGO APP PWA.png');

    if (!fs.existsSync(source)) {
        console.error('Source image not found:', source);
        process.exit(1);
    }

    console.log('Analyzing logo bounds in the gray canvas...');
    const image = sharp(source);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    
    let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            // Detect non-gray pixels (our background is around 135,135,135)
            const isGray = Math.abs(r - 135) < 18 && Math.abs(g - 135) < 18 && Math.abs(b - 135) < 18;
            if (!isGray) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }

    // Safety margin of 3 pixels around the circle
    const cropLeft = Math.max(0, minX - 3);
    const cropTop = Math.max(0, minY - 3);
    const cropWidth = Math.min(info.width - cropLeft, (maxX - minX) + 6);
    const cropHeight = Math.min(info.height - cropTop, (maxY - minY) + 6);

    console.log(`Cropping circle region: left=${cropLeft}, top=${cropTop}, width=${cropWidth}, height=${cropHeight}`);

    // Create a base cropped image in memory
    const croppedImage = await sharp(source)
        .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
        .toBuffer();

    console.log('Generating favicon...');
    await sharp(croppedImage)
        .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toFormat('png')
        .toFile(join(__dirname, 'public', 'favicon.ico'));

    // Sizes for logo-*.png and pwa-icon-*.png
    const sizes = [192, 256, 512];
    for (const size of sizes) {
        console.log(`Generating logo-${size}.png and pwa-icon-${size}.png...`);
        
        await sharp(croppedImage)
            .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .toFormat('png')
            .toFile(join(__dirname, 'public', `pwa-icon-${size}.png`));

        await sharp(croppedImage)
            .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .toFormat('png')
            .toFile(join(__dirname, 'public', `logo-${size}.png`));
    }

    console.log('Generating 1024x1024 logo...');
    await sharp(croppedImage)
        .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toFormat('png')
        .toFile(join(__dirname, 'public', 'logo-1024.png'));

    console.log('Generating build/icon.png...');
    await sharp(croppedImage)
        .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toFormat('png')
        .toFile(join(__dirname, 'build', 'icon.png'));

    console.log('PWA and App icons updated and maximized successfully!');
}

generate().catch(console.error);
