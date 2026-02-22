const axios = require('axios');
const { applyMediaWatermark } = require('./setwatermark');

// Create fake contact for enhanced replies
function createFakeContact(message) {
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "TRUTH-MD-MENU"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:TRUTH MD\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

async function searchImagesFromAPI(query, apiUrl) {
    try {
        const response = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = response.data;
        let images = [];

        // Handle MrFrank API structure
        if (apiUrl.includes('mrfrankofc')) {
            if (data.status === true && data.result && Array.isArray(data.result)) {
                images = data.result;
            } else if (data.data && Array.isArray(data.data)) {
                images = data.data;
            }
        }
        // Handle David Cyril API structure (fallback)
        else if (apiUrl.includes('davidcyriltech')) {
            if (data.success && data.results && Array.isArray(data.results)) {
                images = data.results;
            }
        }

        return images;
    } catch (error) {
        console.error(`API ${apiUrl} error:`, error.message);
        return [];
    }
}

async function imgCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        const args = userMessage.split(' ').slice(1);
        const query = args.join(' ');

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `🖼️ *Image Search Command*\n\nUsage:\n${getPrefix()}img <search_query>\n\nExample:\n${getPrefix()}img cute cats\n${getPrefix()}img nature landscape`
            }, { quoted: fake });
        }

        await sock.sendMessage(chatId, {
            text: `🔍 Searching images for "${query}"...`
        }, { quoted: fake });

        // Try multiple APIs with fallback
        const apis = [
            `https://api.mrfrankofc.gleeze.com/api/images?query=${encodeURIComponent(query)}`,
        ];

        let images = [];
        let usedAPI = '';

        for (const apiUrl of apis) {
            images = await searchImagesFromAPI(query, apiUrl);
            if (images.length > 0) {
                usedAPI = apiUrl.includes('mrfrankofc') ? 'MrFrank API' : 'David Cyril API';
                break;
            }
        }

        if (images.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No images found for your query. Try different keywords.'
            }, { quoted: fake });
        }

        const imagesToSend = images.slice(0, 5);
        let sentCount = 0;

        for (const image of imagesToSend) {
            try {
                let imageUrl = '';
                
                if (typeof image === 'string') {
                    imageUrl = image;
                } else if (image.url) {
                    imageUrl = image.url;
                } else if (image.link) {
                    imageUrl = image.link;
                }

                if (!imageUrl) continue;

                const caption = applyMediaWatermark(
                    `${query}\n`
                );

                await sock.sendMessage(chatId, {
                    image: { url: imageUrl },
                    caption: caption
                }, { quoted: fake });

                sentCount++;
                await new Promise(resolve => setTimeout(resolve, 1500));
                
            } catch (imageError) {
                console.error('Error sending image:', imageError);
            }
        }

        if (sentCount > 0) {
            await sock.sendMessage(chatId, {
                text: `✅ Successfully sent ${sentCount} images for "${query}"\n\n📸 *Total Found:* ${images.length} images`
            }, { quoted: fake });
        }

    } catch (error) {
        console.error('Image Search Error:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: '❌ Error searching for images. Please try again.'
        }, { quoted: fake });
    }
}

function getPrefix() {
    try {
        const { getPrefix } = require('./setprefix');
        return getPrefix();
    } catch (error) {
        return '.';
    }
}

module.exports = imgCommand;
