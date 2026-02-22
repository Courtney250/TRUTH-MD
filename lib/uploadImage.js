const FormData = require('form-data');
const axios = require('axios');
const { Readable } = require('stream');

async function uploadImage(buffer) {
    try {
        const form = new FormData();
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        form.append('fileToUpload', stream, { filename: 'image.jpg', contentType: 'image/jpeg' });
        form.append('reqtype', 'fileupload');

        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        if (typeof res.data === 'string' && res.data.startsWith('https://')) {
            return res.data.trim();
        }
        throw new Error('Upload failed: unexpected response');
    } catch (e) {
        try {
            const form2 = new FormData();
            const stream2 = new Readable();
            stream2.push(buffer);
            stream2.push(null);
            form2.append('file', stream2, { filename: 'image.jpg', contentType: 'image/jpeg' });

            const res2 = await axios.post('https://telegra.ph/upload', form2, {
                headers: form2.getHeaders(),
                timeout: 30000
            });

            if (res2.data && res2.data[0]?.src) {
                return 'https://telegra.ph' + res2.data[0].src;
            }
        } catch (e2) {}

        console.error('uploadImage error:', e.message);
        throw new Error('Failed to upload image to any host');
    }
}

module.exports = { uploadImage };
