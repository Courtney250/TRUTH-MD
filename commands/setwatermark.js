const fs = require('fs');
const path = require('path');

// Watermark file path
const WATERMARK_FILE = './data/water.json';

// Create data directory if it doesn't exist
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
}

// Set watermark command
async function setWatermarkCommand(sock, chatId, senderId, message, userMessage) {
    try {
        // Check if user is owner
        const { isSudo } = require('../lib/index');
        const isOwnerOrSudo = message.key.fromMe || await isSudo(senderId);
        
        if (!isOwnerOrSudo) {
            return await sock.sendMessage(chatId, { 
                text: '❌ Only owner can set watermark!' 
            }, { quoted: message });
        }

        const args = userMessage.split(' ').slice(1);
        const watermarkText = args.join(' ');

        if (!watermarkText) {
            // Show current watermark
            if (fs.existsSync(WATERMARK_FILE)) {
                const current = fs.readFileSync(WATERMARK_FILE, 'utf8');
                return await sock.sendMessage(chatId, { 
                    text: `📝 Current watermark:\n${current}\n\nUsage: .setwatermark <text>` 
                }, { quoted: message });
            } else {
                return await sock.sendMessage(chatId, { 
                    text: '📝 No watermark set!\n\nUsage: .setwatermark <text>\nExample: .setwatermark Downloaded by MyBot' 
                }, { quoted: message });
            }
        }

        // Save watermark text
        fs.writeFileSync(WATERMARK_FILE, watermarkText);
        
        await sock.sendMessage(chatId, { 
            text: `✅ Watermark set!\n\n"${watermarkText}"\n\nThis will appear on all downloads and menus.` 
        }, { quoted: message });

    } catch (error) {
        console.error('Watermark error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to set watermark' 
        }, { quoted: message });
    }
}

// Function to apply watermark to any text
function applyWatermark(originalText) {
    try {
        if (!fs.existsSync(WATERMARK_FILE)) {
            return originalText;
        }
        
        const watermark = fs.readFileSync(WATERMARK_FILE, 'utf8');
        return `${originalText}\n\n${watermark}`;
    } catch (error) {
        return originalText;
    }
}

// Function to apply watermark to media captions
function applyMediaWatermark(originalCaption) {
    try {
        if (!fs.existsSync(WATERMARK_FILE)) {
            return originalCaption || '';
        }
        
        const watermark = fs.readFileSync(WATERMARK_FILE, 'utf8');
        
        if (!originalCaption) {
            return watermark;
        }
        
        return `${originalCaption}\n\n${watermark}`;
    } catch (error) {
        return originalCaption || '';
    }
}

module.exports = {
    setWatermarkCommand,
    applyWatermark,
    applyMediaWatermark
};
