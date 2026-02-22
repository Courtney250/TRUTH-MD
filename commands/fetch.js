const axios = require('axios');

async function fetchCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const args = text.trim().split(/\s+/).slice(1).join(' ');

        const urlMatch = args.match(/(https?:\/\/[^\s]+)/);

        if (!urlMatch) {
            await sock.sendMessage(chatId, {
                text: '❌ Please provide a valid URL to fetch.\n\n*Usage:* .fetch https://example.com'
            }, { quoted: message });
            return;
        }

        const url = urlMatch[0];

        await sock.sendMessage(chatId, {
            text: `⏳ Fetching content from: ${url}`
        }, { quoted: message });

        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FetchBot/1.0)'
            },
            maxRedirects: 5
        });

        if (response.status >= 200 && response.status < 300) {
            const data = response.data;
            const contentType = response.headers['content-type'] || '';

            let resultText = '';

            if (contentType.includes('application/json')) {
                const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
                const formattedJson = JSON.stringify(jsonData, null, 2);
                if (formattedJson.length > 4000) {
                    resultText = `✅ *JSON Response (truncated):*\n\n${formattedJson.substring(0, 4000)}...\n\n⚠️ Response too long, showing first 4000 characters.`;
                } else {
                    resultText = `✅ *JSON Response:*\n\n${formattedJson}`;
                }
            } else if (contentType.includes('text/html')) {
                const textContent = data.toString()
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (textContent.length > 4000) {
                    resultText = `✅ *Website Content (truncated):*\n\n${textContent.substring(0, 4000)}...\n\n⚠️ Content too long, showing first 4000 characters.`;
                } else {
                    resultText = `✅ *Website Content:*\n\n${textContent}`;
                }
            } else if (contentType.includes('text/plain')) {
                const plainText = typeof data === 'string' ? data : data.toString();
                if (plainText.length > 4000) {
                    resultText = `✅ *Text Content (truncated):*\n\n${plainText.substring(0, 4000)}...\n\n⚠️ Content too long, showing first 4000 characters.`;
                } else {
                    resultText = `✅ *Text Content:*\n\n${plainText}`;
                }
            } else {
                const size = typeof data === 'string' ? data.length : JSON.stringify(data).length;
                resultText = `✅ *Successfully fetched URL*\n\n📊 Status: ${response.status}\n📁 Content-Type: ${contentType}\n📏 Size: ${size} bytes\n\n⚠️ Binary/unsupported content type. Use a browser for full content.`;
            }

            resultText += `\n\n📊 *Metadata:*\n• Status: ${response.status}\n• Content-Type: ${contentType}\n• URL: ${url}`;

            await sock.sendMessage(chatId, { text: resultText });
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ Error fetching URL\n\nStatus: ${response.status}\nURL: ${url}`
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Fetch error:', error.message);

        let errorMessage = '❌ *Failed to fetch URL*\n\n';

        if (error.code === 'ECONNREFUSED') {
            errorMessage += 'Connection refused. The server might be down or blocking requests.';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage += 'Domain not found. Please check the URL.';
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            errorMessage += 'Request timed out. The server took too long to respond.';
        } else if (error.response) {
            errorMessage += `Server responded with status: ${error.response.status}`;
        } else if (error.request) {
            errorMessage += 'No response received from server.';
        } else {
            errorMessage += `Error: ${error.message}`;
        }

        await sock.sendMessage(chatId, { text: errorMessage }, { quoted: message });
    }
}

module.exports = fetchCommand;
