const fetch = require('node-fetch');

async function inspectCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const args = userMessage.split(' ').slice(1);
        const query = args.join(' ');

        if (!query) {
            return await sock.sendMessage(chatId, {
                text: `*INSPECT COMMAND*\n\n*Usage:*\n.inspect <url> - Fetch and inspect data from URL\n.inspect <url> -j - Pretty JSON format\n.inspect <url> -d - Download media\n.inspect <url> -h - Show response headers only\n\n*Examples:*\n.inspect https://api.github.com/users/octocat\n.inspect https://api.github.com/users/octocat -j\n.inspect https://example.com/image.jpg -d\n.inspect https://example.com -h`
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: `🔍 Inspecting...`
        }, { quoted: message });

        // Parse arguments
        const parts = query.split(' ');
        const url = parts[0];
        const flags = parts.slice(1);
        const download = flags.includes('-d');
        const json = flags.includes('-j');
        const headersOnly = flags.includes('-h');
        const followRedirects = !flags.includes('-n');

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; WhatsAppBot/1.0)'
            },
            redirect: followRedirects ? 'follow' : 'manual'
        });

        const responseInfo = {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            redirected: response.redirected,
            headers: {}
        };

        response.headers.forEach((value, key) => {
            responseInfo.headers[key] = value;
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';

        if (headersOnly) {
            let headersText = `📋 *RESPONSE HEADERS:*\n\n`;
            headersText += `*Status:* ${responseInfo.status} ${responseInfo.statusText}\n`;
            headersText += `*URL:* ${responseInfo.url}\n`;
            headersText += `*Redirected:* ${responseInfo.redirected}\n\n`;

            for (const [key, value] of Object.entries(responseInfo.headers)) {
                headersText += `${key}: ${value}\n`;
            }

            return await sock.sendMessage(chatId, { text: headersText }, { quoted: message });
        }

        // Handle media download
        if (download && (contentType.includes('audio/') ||
                         contentType.includes('video/') ||
                         contentType.includes('image/'))) {

            const contentLength = response.headers.get('content-length');
            const maxSize = 50 * 1024 * 1024;

            if (contentLength && parseInt(contentLength) > maxSize) {
                return await sock.sendMessage(chatId, {
                    text: `❌ File too large (${(parseInt(contentLength)/1024/1024).toFixed(2)}MB)\nMaximum size: 50MB`
                }, { quoted: message });
            }

            const buffer = await response.arrayBuffer();
            const fileBuffer = Buffer.from(buffer);

            let mediaType;
            let mediaMsg;

            if (contentType.includes('audio/')) {
                mediaType = 'Audio';
                mediaMsg = { audio: fileBuffer, mimetype: contentType };
            } else if (contentType.includes('video/')) {
                mediaType = 'Video';
                mediaMsg = { video: fileBuffer, mimetype: contentType };
            } else if (contentType.includes('image/')) {
                mediaType = 'Image';
                mediaMsg = { image: fileBuffer, mimetype: contentType };
            }

            // Send the media itself
            await sock.sendMessage(chatId, mediaMsg, { quoted: message });

            // Send structured summary
            const details = {
                status: "✅ Downloaded",
                type: mediaType,
                mime: contentType,
                sizeKB: (fileBuffer.length / 1024).toFixed(2) + " KB",
                url: responseInfo.url
            };

            await sock.sendMessage(chatId, {
                text: `📥 *Download Details:*\n\n` +
                      `• Status: ${details.status}\n` +
                      `• Type: ${details.type}\n` +
                      `• MIME: ${details.mime}\n` +
                      `• Size: ${details.sizeKB}\n` +
                      `• URL: ${details.url}`
            }, { quoted: message });

            return;
        }

        // Handle JSON
        if (json || contentType.includes('application/json')) {
            let jsonData;
            try {
                jsonData = await response.json();
            } catch (err) {
                jsonData = null;
            }

            const formattedJson = jsonData ? JSON.stringify(jsonData, null, 2) : '{}';

            let responseText = `JSON RESPONSE:\n\n`;
            responseText += `\`\`\`json\n${formattedJson}\`\`\``;

            return await sock.sendMessage(chatId, { text: responseText }, { quoted: message });
        }

        // Handle text
        if (contentType.includes('text/')) {
            const text = await response.text();

            let responseText = `*TEXT RESPONSE:*\n\n`;
            responseText += `\`\`\`\n${text}\`\`\``;

            return await sock.sendMessage(chatId, { text: responseText }, { quoted: message });
        }

        // Fallback
        await sock.sendMessage(chatId, {
            text: `ℹ️ Response received.\n*Status:* ${responseInfo.status} ${responseInfo.statusText}\n*Content-Type:* ${contentType}`
        }, { quoted: message });

    } catch (error) {
        console.error('Inspect command error:', error);

        let errorMessage;
        if (error.name === 'AbortError') {
            errorMessage = '⏱️ Request timeout (30 seconds)';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = '🔍 Could not resolve domain';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = '🚫 Connection refused';
        } else if (error.type === 'invalid-json') {
            errorMessage = '📄 Response is not valid JSON';
        } else if (error.message.includes('HTTP')) {
            errorMessage = `❌ HTTP Error: ${error.message}`;
        } else {
            errorMessage = '❌ An error occurred while inspecting the URL. Please check the URL and try again.';
        }

        await sock.sendMessage(chatId, { text: errorMessage }, { quoted: message });
    }
}

module.exports = inspectCommand;
