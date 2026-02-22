const fs = require('fs');
const path = require('path');

async function vcfCommand(sock, chatId, message) {
    try {
        // Ensure it's a group
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, {
                text: '❌ This command only works in groups!'
            }, { quoted: message });
        }

        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        if (participants.length < 2) {
            return await sock.sendMessage(chatId, {
                text: '❌ Group must have at least 2 members'
            }, { quoted: message });
        }

        // Build VCF content
        let vcfContent = '';
        let validCount = 0;

        for (const participant of participants) {
            if (!participant.id) continue;

            // Extract number
            let number = participant.id.split('@')[0];

            // Skip invalid numbers
            if (!/^\d+$/.test(number)) continue;

            // Ensure it has country code
            if (!number.startsWith('263')) {
                // Here you can set default country code, e.g., Zimbabwe
                number = `263${number.replace(/^0+/, '')}`;
            }

            const name =
                participant.notify ||
                participant.name ||
                `Member ${validCount + 1}`;

            vcfContent +=
`BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;TYPE=CELL:+${number}
NOTE:From ${groupMetadata.subject}
END:VCARD

`;
            validCount++;
        }

        if (validCount === 0) {
            return await sock.sendMessage(chatId, {
                text: '❌ No valid phone numbers found in this group!'
            }, { quoted: message });
        }

        // Temp folder
        const tempDir = path.join(__dirname, '../tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const safeName = groupMetadata.subject.replace(/[^\w]/g, '_');
        const filePath = path.join(tempDir, `${safeName}_${Date.now()}.vcf`);

        fs.writeFileSync(filePath, vcfContent);

        // Send file
        await sock.sendMessage(chatId, {
            document: fs.readFileSync(filePath),
            mimetype: 'text/vcard',
            fileName: `${safeName}_contacts.vcf`,
            caption:
`📇 *Group Contacts Exported*

• Group: ${groupMetadata.subject}
• Contacts: ${validCount}
• Generated: ${new Date().toLocaleString()}`
        }, { quoted: message });

        // Cleanup
        fs.unlinkSync(filePath);

    } catch (err) {
        console.error('VCF COMMAND ERROR:', err);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to generate VCF file!'
        }, { quoted: message });
    }
}

module.exports = vcfCommand;
