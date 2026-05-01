const Jimp = require('jimp');

async function processImage() {
    try {
        const image = await Jimp.read('public/logo-app-v2.png');
        // Scale image to fit within 512x512
        image.scaleToFit(400, 400); // give some padding

        // Create a new blank 512x512 with white background
        const bg = new Jimp(512, 512, '#FFFFFF');

        // Composite the image onto the middle of the bg
        bg.composite(image, (512 - image.bitmap.width) / 2, (512 - image.bitmap.height) / 2);

        await bg.writeAsync('public/logo-app-square.png');

        console.log('Success!');
    } catch (err) {
        console.error(err);
    }
}

processImage();
