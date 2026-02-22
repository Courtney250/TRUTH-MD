const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { isSudo } = require('../lib/index');

// Default menu image URL
const DEFAULT_MENU_IMAGE = 'https://i.ibb.co/w50y8YJ/IMG-20251229-WA0003.jpg';

// Create fake contact for enhanced replies
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

async function setMenuImageCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        
        // Only bot owner can change menu image
        if (!message.key.fromMe && !await isSudo(senderId)) {
            await sock.sendMessage(chatId, { 
                text: '❌ Only bot owner can change the menu image!',
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
            return;
        }

        const args = userMessage.split(' ').slice(1);
        
        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: `📝 *Set Menu Image Command*\n\nUsage:\n• ${getPrefix()}setmenuimage <image_url> - Set custom menu image\n• ${getPrefix()}setmenuimage default - Reset to default image\n• ${getPrefix()}setmenuimage view - View current menu image\n\nCurrent default: ${DEFAULT_MENU_IMAGE}`,
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

        const action = args[0].toLowerCase();
        const assetsDir = path.join(__dirname, '../assets');

        // Ensure assets directory exists
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        const menuImagePath = path.join(assetsDir, 'menu.jpg');

        if (action === 'view') {
            // Send current menu image
            if (fs.existsSync(menuImagePath)) {
                await sock.sendMessage(chatId, {
                    image: fs.readFileSync(menuImagePath),
                    caption: '📷 Current Menu Image',
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
            } else {
                await sock.sendMessage(chatId, {
                    text: 'ℹ️ Using default menu image. No custom image set.',
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
            return;
        }

        if (action === 'default') {
            // Reset to default image
            try {
                await downloadImage(DEFAULT_MENU_IMAGE, menuImagePath);
                await sock.sendMessage(chatId, {
                    text: '✅ Menu image reset to default successfully!',
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
                await sock.sendMessage(chatId, {
                    text: '❌ Failed to reset menu image to default. Please try again later.',
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
            return;
        }

        // Set custom image from URL
        const imageUrl = args[0];
        
        // Validate URL
        if (!isValidUrl(imageUrl)) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide a valid image URL!',
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

        // Check if URL points to an image
        if (!isImageUrl(imageUrl)) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide a valid image URL (jpg, png, jpeg, webp)!',
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

        await sock.sendMessage(chatId, {
            text: '⏳ Downloading and setting menu image...',
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

        try {
            await downloadImage(imageUrl, menuImagePath);
            
            await sock.sendMessage(chatId, {
                text: '✅ Menu image updated successfully!\n\nThe new image will be used in the menu from now on.',
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

            // Send preview
            await sock.sendMessage(chatId, {
                image: fs.readFileSync(menuImagePath),
                caption: '🔄 New Menu Image Preview',
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
            console.error('Error setting menu image:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to download or set the menu image. Please check the URL and try again.',
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

    } catch (error) {
        console.error('Error in setMenuImageCommand:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while processing the command.',
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

// Helper function to download image
async function downloadImage(url, outputPath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const writer = fs.createWriteStream(outputPath);
        
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

// Helper function to validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Helper function to check if URL points to an image
function isImageUrl(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext)) || 
           urlLower.includes('https:/') ||
           urlLower.includes('cloudinary') || // For your Cloudinary URL
           urlLower.includes('res.cloudinary.com'); // Specific to your URL
}

// Helper function to get prefix
function getPrefix() {
    try {
        const { getPrefix } = require('./setprefix');
        return getPrefix();
    } catch (error) {
        return '.'; // fallback prefix
    }
}

module.exports = setMenuImageCommand;
