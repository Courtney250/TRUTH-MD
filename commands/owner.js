const { getOwnerName } = require('./setowner');
const { getOwnerNumber } = require('./setownernumber');
const settings = require('../settings');

async function ownerCommand(sock, chatId, message) {
    try {
        // Get dynamic owner name and number
        const ownerName = getOwnerName();
        const ownerNumber = getOwnerNumber();
        
        // Create fake contact for enhanced replies (similar to your other commands)
        function createFakeContact(message) {
            return {
                key: {
                    participants: "0@s.whatsapp.net",
                    remoteJid: "status@broadcast",
                    fromMe: false,
                    id: "TRUTH-MD"
                },
                message: {
                    contactMessage: {
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:TRUTH MD\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                    }
                },
                participant: "0@s.whatsapp.net"
            };
        }

        const fake = message ? createFakeContact(message) : null;

        // Create contact card
        const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
ORG:The Bot Owner;
TEL;type=CELL;type=VOICE;waid=${ownerNumber.split('@')[0]}:${ownerNumber.split('@')[0]}
X-ABLabel:Owner of the bot
END:VCARD
`.trim();

        // Send contact card
        await sock.sendMessage(chatId, {
            contacts: { 
                displayName: ownerName, 
                contacts: [{ vcard }] 
            },
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, fake ? { quoted: fake } : {});

        // Additional info message
        const ownerInfo = ``.trim();

        // Send info message after a short delay
        setTimeout(async () => {
            await sock.sendMessage(chatId, { 
                text: ownerInfo,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: '',
                        serverMessageId: -1
                    }
                }
            });
        }, 1000);

    } catch (error) {
        console.error('Error in owner command:', error);
        
        // Fallback to simple text if contact card fails
        const ownerName = getOwnerName();
        const ownerNumber = getOwnerNumber();
        const maskedNumber = ownerNumber.split('@')[0].replace(/(\d{3})\d+(\d{3})/, '$1****$2');
        
        await sock.sendMessage(chatId, { 
            text: `👑 *BOT OWNER*\n\n🤵 Name: ${ownerName}\n📱 Number: ${maskedNumber}\n\n💬 Channel: ${global.channelLink || "Not set"}\n📺 YouTube: ${global.ytch || "Not set"}`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        });
    }
}

module.exports = ownerCommand;
