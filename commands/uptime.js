const settings = require("../settings");

function runtime(seconds) {

    seconds = Number(seconds);

    const d = Math.floor(seconds / (3600 * 24));

    const h = Math.floor((seconds % (3600 * 24)) / 3600);

    const m = Math.floor((seconds % 3600) / 60);

    const s = Math.floor(seconds % 60);

    return `${d} days ${h} hrs ${m} mins ${s} secs`;

}

async function uptimeCommand(sock, chatId, message) {

    try {

        const message1 = `🔹️ *${runtime(process.uptime())}*`;

        await sock.sendMessage(chatId, {
          //  image:{ url: "https://d.uguu.se/bulQZsde.jpg" },
            text: message1,
            
            

            contextInfo: {

                forwardingScore: 999,

                isForwarded: false,

                forwardedNewsletterMessageInfo: {

                    newsletterJid: '@',

                    newsletterName: '',

                    serverMessageId: -1

                }

            }

        }, { quoted: message });

    } catch (error) {

        console.error('Error in uptime command:', error);

        await sock.sendMessage(chatId, { text: '❌ An error occurred: ' + error.message }, { quoted: message });

    }

}

module.exports = uptimeCommand;
