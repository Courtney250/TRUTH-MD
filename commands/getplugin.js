const fs = require('fs');

async function getpluginCommand(sock, chatId, message, prefix, senderIsSudo) {
    try {
        const isOwner = message.key.fromMe || senderIsSudo;
        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: '😡 Command only for the owner.'
            });
            return;
        }

        // Extract the plugin name from message
        let pluginName;
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        
        if (text.startsWith(`${prefix}getplugin`)) {
            const args = text.trim().split(' ');
            if (args.length < 2) {
                await sock.sendMessage(chatId, { 
                    text: `Usage: ${prefix}getplugin <plugin_name>\nExample: ${prefix}getplugin menu`
                });
                
                await sock.sendMessage(chatId, {
                    react: { text: '🗑️', key: message.key }
                });
                return;
            }
            pluginName = args[1];
        } else {
            await sock.sendMessage(chatId, { 
                text: `Usage: ${prefix}getplugin <plugin_name>\nExample: ${prefix}getplugin menu`
            });
            return;
        }

        try {
            // Function to extract plugin code without case/break
            const getplugin = (plugin) => {
                try {
                    const fileContent = fs.readFileSync('../command.js').toString();
                    const parts = fileContent.split(`case '${plugin}'`);
                    
                    if (parts.length < 2) {
                        return `❌ Plugin '${plugin}' not found in command.js!`;
                    }
                    
                    // Extract only the code between case and break
                    const pluginCode = parts[1].split("break")[0].trim();
                    return pluginCode;
                } catch (error) {
                    console.error('Error reading command.js:', error);
                    return `❌ Error reading command.js: ${error.message}`;
                }
            }

            // Get the plugin code
            const pluginCode = getplugin(pluginName);
            
            // Send the plugin code
            await sock.sendMessage(chatId, {
                text: `📦 Plugin Code for "${pluginName}":\n\n\`\`\`javascript\n${pluginCode}\n\`\`\``
            });

            await sock.sendMessage(chatId, {
                react: { text: '📋', key: message.key }
            });

        } catch (error) {
            console.error('⚠️ Error in getplugin command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to retrieve plugin code. Please check the plugin name.'
            });
        }
    } catch (error) {
        console.error('⚠️ Unexpected error in getpluginCommand:', error);
    }
}

module.exports = getpluginCommand;
