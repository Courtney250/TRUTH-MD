async function kickAllCommand(sock, chatId, message, senderIsSudo) {
    try {
        const isOwner = message.key.fromMe || senderIsSudo;
        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command is only available for the owner!',
                quoted: message
            });
            return;
        }

        const chat = await sock.groupMetadata(chatId).catch(() => null);
        if (!chat) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command only works in groups!',
                quoted: message
            });
            return;
        }

        const isAdmin = chat.participants.find(p => p.id === message.key.participant || p.id === message.key.remoteJid)?.admin;
        if (!isAdmin) {
            await sock.sendMessage(chatId, { 
                text: '❌ You need to be a group admin to use this command!',
                quoted: message
            });
            return;
        }

        const participants = chat.participants.filter(p => {
            if (p.id.includes(sock.user.id.split(':')[0])) return false;
            if (p.id === (message.key.participant || message.key.remoteJid)) return false;
            return true;
        });

        if (participants.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '❌ No members to kick!',
                quoted: message
            });
            return;
        }

        const warningMessage = `⚠️ *KICK ALL WARNING*\n\nAll members will be removed from this group in 3 seconds!\n\n${participants.map((p, i) => `*${i + 1}.* @${p.id.split('@')[0]}`).join('\n')}\n\n_This action cannot be undone!_`;

        await sock.sendMessage(chatId, { 
            text: warningMessage,
            mentions: participants.map(p => p.id)
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        let successCount = 0;
        let failCount = 0;
        const failedMembers = [];

        const batchSize = 5;
        for (let i = 0; i < participants.length; i += batchSize) {
            const batch = participants.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (participant, index) => {
                try {
                    await new Promise(resolve => setTimeout(resolve, index * 200));
                    await sock.groupParticipantsUpdate(
                        chatId,
                        [participant.id],
                        'remove'
                    );
                    successCount++;
                    console.log(`✅ Kicked: ${participant.id.split('@')[0]}`);
                } catch (error) {
                    failCount++;
                    failedMembers.push({
                        id: participant.id.split('@')[0],
                        reason: error.message
                    });
                    console.log(`❌ Failed to kick ${participant.id.split('@')[0]}:`, error.message);
                }
            }));

            if (i + batchSize < participants.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        let resultMessage = `*KICK ALL RESULTS*\n\n`;
        resultMessage += `✅ Successfully kicked: ${successCount} member(s)\n`;
        
        if (failCount > 0) {
            resultMessage += `❌ Failed to kick: ${failCount} member(s)\n\n`;
            resultMessage += `*Failed members:*\n`;
            resultMessage += failedMembers.map(fm => `• @${fm.id} (${fm.reason})`).join('\n');
            
            if (failedMembers.length > 0) {
                await sock.sendMessage(chatId, {
                    text: resultMessage,
                    mentions: failedMembers.map(fm => fm.id + '@s.whatsapp.net')
                });
            }
        } else {
            resultMessage += `\n✨ All members have been successfully removed!`;
            await sock.sendMessage(chatId, { text: resultMessage });
        }

        console.log(`✅ Kick All Complete: ${successCount} kicked, ${failCount} failed`);

    } catch (error) {
        console.error('Error in kickAllCommand:', error);
        
        if (!error.message.includes('not in group') && 
            !error.message.includes('Not authorized')) {
            await sock.sendMessage(chatId, { 
                text: `❌ Failed to execute kickall command!\nError: ${error.message}`,
                quoted: message
            }).catch(() => {});
        }
    }
}

module.exports = kickAllCommand;
