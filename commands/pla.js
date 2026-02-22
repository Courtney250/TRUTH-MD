const axios = require('axios');
const yts = require('yt-search');

async function playCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, {
            react: { text: "🎵", key: message.key }
        });

        const q = message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption || '';

        const args = q.split(' ').slice(1);
        const query = args.join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: '*🎵 Audio Player*\nPlease provide a song name to play.*'
            }, { quoted: message });
        }

        console.log('[PLA] Searching YT for:', query);
        const search = await yts(query);
        const video = search.videos[0];

        if (!video) {
            return await sock.sendMessage(chatId, {
                text: '*❌ No Results Found*\nNo songs found for your query. Please try different keywords.*'
            }, { quoted: message });
        }

        const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, '');
        const fileName = `${safeTitle}.mp3`;

        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: `🎵 *NOW PLAYING* 🎵\n\n🎶 *Title:* ${video.title}\n⏱️ *Duration:* ${video.timestamp}\n👁️ *Views:* ${video.views}\n📅 *Uploaded:* ${video.ago}\n\n⬇️ *Downloading your audio...* ⬇️\n\n💡 *Tip:* Use *.video to get the video version*`
        }, { quoted: message });

        const apis = [
            `https://apiskeith.top/download/audio?url=${encodeURIComponent(video.url)}`,
            `https://apiskeith.top/download/ytmp3?url=${encodeURIComponent(video.url)}`,
        ];

        let downloadUrl = null;
        for (const apiUrl of apis) {
            try {
                const response = await axios.get(apiUrl, { timeout: 60000 });
                const data = response.data;
                if (!data?.status) continue;

                const result = data.result;
                const url = (typeof result === 'string' && result.startsWith('http')) ? result :
                    result?.download || result?.url || result?.downloadUrl || result?.link || null;

                if (url) { downloadUrl = url; break; }
            } catch (e) { continue; }
        }

        if (!downloadUrl) {
            return await sock.sendMessage(chatId, {
                text: '*❌ Download Failed*\nFailed to retrieve the MP3 download link. Please try again later.*'
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: fileName
        });

    } catch (err) {
        console.error('[PLA] Error:', err.message);
        await sock.sendMessage(chatId, {
            text: '*❌ Error Occurred*'
        }, { quoted: message });
    }
}

module.exports = playCommand;
