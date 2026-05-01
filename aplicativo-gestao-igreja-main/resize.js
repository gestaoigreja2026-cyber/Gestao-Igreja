import sharp from 'sharp';

async function processImage() {
    try {
        await sharp('public/logo-app-v2.png')
            .resize({
                width: 400,
                height: 400,
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .extend({
                top: 56,
                bottom: 56,
                left: 56,
                right: 56,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toFile('public/logo-app-v3.png');

        console.log('Success!');
    } catch (err) {
        console.error(err);
    }
}

processImage();
