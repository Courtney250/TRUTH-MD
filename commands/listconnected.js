const deployManager = require('../deployManager');

async function listConnectedCommand(sock, chatId, senderId, message, prefix) {
    try {
        const allDeployments = deployManager.listAllDeployments();
        
        if (allDeployments.length === 0) {
            await sock.sendMessage(chatId, {
                text: '📭 No active bot deployments'
            }, { quoted: message });
            return;
        }

        let list = `🚀 Active Deployments (${allDeployments.length})\n\n`;
        allDeployments.forEach((deploy, index) => {
            list += `${index + 1}. ${deploy.isActive ? '🟢' : '🔴'} ${deploy.userJid.split('@')[0]}***\n`;
            list += `   ID: ${deploy.deploymentId}\n\n`;
        });

        await sock.sendMessage(chatId, {
            text: list
        }, { quoted: message });

    } catch (error) {
        console.error('Listconnected error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error fetching deployments'
        }, { quoted: message });
    }
}

module.exports = listConnectedCommand;
