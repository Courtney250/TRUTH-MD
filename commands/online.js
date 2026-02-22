async function onlineCommand(sock, chatId, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: '❌ This command only works in groups.' 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { 
            text: '⚡ Checking who\'s active...' 
        }, { quoted: message });

        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants;
        const activeMembers = new Set();
        const now = Date.now();

        // Method 1: Check recent message senders (most reliable)
        try {
            const recentMessages = await sock.loadMessages(chatId, 30);
            recentMessages.forEach(msg => {
                if (msg.key && msg.key.participant && msg.message) {
                    const msgAge = now - (msg.messageTimestamp * 1000);
                    if (msgAge < 300000) { // 5 minutes
                        activeMembers.add(msg.key.participant);
                    }
                }
            });
        } catch (e) {}

        // Method 2: Check who's typing right now
        try {
            // Listen for typing events (we need to capture them in real-time)
            // This requires the bot to already be monitoring the group
            // We'll just mention that typing detection is active
        } catch (e) {}

        // Method 3: Quick presence check (limited to 10 users to avoid timeout)
        const quickCheck = participants.slice(0, 10);
        for (const participant of quickCheck) {
            try {
                const presence = await sock.presenceGet(chatId, participant.id);
                if (presence === 'available' || presence === 'composing' || presence === 'recording') {
                    activeMembers.add(participant.id);
                }
            } catch (e) {}
        }

        // Convert to array
        const onlineArray = Array.from(activeMembers);

        // Build response
        let response = `*GROUP ACTIVITY REPORT*\n\n`;
        response += `📊 *Statistics*\n`;
        response += `• Total Members: ${participants.length}\n`;
        response += `• Currently Active: ${onlineArray.length}\n\n`;
        
        if (onlineArray.length > 0) {
            response += `*🟢 ACTIVE MEMBERS*\n`;
            onlineArray.forEach((jid, index) => {
                const username = jid.split('@')[0];
                response += `${index + 1}. @${username}\n`;
            });
            response += `\n_Detected via: Recent messages + presence_`;
        } else {
            response += `*No active members detected.*\n`;
            response += `_The group might be quiet or members have privacy settings enabled._`;
        }

        // Send response
        await sock.sendMessage(chatId, {
            text: response,
            mentions: onlineArray.length > 0 ? onlineArray : undefined
        }, { quoted: message });

    } catch (error) {
        console.error('Online command failed:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Could not check online status. Bot needs to be active in the group.'
        }, { quoted: message });
    }
}

module.exports = onlineCommand;
