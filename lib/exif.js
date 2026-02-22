const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let webp, sharp;
try { webp = require('node-webpmux'); } catch (e) {}
try { sharp = require('sharp'); } catch (e) {}

async function writeExifImg(buffer, options = {}) {
    const packname = options.packname || global.packname || '';
    const author = options.author || global.author || '';
    const tmpDir = path.join(__dirname, '..', 'asset', 'temp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, `exif_${Date.now()}.webp`);
    const outputPath = path.join(tmpDir, `exif_out_${Date.now()}.webp`);

    try {
        let webpBuffer;
        if (sharp) {
            webpBuffer = await sharp(buffer)
                .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .webp()
                .toBuffer();
        } else {
            webpBuffer = buffer;
        }

        if (webp && webp.Image) {
            fs.writeFileSync(inputPath, webpBuffer);
            const img = new webp.Image();
            await img.load(inputPath);

            const json = {
                "sticker-pack-id": "com.snowcorp.stickerly.android.stickercontentprovider b5e7275f-f1de-4137-961f-57becfad34f2",
                "sticker-pack-name": packname,
                "sticker-pack-publisher": author,
                "emojis": ["😀"]
            };

            const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
            const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');
            const exif = Buffer.concat([exifAttr, jsonBuffer]);
            exif.writeUInt32LE(jsonBuffer.length, 14);

            img.exif = exif;
            await img.save(outputPath);

            const result = fs.readFileSync(outputPath);
            try { fs.unlinkSync(inputPath); } catch (e) {}
            try { fs.unlinkSync(outputPath); } catch (e) {}
            return result;
        }

        return webpBuffer;
    } catch (e) {
        console.error('writeExifImg error:', e.message);
        try { fs.unlinkSync(inputPath); } catch (e2) {}
        try { fs.unlinkSync(outputPath); } catch (e2) {}
        return buffer;
    }
}

async function writeExifVid(buffer, options = {}) {
    return buffer;
}

module.exports = { writeExifImg, writeExifVid };
