const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function UploadFileUgu(filePath) {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const res = await axios.post('https://uguu.se/upload', form, {
            headers: form.getHeaders(),
            timeout: 60000
        });

        if (res.data) {
            if (typeof res.data === 'string') return res.data.trim();
            if (res.data.url) return res.data.url;
            if (Array.isArray(res.data.files) && res.data.files[0]?.url) return res.data.files[0].url;
        }

        const form2 = new FormData();
        form2.append('fileToUpload', fs.createReadStream(filePath));
        form2.append('reqtype', 'fileupload');

        const res2 = await axios.post('https://catbox.moe/user/api.php', form2, {
            headers: form2.getHeaders(),
            timeout: 60000
        });

        if (typeof res2.data === 'string' && res2.data.startsWith('https://')) {
            return res2.data.trim();
        }

        throw new Error('Upload failed on all hosts');
    } catch (e) {
        console.error('UploadFileUgu error:', e.message);
        throw e;
    }
}

module.exports = { UploadFileUgu };
