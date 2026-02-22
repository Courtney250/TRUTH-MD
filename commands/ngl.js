const axios = require("axios");

// Set your NGL username here:
const NGL_USERNAME = "zimtk488485";

async function nglCommand(sock, chatId, message, userMessage, settings) {
    const text = userMessage.split(" ").slice(1).join(" "); // message after `.ngl`

    if (!text) {
        await sock.sendMessage(chatId, {
            text: `❌ Please type a message.\n\nUsage: ${settings.prefix}ngl I think the bot needs more memes.`
        }, { quoted: message });
        return;
    }

    try {
        // Send anonymous message to your NGL inbox
        const res = await axios.post("https://ngl.link/api/submit", {
            username: NGL_USERNAME,
            question: text,
            deviceId: (Math.random() + 1).toString(36).substring(7)
        });

        if (res.status === 200) {
            await sock.sendMessage(chatId, {
                text: `✅ Your anonymous message has been sent!\n\n📝 Message: "${text}"`
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                text: "❌ Couldn't send your message to NGL. Please try again later."
            }, { quoted: message });
        }

    } catch (err) {
        console.error("nglCommand error:", err);
        await sock.sendMessage(chatId, {
            text: "❌ Error sending your message to NGL."
        }, { quoted: message });
    }
}

module.exports = nglCommand;
