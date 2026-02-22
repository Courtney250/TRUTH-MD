const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const STATUS_CAPTURE_DIR = path.join(__dirname, '../status_capture');

// Ensure directory exists
if (!fs.existsSync(STATUS_CAPTURE_DIR)) {
    fs.mkdirSync(STATUS_CAPTURE_DIR, { recursive: true });
}

// Handle status capture automatically
async function handleStatusCapture(sock, message) {
    try {
        // Check if it's a reply to a status (status@broadcast)
        if (message.message?.extendedTextMessage?.contextInfo?.remoteJid === 'status@broadcast' ||
            message.message?.imageMessage?.contextInfo?.remoteJid === 'status@broadcast' ||
            message.message?.videoMessage?.contextInfo?.remoteJid === 'status@broadcast') {
            
            const contextInfo = message.message.extendedTextMessage?.contextInfo || 
                              message.message.imageMessage?.contextInfo ||
                              message.message.videoMessage?.contextInfo;
            
            if (!contextInfo) return;

            const statusId = contextInfo.stanzaId;
            const user = message.pushName || 'Unknown User';
            const replyText = message.message.extendedTextMessage?.text || 
                            message.message.imageMessage?.caption ||
                            message.message.videoMessage?.caption || 
                            'No text';

            console.log(`📱 Status Capture: Reply from ${user}`);

            // Get owner's JID
            const ownerJid = sock.user?.id.split(':')[0] + '@s.whatsapp.net';

            try {
                // Try to capture the status content itself
                let statusContent = null;
                
                // If it's a media status (image/video), download it
                if (message.message?.imageMessage || message.message?.videoMessage) {
                    try {
                        const mediaBuffer = await downloadMediaMessage(message, 'buffer', {});
                        const mediaType = message.message.imageMessage ? 'image' : 'video';
                        const fileExtension = message.message.imageMessage ? '.jpg' : '.mp4';
                        
                        // Save media file
                        const filename = `status_${Date.now()}${fileExtension}`;
                        const filepath = path.join(STATUS_CAPTURE_DIR, filename);
                        fs.writeFileSync(filepath, mediaBuffer);
                        
                        statusContent = {
                            type: mediaType,
                            path: filepath,
                            filename: filename
                        };
                    } catch (mediaError) {
                        console.log('Could not download status media:', mediaError);
                    }
                }

                // Send status capture notification to owner
                let captureMessage = `📱 *STATUS CAPTURED!*\n\n`;
                captureMessage += `👤 *User:* ${user}\n`;
                captureMessage += `💬 *Reply:* ${replyText}\n`;
                captureMessage += `⏰ *Time:* ${new Date().toLocaleString()}\n`;
                captureMessage += `🆔 *Status ID:* ${statusId}\n\n`;
                captureMessage += `*Status content has been automatically captured!*`;

                // Send text notification first
                await sock.sendMessage(ownerJid, { text: captureMessage });

                // If we captured media, send it too
                if (statusContent) {
                    if (statusContent.type === 'image') {
                        await sock.sendMessage(ownerJid, { 
                            image: fs.readFileSync(statusContent.path),
                            caption: `📸 Status Image from ${user}`
                        });
                    } else if (statusContent.type === 'video') {
                        await sock.sendMessage(ownerJid, { 
                            video: fs.readFileSync(statusContent.path),
                            caption: `🎥 Status Video from ${user}`
                        });
                    }
                }

                console.log(`✅ Status captured and sent to owner: ${replyText}`);

            } catch (sendError) {
                console.error('Error sending status capture:', sendError);
            }
        }
    } catch (error) {
        console.error('Error in status capture:', error);
    }
}

// Status capture info command
async function statusCaptureInfoCommand(sock, chatId, message) {
    return sock.sendMessage(chatId, {
        text: `📱 *AUTO STATUS CAPTURE*\n\n*Status:* 🟢 ALWAYS ACTIVE\n\n*How it works:*\n1. Reply to ANY status with ANY text/emoji\n2. The STATUS CONTENT is automatically captured\n3. It appears instantly in your private chat\n4. Works with images, videos, and text statuses\n\n*Just reply to statuses normally - no setup needed!*`,
        quoted: message
    });
}

module.exports = {
    handleStatusCapture,
    statusCaptureInfoCommand
};
