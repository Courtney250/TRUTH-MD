const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { applyMediaWatermark } = require('./setwatermark');

async function facebookCommand(sock, chatId, message) {
    let tempFile = null;
    
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const url = text.split(' ').slice(1).join(' ').trim();
        
        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: "Please provide a Facebook video URL.\nExample: .fb https://www.facebook.com/..."
            }, { quoted: message });
        }

        const facebookPatterns = [
            'facebook.com',
            'fb.watch',
            'fb.com',
            'facebook.com/watch/',
            'facebook.com/reel/',
            'facebook.com/story.php'
        ];
        
        const isFacebookUrl = facebookPatterns.some(pattern => url.includes(pattern));
        if (!isFacebookUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ That is not a valid Facebook video URL.\n\nSupported formats:\n• facebook.com/.../videos/...\n• fb.watch/...\n• facebook.com/reel/...\n• facebook.com/watch/..."
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            react: { text: '⬇️', key: message.key }
        });

        let resolvedUrl = url;
        try {
            const res = await axios.get(url, { 
                timeout: 15000, 
                maxRedirects: 10, 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                },
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            });
            
            resolvedUrl = res.request.res.responseUrl || url;
        } catch (error) {
            resolvedUrl = url;
        }

        async function fetchFromApi(apiUrl) {
            try {
                const response = await axios.get(apiUrl, {
                    timeout: 25000,
                    headers: {
                        'accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://www.facebook.com/'
                    },
                    maxRedirects: 5,
                    validateStatus: (status) => status < 500
                });

                if (response.data) {
                    const hasVideoData = checkForVideoData(response.data);
                    if (hasVideoData) {
                        return { 
                            response, 
                            success: true
                        };
                    } else {
                        throw new Error('No video data in API response');
                    }
                }
                throw new Error('Empty API response');
            } catch (error) {
                throw error;
            }
        }

        function checkForVideoData(data) {
            if (!data) return false;
            
            const checks = [
                data.status === true,
                data.result?.media?.video_hd,
                data.result?.media?.video_sd,
                data.result?.url,
                data.data?.url,
                data.url,
                data.download,
                data.video,
                Array.isArray(data.data) && data.data.length > 0,
                typeof data.result === 'string' && data.result.startsWith('http')
            ];
            
            return checks.some(check => check === true);
        }

        function extractVideoUrl(data) {
            if (!data) return null;

            const extractionAttempts = [
                () => data.result?.media?.video_hd || data.result?.media?.video_sd || data.result?.media?.video,
                () => data.result?.url,
                () => data.data?.url,
                () => data.url || data.download,
                () => (typeof data.video === 'string' ? data.video : data.video?.url),
                () => {
                    if (Array.isArray(data.data)) {
                        const hd = data.data.find(item => item.quality === 'HD' || item.quality === 'high');
                        const sd = data.data.find(item => item.quality === 'SD' || item.quality === 'low');
                        return (hd || sd || data.data[0])?.url;
                    }
                    return null;
                },
                () => (typeof data.result === 'string' && data.result.startsWith('http') ? data.result : null),
                () => data.result?.download || data.data?.download
            ];

            for (const attempt of extractionAttempts) {
                try {
                    const videoUrl = attempt();
                    if (videoUrl && typeof videoUrl === 'string' && videoUrl.startsWith('http')) {
                        return videoUrl;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            return null;
        }

        let apiResult;
        const apiUrl = `https://apiskeith.top/download/fbdown?url=${encodeURIComponent(resolvedUrl)}`;
        
        try {
            apiResult = await fetchFromApi(apiUrl);
        } catch (error) {
            const fallbackApiUrl = `https://apiskeith.top/download/fbdown?url=${encodeURIComponent(url)}`;
            apiResult = await fetchFromApi(fallbackApiUrl);
        }

        const { response } = apiResult;
        const data = response.data;

        const fbvid = extractVideoUrl(data);

        if (!fbvid) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Failed to download Facebook video.\n\nPossible reasons:\n• Video is private or deleted\n• Link is invalid or not a video\n• Video is age-restricted\n• API is temporarily unavailable\n\nPlease try a different Facebook video link.'
            }, { quoted: message });
        }

        // Get watermark as caption
        const caption = applyMediaWatermark('');

        try {
            await sock.sendMessage(chatId, {
                video: { url: fbvid },
                mimetype: "video/mp4",
                caption: caption
            }, { quoted: message });
            
            return;
            
        } catch (urlError) {
            try {
                const tmpDir = path.join(process.cwd(), 'tmp');
                if (!fs.existsSync(tmpDir)) {
                    fs.mkdirSync(tmpDir, { recursive: true });
                }

                tempFile = path.join(tmpDir, `fb_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);

                const videoResponse = await axios({
                    method: 'GET',
                    url: fbvid,
                    responseType: 'stream',
                    timeout: 120000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://www.facebook.com/',
                        'Range': 'bytes=0-'
                    },
                    maxRedirects: 5
                });

                const writer = fs.createWriteStream(tempFile);
                videoResponse.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                    setTimeout(() => reject(new Error('Download timeout')), 120000);
                });

                if (!fs.existsSync(tempFile)) {
                    throw new Error('Downloaded file not found');
                }

                const stats = fs.statSync(tempFile);
                if (stats.size === 0) {
                    throw new Error('Downloaded file is empty');
                }

                await sock.sendMessage(chatId, {
                    video: fs.readFileSync(tempFile),
                    mimetype: "video/mp4",
                    caption: caption
                }, { quoted: message });

                return;

            } catch (bufferError) {
                throw new Error(`Both methods failed: ${bufferError.message}`);
            }
        }

    } catch (error) {
        let errorMessage = "❌ Failed to download Facebook video. ";
        
        if (error.message.includes('timeout')) {
            errorMessage += "The request timed out. Please try again.";
        } else if (error.message.includes('Network Error')) {
            errorMessage += "Network error. Please check your connection.";
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage += "Video not found. The link may be invalid or the video was removed.";
        } else if (error.message.includes('API')) {
            errorMessage += "Download service is temporarily unavailable.";
        } else {
            errorMessage += `Error: ${error.message}`;
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
        
    } finally {
        if (tempFile && fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile);
            } catch (cleanupError) {}
        }
    }
}

module.exports = facebookCommand;
