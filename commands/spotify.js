const axios = require('axios');

async function spotifyCommand(sock, chatId, message) {
    try {

        
        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';
        
        const used = (rawText || '').split(/\s+/)[0] || '.spotify';
        const query = rawText.slice(used.length).trim();
        
        if (!query) {
            await sock.sendMessage(chatId, { 
                text: 'Usage: .spotify <song/artist/keywords or Spotify URL>\n\nExample: .spotify Faded\nExample: .spotify https://open.spotify.com/track/...' 
            }, { quoted: message });
            return;
        }

        // Check if input is a Spotify URL
        const isSpotifyUrl = query.includes('open.spotify.com/track/');
        
        let audioUrl, trackInfo;

        if (isSpotifyUrl) {
            // Use downloader API for direct Spotify links
            const apiUrl = `https://apiskeith.top/download/spotifydl?url=${encodeURIComponent(query)}`;
            const { data } = await axios.get(apiUrl, { 
                timeout: 20000, 
                headers: { 'user-agent': 'Mozilla/5.0' } 
            });

                    await sock.sendMessage(chatId, {
            react: { text: '🎼', key: message.key }
        });

            if (!data?.success || !data?.track) {
                throw new Error('No result from Spotify downloader API');
            }

            const track = data.track;
            audioUrl = track.audio?.url;
            trackInfo = {
                title: track.title || 'Unknown Title',
                artist: track.artist || 'Unknown Artist',
                duration: track.duration || '',
                thumbnail: track.thumbnail || track.album?.cover,
                spotifyUrl: track.spotify_url || query
            };

        } else {
            // Use search API for queries
            const apiUrl = `https://casper-tech-apis.vercel.app/api/play/sportify?q=${encodeURIComponent(query)}`;
            const { data } = await axios.get(apiUrl, { 
                timeout: 20000, 
                headers: { 'user-agent': 'Mozilla/5.0' } 
            });

            if (!data?.success || !data?.results || data.results.length === 0) {
                throw new Error('No results found for this query');
            }

            // Get the first (best match) result
            const result = data.results[0];
            audioUrl = result.download_url;
            trackInfo = {
                title: result.title || result.name || 'Unknown Title',
                artist: result.artists?.join(', ') || result.artist || 'Unknown Artist',
                duration: result.duration?.formatted || '',
                thumbnail: result.thumbnail || result.album?.cover,
                spotifyUrl: result.spotify_url,
                album: result.album?.name,
                popularity: result.popularity
            };
        }

        if (!audioUrl) {
            await sock.sendMessage(chatId, { 
                text: 'No downloadable audio found for this query.' 
            }, { quoted: message });
            return;
        }

        // Build caption
        let caption = `📔 Title: *${trackInfo.title}*\n👤 Artist: ${trackInfo.artist}`;
        if (trackInfo.album) caption += `\n💿 Album: ${trackInfo.album}`;
        if (trackInfo.duration) caption += `\n⏰ Duration: ${trackInfo.duration}`;
        if (trackInfo.popularity) caption += `\n📊 Popularity: ${trackInfo.popularity}%`;
        caption += `\n🖇️ ${trackInfo.spotifyUrl}`;

        // Send thumbnail with caption
        if (trackInfo.thumbnail) {
            await sock.sendMessage(chatId, { 
                image: { url: trackInfo.thumbnail }, 
                caption 
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { 
                text: caption 
            }, { quoted: message });
        }

        // Send audio file
        const filename = trackInfo.title.replace(/[\\/:*?"<>|]/g, '');
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${filename}.mp3`
        }, { quoted: message });

        //success reaction 
        await sock.sendMessage(chatId, {
            react: { text: '🪩', key: message.key }
        });
        

    } catch (error) {
        console.error('[SPOTIFY] error:', error?.message || error);
        const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';
        await sock.sendMessage(chatId, { 
            text: `❌ Failed to fetch Spotify audio.\nError: ${errorMsg}\n\nTry another query or check the URL.` 
        }, { quoted: message });
    }
}

module.exports = spotifyCommand;
