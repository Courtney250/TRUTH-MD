const axios = require('axios');

async function pairCommand(sock, chatId, message) {
    try {
        // Send initial processing message
        await sock.sendMessage(chatId, { 
            text: "🔄 Generating pairing code, please wait..." 
        });

        // Extract phone number from message body
        const messageText = message?.message?.conversation || message?.message?.extendedTextMessage?.text || '';
        const phoneNumber = messageText.split(' ')[1]?.replace(/[^0-9]/g, '');
        
        if (!phoneNumber) {
            await sock.sendMessage(chatId, { 
                text: "❌ Please provide a phone number!\nExample: !pair 254743XXXXXX" 
            });
            return;
        }

        const whatsappID = phoneNumber + '@s.whatsapp.net';
        const result = await sock.onWhatsApp(whatsappID);

        if (!result[0]?.exists) {
            await sock.sendMessage(chatId, { 
                text: "❌ Number not on WhatsApp!" 
            });
            return;
        }

        const response = await axios.get(`https://techword-bot-pair-ey42.onrender.com/code?number=${phoneNumber}`);
        const pairingCode = response.data?.code;

        if (!pairingCode) {
            await sock.sendMessage(chatId, { 
                text: "❌ Failed to get pairing code." 
            });
            return;
        }

        // Send pairing code
        await sock.sendMessage(chatId, { 
            text: `📱 *PAIRING CODE*\n\nPhone: ${phoneNumber}\nCode: \`${pairingCode}\`` 
        });

        // Send code separately for easy copy
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sock.sendMessage(chatId, { text: `\`${pairingCode}\`` });

        // Send simple guide
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const guideMessage = `📚 *HOW TO USE*\n\n` +
                            `1. Open WhatsApp → Menu → Linked Devices\n` +
                            `2. Tap "Link a Device"\n` +
                            `3. Select "Link with phone number"\n` +
                            `4. Enter: Your password\n` +
                            `5. Enter code: ${pairingCode}\n\n` +
                            `Code valid for 2 minutes.`;
        
        await sock.sendMessage(chatId, { text: guideMessage });

    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, { 
            text: "❌ Error. Try again later." 
        });
    }
}

module.exports = pairCommand;
