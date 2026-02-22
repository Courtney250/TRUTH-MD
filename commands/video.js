const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 2) {
    let lastError;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (i < attempts) await new Promise(r => setTimeout(r, 1500));
        }
    }
    throw lastError;
}

async function getVideoDownload(youtubeUrl) {
    const apis = [
        `https://apiskeith.top/download/video?url=${encodeURIComponent(youtubeUrl)}`,
        `https://apiskeith.top/download/ytmp4?url=${encodeURIComponent(youtubeUrl)}`,
    ];

    let lastError;
    for (const apiUrl of apis) {
        try {
            const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
            if (!res?.data) continue;

            const data = res.data;
            const result = data.result || data;
            const downloadUrl = (typeof result === 'string' && result.startsWith('http')) ? result :
                result?.download || result?.url || result?.downloadUrl || result?.link || null;

            if (downloadUrl) return downloadUrl;
        } catch (err) {
            lastError = err;
            continue;
        }
    }
    throw lastError || new Error('All video APIs failed');
}

async function videoCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: '🎥', key: message.key } });

        const text = message.message?.conversation
            || message.message?.extendedTextMessage?.text
            || message.message?.imageMessage?.caption
            || "";
        const parts = text.split(' ');
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            await sock.sendMessage(chatId, { react: { text: '❓', key: message.key } });
            return sock.sendMessage(chatId, {
                text: '🎬 Provide a YouTube link or Name\nExample:\n\n.video Not Like Us Music Video\n.video Espresso'
            }, { quoted: message });
        }

        if (query.length > 100) {
            await sock.sendMessage(chatId, { react: { text: '📝', key: message.key } });
            return sock.sendMessage(chatId, { text: '📝 Video name too long! Max 100 chars.' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        const searchResult = (await yts(query)).videos[0];
        if (!searchResult) {
            await sock.sendMessage(chatId, { react: { text: '🚫', key: message.key } });
            return sock.sendMessage(chatId, { text: "🚫 Couldn't find that video. Try another one!" }, { quoted: message });
        }

        const video = searchResult;
        const downloadUrl = await getVideoDownload(video.url);

        await sock.sendMessage(chatId, { react: { text: '⬇️', key: message.key } });

        const caption = `*Title:* ${video.title}\n*Duration:* ${video.timestamp}`;

        await sock.sendMessage(chatId, {
            video: { url: downloadUrl },
            caption,
            mimetype: "video/mp4"
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            document: { url: downloadUrl },
            mimetype: "video/mp4",
            fileName: `${video.title.substring(0, 100)}.mp4`,
            caption
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (error) {
        console.error("video command error:", error);

        let errorMessage = `🚫 Error: ${error.message}`;
        if (error.message.includes("timeout")) {
            errorMessage = "⏱️ Download timeout! Video might be too large.";
        } else if (error.message.includes("API failed") || error.message.includes("no download")) {
            errorMessage = "🔧 API error! Try again in a few moments.";
        } else if (error.message.includes("socket hang up")) {
            errorMessage = "📡 Connection lost! Please retry.";
        }

        await sock.sendMessage(chatId, { react: { text: '⚠️', key: message.key } });
        return sock.sendMessage(chatId, { text: errorMessage }, { quoted: message });
    }
}

module.exports = videoCommand;
