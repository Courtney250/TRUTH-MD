const axios = require('axios');

async function lyricsCommand(sock, chatId, songTitle, message) {
    if (!songTitle) {
        await sock.sendMessage(chatId, { 
            text: '🔍 Please enter the song name to get the lyrics!\nUsage: *lyrics <song name>*'
        }, { quoted: message });
        return;
    }

    try {
        // Keith API
        const res = await axios.get(`https://apiskeith.vercel.app/search/lyrics2?query=${encodeURIComponent(songTitle)}`);
        const data = res.data;

        if (!data.status || !data.result) {
            await sock.sendMessage(chatId, { text: `💢 Lyrics not found for "${songTitle}"` }, { quoted: message });
            return;
        }

        // Assuming the API returns a string like "Artist - Song Title\nLyrics..."
        const fullLyrics = data.result;

        // Try to extract artist and title nicely
        const firstLine = fullLyrics.split('\n')[0] || songTitle;
        let artist = '';
        let title = '';

        if (firstLine.includes(' - ')) {
            [artist, title] = firstLine.split(' - ').map(s => s.trim());
        } else {
            title = firstLine.trim();
        }

        const maxChars = 4096;

        if (fullLyrics.length <= maxChars) {
            // Send full lyrics
            const caption = `🎵 *${title}*${artist ? ` by *${artist}*` : ''}\n\n${fullLyrics}`;
            await sock.sendMessage(chatId, { text: caption }, { quoted: message });
        } else {
            // Lyrics too long: send snippet + link to full lyrics
            const snippet = fullLyrics.slice(0, maxChars - 200) + '...';
            const fullLink = `https://apiskeith.top/download/lyrics?text=${encodeURIComponent(songTitle)}`;
            const caption = `🎵 *${title}*${artist ? ` by *${artist}*` : ''}\n\n${snippet}\n\n📄 View full lyrics: ${fullLink}`;

            await sock.sendMessage(chatId, { text: caption }, { quoted: message });
        }

    } catch (error) {
        console.error('Lyrics command error:', error.message || error);
        await sock.sendMessage(chatId, { 
            text: `❌ An error occurred while fetching the lyrics for "${songTitle}".`
        }, { quoted: message });
    }
}

module.exports = { lyricsCommand };
