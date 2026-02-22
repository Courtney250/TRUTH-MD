const fs = require('fs');
const path = require('path');

// Path to store owner settings
const OWNER_FILE = path.join(__dirname, '..', 'data', 'owner.json');

// Default owner number (you can set your default number here)
const DEFAULT_OWNER_NUMBER = '254101150748@s.whatsapp.net'; // Replace with your actual number

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize owner file if it doesn't exist
if (!fs.existsSync(OWNER_FILE)) {
    fs.writeFileSync(OWNER_FILE, JSON.stringify({ 
        ownerName: 'courtney', 
        ownerNumber: DEFAULT_OWNER_NUMBER 
    }, null, 2));
}

/**
 * Get the current owner number
 * @returns {string} The current owner number
 */
function getOwnerNumber() {
    try {
        const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
        return data.ownerNumber || DEFAULT_OWNER_NUMBER;
    } catch (error) {
        console.error('Error reading owner file:', error);
        return DEFAULT_OWNER_NUMBER;
    }
}

/**
 * Set new owner number
 * @param {string} newOwnerNumber - The new owner number to set
 * @returns {boolean} Success status
 */
function setOwnerNumber(newOwnerNumber) {
    try {
        // Validate owner number format
        if (!newOwnerNumber || !isValidWhatsAppNumber(newOwnerNumber)) {
            return false;
        }
        
        const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
        data.ownerNumber = newOwnerNumber;
        fs.writeFileSync(OWNER_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error setting owner number:', error);
        return false;
    }
}

/**
 * Reset owner number to default
 * @returns {boolean} Success status
 */
function resetOwnerNumber() {
    try {
        const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
        data.ownerNumber = DEFAULT_OWNER_NUMBER;
        fs.writeFileSync(OWNER_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error resetting owner number:', error);
        return false;
    }
}

/**
 * Validate WhatsApp number format
 * @param {string} number - The number to validate
 * @returns {boolean} Validation result
 */
function isValidWhatsAppNumber(number) {
    // Basic validation for WhatsApp number format
    return typeof number === 'string' && 
           (number.endsWith('@s.whatsapp.net') || /^\d+$/.test(number));
}

/**
 * Format number to WhatsApp JID format
 * @param {string} number - The number to format
 * @returns {string} Formatted JID
 */
function formatToJID(number) {
    if (number.endsWith('@s.whatsapp.net')) {
        return number;
    }
    // Remove any non-digit characters and add @s.whatsapp.net
    const cleanNumber = number.replace(/\D/g, '');
    return `${cleanNumber}@s.whatsapp.net`;
}

/**
 * Check if a user is the owner
 * @param {string} userId - The user ID to check
 * @returns {boolean} Whether the user is owner
 */
function isOwner(userId) {
    const ownerNumber = getOwnerNumber();
    return userId === ownerNumber;
}

// Create fake contact for enhanced replies
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

async function handleSetOwnerNumberCommand(sock, chatId, senderId, message, userMessage, currentPrefix) {
    const args = userMessage.split(' ').slice(1);
    const inputNumber = args.join(' ').trim();
    
    const fake = createFakeContact(message);
    
    // Only current owner can change owner number
    const currentOwnerNumber = getOwnerNumber();
    if (senderId !== currentOwnerNumber && !message.key.fromMe) {
        await sock.sendMessage(chatId, { 
            text: '❌ Only the current owner can change the owner number!',
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

    if (!inputNumber) {
        // Show current owner number (masked for privacy)
        const current = getOwnerNumber();
        const maskedNumber = current.split('@')[0].replace(/(\d{3})\d+(\d{3})/, '$1****$2');
        
        await sock.sendMessage(chatId, { 
            text: `👑 Current Owner Number: *${maskedNumber}*\n\nUsage: ${currentPrefix}setownernumber <new_number>\nExamples:\n${currentPrefix}setownernumber 1234567890\n${currentPrefix}setownernumber 1234567890@s.whatsapp.net\n\nTo reset: ${currentPrefix}setownernumber reset`,
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

    if (inputNumber.toLowerCase() === 'reset') {
        // Reset to default owner number
        const success = resetOwnerNumber();
        if (success) {
            const defaultOwnerNumber = getOwnerNumber();
            const maskedDefault = defaultOwnerNumber.split('@')[0].replace(/(\d{3})\d+(\d{3})/, '$1****$2');
            
            await sock.sendMessage(chatId, { 
                text: `✅ Owner number reset to default: *${maskedDefault}*`,
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
                text: '❌ Failed to reset owner number!',
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

    // Set new owner number
    const formattedNumber = formatToJID(inputNumber);
    
    if (!isValidWhatsAppNumber(formattedNumber)) {
        await sock.sendMessage(chatId, { 
            text: '❌ Invalid WhatsApp number format! Please provide a valid number.\n\nExamples:\n- 1234567890\n- 1234567890@s.whatsapp.net',
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

    const success = setOwnerNumber(formattedNumber);
    if (success) {
        const maskedNewNumber = formattedNumber.split('@')[0].replace(/(\d{3})\d+(\d{3})/, '$1****$2');
        
        await sock.sendMessage(chatId, { 
            text: `✅ Owner number successfully set to: *${maskedNewNumber}*\n\n⚠️ Important: Make sure this number is correct as they will have full owner access to the bot.`,
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
        
        // Also notify the new owner if possible
        try {
            await sock.sendMessage(formattedNumber, { 
                text: `🎉 You have been set as the new owner of TRUTH-MD bot!\n\nYou now have full owner privileges. Use .owner to see your owner commands.`
            });
        } catch (notifyError) {
            console.log('Could not notify new owner:', notifyError.message);
        }
    } else {
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to set owner number! Please check the number format and try again.',
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

module.exports = {
    getOwnerNumber,
    setOwnerNumber,
    resetOwnerNumber,
    isOwner,
    handleSetOwnerNumberCommand
};
