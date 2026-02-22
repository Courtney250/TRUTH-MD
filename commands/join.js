const { getBinaryNodeChild } = require('@whiskeysockets/baileys');

async function joinCommand(sock, chatId, senderId, message, userMessage) {
    try {
        // Check if user is owner/sudo
        if (!message.key.fromMe) {
            const { isSudo } = require('../lib/index');
            const senderIsSudo = await isSudo(senderId);
            if (!senderIsSudo) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Only owner/sudo can use this command!' 
                }, { quoted: message });
                return;
            }
        }

        // Extract invite code from message
        const args = userMessage.split(' ');
        if (args.length < 2) {
            await sock.sendMessage(chatId, { 
                text: `❌ Please provide a WhatsApp group invite link!\n\nExample: ${args[0]} https://chat.whatsapp.com/BJpH3510X00AUvXqOvQ1W0` 
            }, { quoted: message });
            return;
        }

        const link = args[1].trim();
        let inviteCode;
        
        // Extract invite code from different link formats
        if (link.includes('chat.whatsapp.com/')) {
            // Extract code from https://chat.whatsapp.com/CODE
            const parts = link.split('/');
            inviteCode = parts[parts.length - 1];
        } else if (link.startsWith('https://whatsapp.com/')) {
            // Extract code from https://whatsapp.com/group/CODE
            const parts = link.split('/');
            inviteCode = parts[parts.length - 1];
        } else if (/^[A-Za-z0-9]{22}$/.test(link)) {
            // Direct invite code
            inviteCode = link;
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Invalid WhatsApp group link format!\n\nPlease provide a valid link like:\nhttps://chat.whatsapp.com/BJpH3510X00AUvXqOvQ1W0' 
            }, { quoted: message });
            return;
        }

        // Validate invite code format
        if (!inviteCode || !/^[A-Za-z0-9]{22}$/.test(inviteCode)) {
            await sock.sendMessage(chatId, { 
                text: '❌ Invalid invite code format!\n\nInvite code should be 22 characters (letters and numbers).' 
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { 
            text: '⏳ Attempting to join group...' 
        }, { quoted: message });

        try {
            // Method 1: Try using groupAcceptInvite
            const response = await sock.groupAcceptInvite(inviteCode);
            
            if (response) {
                const groupId = response.gid;
                await sock.sendMessage(chatId, { 
                    text: `✅ Successfully joined the group!\n\n📝 Group ID: ${groupId}` 
                }, { quoted: message });
                return;
            }
        } catch (error) {
            console.error('Error with groupAcceptInvite:', error);
            
            // Method 2: Try using query method as fallback
            try {
                const result = await sock.query({
                    tag: 'iq',
                    attrs: {
                        type: 'set',
                        xmlns: 'w:g2',
                        to: '@g.us'
                    },
                    content: [
                        {
                            tag: 'invite',
                            attrs: { code: inviteCode }
                        }
                    ]
                });

                if (result) {
                    const groupNode = getBinaryNodeChild(result, 'group');
                    if (groupNode) {
                        const groupId = groupNode.attrs.id;
                        await sock.sendMessage(chatId, { 
                            text: `✅ Successfully joined the group!\n\n📝 Group ID: ${groupId}` 
                        }, { quoted: message });
                        return;
                    }
                }
            } catch (queryError) {
                console.error('Error with query method:', queryError);
            }

            // Handle specific error cases
            if (error.message && error.message.includes('invite_revoked') || 
                error.message && error.message.includes('expired')) {
                await sock.sendMessage(chatId, { 
                    text: '❌ The invite link has expired or been revoked!' 
                }, { quoted: message });
            } else if (error.message && error.message.includes('already')) {
                await sock.sendMessage(chatId, { 
                    text: '⚠️ I\'m already a member of this group!' 
                }, { quoted: message });
            } else if (error.message && error.message.includes('full')) {
                await sock.sendMessage(chatId, { 
                    text: '❌ The group is full (max 1024 members)!' 
                }, { quoted: message });
            } else if (error.message && error.message.includes('blocked')) {
                await sock.sendMessage(chatId, { 
                    text: '❌ I\'m blocked from joining this group!' 
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: `❌ Failed to join group: ${error.message || 'Unknown error'}` 
                }, { quoted: message });
            }
        }
    } catch (error) {
        console.error('Error in join command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ An unexpected error occurred while trying to join the group.' 
        }, { quoted: message });
    }
}

module.exports = joinCommand;
