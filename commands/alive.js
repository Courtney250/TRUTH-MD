const path = require('path');
const fs = require('fs');
const settings = require("../settings");

// Import functions from other modules
const { getBotName } = require('./setbot');
const { applyWatermark } = require('./setwatermark');

// Default menu image URL (same as in setmenuimage.js)
const DEFAULT_MENU_IMAGE = 'https://res.cloudinary.com/dptzpfgtm/image/upload/v1763085792/whatsapp_uploads/qiy0ytyqcbebyacrgbju.jpg';

// Function to get current menu image (either custom or default)
function getMenuImage() {
    try {
        const assetsDir = path.join(__dirname, '../assets');
        const menuImagePath = path.join(assetsDir, 'menu.jpg');
        
        if (fs.existsSync(menuImagePath)) {
            // Return the local file as buffer for better compatibility
            return {
                buffer: fs.readFileSync(menuImagePath),
                isLocal: true
            };
        } else {
            return {
                url: DEFAULT_MENU_IMAGE,
                isLocal: false
            };
        }
    } catch (error) {
        console.error('Error getting menu image:', error);
        return {
            url: DEFAULT_MENU_IMAGE,
            isLocal: false
        };
    }
}

// Create fake contact for enhanced replies (similar to setmenuimage.js)
function createFakeContact(message) {
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "whatsapp bot"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:TRUTH MD\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

async function aliveCommand(sock, chatId, message) {
    const start = Date.now();
    try {
        const fake = createFakeContact(message);
        
        // Get dynamic content
        const botName = getBotName();
        const menuImage = getMenuImage();
        
        const { getConfig } = require('../lib/configdb');
        const settings_file = require('../settings');
        const currentMode = getConfig('MODE') || settings_file.commandMode || 'public';

        // Create base message with watermark applied
        const baseMessage = 
            `*${botName}*\n\n` +
            `*VERSION:* ${settings.version}\n` +
            `*STATUS:* Online\n` +
            `*SPEED:* ${Date.now() - start}ms\n` +
            `*MODE:* ${currentMode}\n\n` +
            `TYPE *.menu* for full commands\n\n` +
            `🌙 ${botName} is alive 🏂`;
        
        // Apply watermark to the message
        const watermarkedMessage = applyWatermark(baseMessage);

        // Send message with image
        if (menuImage.isLocal) {
            // Send with local image buffer
            await sock.sendMessage(chatId, {
                image: menuImage.buffer,
                caption: watermarkedMessage,
                contextInfo: {
                    forwardingScore: 99,
                    remoteJid: "status@broadcast",
                    isForwarded: false, 
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: ' MD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });
        } else {
            // Send with image URL
            await sock.sendMessage(chatId, {
                image: { url: menuImage.url },
                caption: watermarkedMessage,
                contextInfo: {
                    forwardingScore: 99,
                    remoteJid: "status@broadcast",
                    isForwarded: false, 
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '',
                        newsletterName: ' MD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: fake });
        }
        
        // Send audio
        await sock.sendMessage(chatId, {
            audio: { url: "https://files.catbox.moe/qpnk2b.mp3" },
            mimetype: 'audio/mp4',
            ptt: false,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });
        
    } catch (error) {
        console.error('Error in alive command:', error);
        
        // Fallback to simple message if there's an error
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, { 
            text: 'Bot is alive and running!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '',
                    newsletterName: '',
                    serverMessageId: -1
                }
            }
        }, { quoted: fake });
    }
}

module.exports = aliveCommand;
