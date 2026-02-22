const yts = require('yt-search');
const axios = require('axios');

async function song2Command(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, {
            react: { text: "🎵", key: message.key }
        });

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return await sock.sendMessage(chatId, {
                text: "What song do you want to download?"
            }, { quoted: message });
        }

        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { text: "No songs found!" });
        }

        const video = videos[0];
        const urlYt = video.url;

        const apis = [
            `https://apiskeith.top/download/audio?url=${encodeURIComponent(urlYt)}`,
            `https://apiskeith.top/download/ytmp3?url=${encodeURIComponent(urlYt)}`,
        ];

        let audioUrl = null;
        let title = video.title;

        for (const apiUrl of apis) {
            try {
                const response = await axios.get(apiUrl, { timeout: 60000 });
                const data = response.data;
                if (!data?.status) continue;

                const result = data.result;
                const url = (typeof result === 'string' && result.startsWith('http')) ? result :
                    result?.download || result?.url || result?.downloadUrl || result?.link || null;

                if (url) {
                    audioUrl = url;
                    title = result?.title || data?.title || video.title;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!audioUrl) {
            return await sock.sendMessage(chatId, {
                text: "Failed to fetch audio. Please try again later."
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '💅', key: message.key } });

    } catch (error) {
        console.error('Error in song2 command:', error);
        await sock.sendMessage(chatId, { text: "Download failed. Please try again later." });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    }
}

module.exports = song2Command;
