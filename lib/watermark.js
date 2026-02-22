const sharp = require('sharp');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const WATERMARK_TEXT = 'TRUTH MD is on fire';
const TEMP_DIR = path.join(__dirname, '..', 'tmp');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function addImageWatermark(inputBuffer) {
    try {
        const metadata = await sharp(inputBuffer).metadata();
        const width = metadata.width || 800;
        const height = metadata.height || 800;

        const fontSize = Math.max(Math.floor(width * 0.06), 20);
        const padding = Math.floor(fontSize * 0.5);
        const bgHeight = fontSize + padding * 2;
        const bgWidth = Math.floor(WATERMARK_TEXT.length * fontSize * 0.65) + padding * 2;

        const svgOverlay = Buffer.from(`
            <svg width="${width}" height="${height}">
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="black" flood-opacity="0.7"/>
                    </filter>
                </defs>
                <rect x="${(width - bgWidth) / 2}" y="${height - bgHeight - 15}" 
                      width="${bgWidth}" height="${bgHeight}" rx="8" ry="8" 
                      fill="rgba(0,0,0,0.55)"/>
                <text x="${width / 2}" y="${height - padding - 15}" 
                      font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" 
                      font-weight="bold" fill="white" text-anchor="middle" 
                      dominant-baseline="auto" filter="url(#shadow)">
                    ${WATERMARK_TEXT}
                </text>
            </svg>
        `);

        const result = await sharp(inputBuffer)
            .composite([{ 
                input: svgOverlay, 
                top: 0, 
                left: 0,
                blend: 'over'
            }])
            .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
            .toBuffer();

        return result;
    } catch (err) {
        console.error('[WATERMARK] Image watermark error:', err.message);
        return inputBuffer;
    }
}

function addVideoWatermark(inputPath) {
    return new Promise((resolve) => {
        try {
            const outputPath = inputPath.replace(/(\.\w+)$/, '_wm$1');

            execFile('ffmpeg', [
                '-y', '-i', inputPath,
                '-vf', `drawtext=text='${WATERMARK_TEXT}':fontsize=24:fontcolor=white:borderw=2:bordercolor=black:x=(w-tw)/2:y=h-th-20`,
                '-c:a', 'copy', '-preset', 'ultrafast', outputPath
            ], { timeout: 60000 }, (err) => {
                if (!err && fs.existsSync(outputPath)) {
                    try { fs.unlinkSync(inputPath); } catch {}
                    try { fs.renameSync(outputPath, inputPath); } catch {}
                } else {
                    console.error('[WATERMARK] Video watermark error:', err?.message);
                    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
                }
                resolve(inputPath);
            });
        } catch (err) {
            console.error('[WATERMARK] Video watermark error:', err.message);
            resolve(inputPath);
        }
    });
}

module.exports = { addImageWatermark, addVideoWatermark };
