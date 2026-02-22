// Create fake contact for enhanced replies
function createFakeContact(message) {
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
            fromMe: false,
            id: "TRUTH-MD-MENU"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:TRUTH MD\nitem1.TEL;waid=${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}:${message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
}

// Open group for a specific time
async function opentimeCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        const isGroup = chatId.endsWith('@g.us');
        
        // Check if in group
        if (!isGroup) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command can only be used in groups!',
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

        // Check if user is admin
        const adminStatus = await isAdmin(sock, chatId, senderId, message);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only group admins can use this command!',
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

        const args = userMessage.split(' ').slice(1);
        
        if (args.length < 2) {
            return await sock.sendMessage(chatId, {
                text: `⏰ *Open Time Command*\n\nUsage:\n${getPrefix()}opentime <number> <unit>\n\nUnits: second, minute, hour, day\n\nExamples:\n${getPrefix()}opentime 10 second\n${getPrefix()}opentime 5 minute\n${getPrefix()}opentime 1 hour`,
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

        const time = parseInt(args[0]);
        const unit = args[1].toLowerCase();

        if (isNaN(time) || time <= 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide a valid positive number!',
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

        let timer;
        switch(unit) {
            case 'second':
                timer = time * 1000;
                break;
            case 'minute':
                timer = time * 60000;
                break;
            case 'hour':
                timer = time * 3600000;
                break;
            case 'day':
                timer = time * 86400000;
                break;
            default:
                return await sock.sendMessage(chatId, {
                    text: '❌ Invalid time unit! Use: second, minute, hour, day',
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
            text: `⏰ Open time ${time} ${unit}(s) starting from now...`,
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

        // Send reaction
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

        // Set timeout to open group
        setTimeout(async () => {
            try {
                await sock.groupSettingUpdate(chatId, 'not_announcement');
                const openMessage = `🔓 *OPEN TIME*\n\nGroup has been opened by ${getBotName()}\nNow all members can send messages!`;
                
                await sock.sendMessage(chatId, {
                    text: openMessage,
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
            } catch (error) {
                console.error('Error opening group:', error);
            }
        }, timer);

    } catch (error) {
        console.error('Open time command error:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: '❌ Error setting open time!',
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

// Close group for a specific time
async function closetimeCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        const isGroup = chatId.endsWith('@g.us');
        
        // Check if in group
        if (!isGroup) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command can only be used in groups!',
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

        // Check if user is admin
        const adminStatus = await isAdmin(sock, chatId, senderId, message);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only group admins can use this command!',
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

        const args = userMessage.split(' ').slice(1);
        
        if (args.length < 2) {
            return await sock.sendMessage(chatId, {
                text: `⏰ *Close Time Command*\n\nUsage:\n${getPrefix()}closetime <number> <unit>\n\nUnits: second, minute, hour, day\n\nExamples:\n${getPrefix()}closetime 10 second\n${getPrefix()}closetime 5 minute\n${getPrefix()}closetime 1 hour`,
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

        const time = parseInt(args[0]);
        const unit = args[1].toLowerCase();

        if (isNaN(time) || time <= 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ Please provide a valid positive number!',
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

        let timer;
        switch(unit) {
            case 'second':
                timer = time * 1000;
                break;
            case 'minute':
                timer = time * 60000;
                break;
            case 'hour':
                timer = time * 3600000;
                break;
            case 'day':
                timer = time * 86400000;
                break;
            default:
                return await sock.sendMessage(chatId, {
                    text: '❌ Invalid time unit! Use: second, minute, hour, day',
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
            text: `⏰ Close time ${time} ${unit}(s) starting from now...`,
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

        // Send reaction
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

        // Set timeout to close group
        setTimeout(async () => {
            try {
                await sock.groupSettingUpdate(chatId, 'announcement');
                const closeMessage = `🔐 *CLOSE TIME*\n\nGroup has been closed by ${getBotName()}\nNow only admins can send messages!`;
                
                await sock.sendMessage(chatId, {
                    text: closeMessage,
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
            } catch (error) {
                console.error('Error closing group:', error);
            }
        }, timer);

    } catch (error) {
        console.error('Close time command error:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: '❌ Error setting close time!',
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

// Tag all admins in group
async function tagadminCommand(sock, chatId, senderId, message, userMessage) {
    try {
        const fake = createFakeContact(message);
        const isGroup = chatId.endsWith('@g.us');
        
        // Check if in group
        if (!isGroup) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command can only be used in groups!',
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

        // Check if user is admin
        const adminStatus = await isAdmin(sock, chatId, senderId, message);
        if (!adminStatus.isSenderAdmin && !message.key.fromMe) {
            return await sock.sendMessage(chatId, {
                text: '❌ Only group admins can use this command!',
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

        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const admins = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id);

        if (admins.length === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ There are no admins in this group!',
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

        let adminTagMessage = `👥 *TAGGING ALL ADMINS* 👥\n\n`;
        admins.forEach((admin, index) => {
            adminTagMessage += `▫️ @${admin.split('@')[0]}\n`;
        });
        adminTagMessage += `\n📢 *Mentioning ${admins.length} admin(s)*`;

        await sock.sendMessage(chatId, {
            text: adminTagMessage,
            mentions: admins
        }, { quoted: fake });

        // Send reaction
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('Tag admin command error:', error);
        const fake = createFakeContact(message);
        await sock.sendMessage(chatId, {
            text: '❌ Error tagging admins!',
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

// Helper function to get prefix
function getPrefix() {
    try {
        const { getPrefix } = require('./setprefix');
        return getPrefix();
    } catch (error) {
        return '.'; // fallback prefix
    }
}

// Helper function to get bot name
function getBotName() {
    try {
        const { getBotName } = require('./setbot');
        return getBotName();
    } catch (error) {
        return 'TRUTH-MD'; // fallback
    }
}

module.exports = {
    opentimeCommand,
    closetimeCommand,
    tagadminCommand
};
