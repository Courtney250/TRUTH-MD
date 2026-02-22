const fs = require("fs");
const axios = require("axios");
const yts = require("yt-search");
const path = require("path");

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

async function getAudioDownload(youtubeUrl) {
    const apis = [
        `https://apiskeith.top/download/audio?url=${encodeURIComponent(youtubeUrl)}`,
        `https://apiskeith.top/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`,
    ];

    let lastError;
    for (const apiUrl of apis) {
        try {
            const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
            if (!res?.data) continue;

            const data = res.data;
            const result = data.result || data;
            const url = (typeof result === 'string' && result.startsWith('http')) ? result :
                result?.download || result?.url || result?.downloadUrl || result?.link || null;

            if (url) {
                return {
                    download: url,
                    title: result?.title || data?.title || 'YouTube Audio'
                };
            }
        } catch (err) {
            lastError = err;
            continue;
        }
    }
    throw lastError || new Error('All audio APIs failed');
}

async function playCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: "🎼", key: message.key } });

        const tempDir = path.join(__dirname, "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const parts = text.split(" ");
        const query = parts.slice(1).join(" ").trim();

        if (!query)
            return sock.sendMessage(chatId, { text: "🎵 Provide a song name!\nExample: .play Not Like Us" }, { quoted: message });

        if (query.length > 100)
            return sock.sendMessage(chatId, { text: "📝 Song name too long! Max 100 chars." }, { quoted: message });

        const search = await yts(`${query} official`);
        const video = search.videos[0];

        if (!video)
            return sock.sendMessage(chatId, { text: "😕 Couldn't find that song. Try another one!" }, { quoted: message });

        const audio = await getAudioDownload(video.url);
        const downloadUrl = audio.download;
        const songTitle = audio.title || video.title;

        const timestamp = Date.now();
        const fileName = `audio_${timestamp}.mp3`;
        const filePath = path.join(tempDir, fileName);

        const audioStream = await axios({
            method: "get",
            url: downloadUrl,
            responseType: "stream",
            timeout: 600000
        });

        const writer = fs.createWriteStream(filePath);
        audioStream.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0)
            throw new Error("Download failed or empty file!");

        await sock.sendMessage(chatId, { text: `Playing: \n ${songTitle}` });

        await sock.sendMessage(
            chatId,
            {
                document: { url: filePath },
                mimetype: "audio/mpeg",
                fileName: `${songTitle.substring(0, 100)}.mp3`
            },
            { quoted: message }
        );

        fs.unlinkSync(filePath);

    } catch (error) {
        console.error("Play command error:", error);
        await sock.sendMessage(chatId, { text: `🚫 Error: ${error.message}` }, { quoted: message });
    }
}

module.exports = playCommand;
