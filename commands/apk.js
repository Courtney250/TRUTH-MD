const axios = require('axios');
const { applyMediaWatermark } = require('./setwatermark');

async function apkCommand(sock, chatId, message) {
    const q = message.message?.conversation || 
              message.message?.extendedTextMessage?.text || 
              message.message?.imageMessage?.caption || 
              message.message?.videoMessage?.caption || '';

    const query = q.trim();

    // Check if user provided an app name
    if (!query) {
        await sock.sendMessage(chatId, {
            text: "*🔍 Please provide an app name to search.*\n\n_Usage:_\n.apk Instagram"
        },{ quoted: message });
        return;
    }

    try {
        // React loading
        await sock.sendMessage(chatId, { react: { text: "⬇️", key: message.key } });

        const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(query)}/limit=1`;
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (!data.datalist || !data.datalist.list || !data.datalist.list.length) {
            await sock.sendMessage(chatId, {
                text: "❌ *No APK found for your query.*"
            },{ quoted: message });
            return;
        }

        const app = data.datalist.list[0];
        const sizeMB = (app.size / (1024 * 1024)).toFixed(2);

        // Original caption
        const originalCaption = `
🔹️ *App Name:* ${app.name}
🔹️ *Last Updated:* ${app.updated}
🔹️ *Size:* ${sizeMB} MB
`.trim();

        // Apply watermark with > format
        const caption = applyMediaWatermark(originalCaption);

        // React upload
        await sock.sendMessage(chatId, { react: { text: "⬆️", key: message.key } });

        await sock.sendMessage(chatId, {
            document: { url: app.file.path_alt },
            fileName: `${app.name}.apk`,
            mimetype: 'application/vnd.android.package-archive',
            caption,
            contextInfo: {
                externalAdReply: {
                    title: app.name,
                    body: "🎊 downloded successfully✔️",
                    mediaType: 1,
                    sourceUrl: app.file.path_alt,
                    thumbnailUrl: app.icon,
                    renderLargerThumbnail: true,
                    showAdAttribution: false
                }
            }, quoted: message 
        });

        // Final reaction
        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

    } catch (e) {
        console.error(e);
        await sock.sendMessage(chatId, {
            text: "❌ *Error occurred while downloading the APK.*\n\n_" + e.message + "_"
        },{ quoted: message });
    }
}

module.exports = apkCommand;
