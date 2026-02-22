const deployManager = require('../deployManager');

async function connectCommand(sock, chatId, senderId, message, rawMessage, prefix) {
    const input = rawMessage.slice(prefix.length + 'connect'.length).trim();

    if (!input) {
        return await sock.sendMessage(chatId, {
            text: `🚀 *Quick Bot Deployment*\n\n` +
                  `*Usage:* ${prefix}connect <session_id>\n\n` +
                  `*Example:*\n${prefix}connect TECHWORLD:~eyJub2lzZUt...\n\n` +
                  `💡 Get your session ID from your existing bot or WhatsApp Web session.`
        }, { quoted: message });
    }

    try {
        if (input.toLowerCase() === 'list') {
            const userDeployments = deployManager.listUserDeployments(senderId);
            
            if (userDeployments.length === 0) {
                await sock.sendMessage(chatId, {
                    text: '📭 No active deployments\n\nUse the command above to deploy a bot.'
                }, { quoted: message });
                return;
            }

            let list = `🤖 Your Deployments (${userDeployments.length}/10)\n\n`;
            userDeployments.forEach((id, index) => {
                const status = deployManager.getDeploymentStatus(id);
                list += `${index + 1}. ${status?.isActive ? '🟢' : '🔴'} ${id}\n`;
            });

            await sock.sendMessage(chatId, { text: list }, { quoted: message });

        } else if (input.toLowerCase() === 'stop') {
            const userDeployments = deployManager.listUserDeployments(senderId);
            if (userDeployments.length === 0) {
                await sock.sendMessage(chatId, { 
                    text: '❌ No deployments to stop' 
                }, { quoted: message });
                return;
            }

            // Stop the first deployment
            const result = deployManager.stopDeployment(userDeployments[0], senderId);
            await sock.sendMessage(chatId, { 
                text: result.message 
            }, { quoted: message });

        } else {
            // Deploy bot with session ID
            if (!input.startsWith('TECHWORLD:~')) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Session must start with TECHWORLD:~' 
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(chatId, { 
                text: '🚀 Deploying bot to your account...' 
            }, { quoted: message });

            const userInfo = {
                pushName: message.pushName || 'User',
                deployTime: new Date().toLocaleString()
            };

            const result = await deployManager.deployBot(input, senderId, userInfo);
            await sock.sendMessage(chatId, { 
                text: result.message 
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Connect command error:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error: ' + error.message 
        }, { quoted: message });
    }
}

module.exports = connectCommand;
