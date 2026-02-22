async function gitcloneCommand(sock, chatId, message) {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
    const parts = text.split(' ');
    let query = parts.slice(1).join(' ').trim();

    if (!query) {
        await sock.sendMessage(chatId, {
            text: "*❌ Please provide a Git repository URL.*\n\n_Usage:_\n.gitclone https://github.com/user/repo"
        }, { quoted: message });
        return;
    }

    const { exec } = require("child_process");
    const path = require("path");
    const fs = require("fs");

    try {
        // Remove trailing .git if present for name extraction, but keep for cloning if it was there
        let repoUrl = query.replace(/\.git$/, '');
        const repoName = repoUrl.split('/').pop();
        
        if (!repoName || !query.includes('github.com')) {
            await sock.sendMessage(chatId, {
                text: "❌ Invalid GitHub repository URL."
            }, { quoted: message });
            return;
        }

        const zipUrl = `https://github.com/${repoUrl.split('github.com/')[1]}/archive/refs/heads/main.zip`;
        const zipPath = path.join(__dirname, `../${repoName}.zip`);

        await sock.sendMessage(chatId, {
            text: `⏳ Downloading and sending: *${repoName}*...`
        }, { quoted: message });

        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: zipUrl,
            responseType: 'arraybuffer',
            headers: {
                'Accept': 'application/zip'
            }
        }).catch(async (err) => {
            // Try master branch if main fails
            const masterUrl = zipUrl.replace('/main.zip', '/master.zip');
            return await axios({
                method: 'get',
                url: masterUrl,
                responseType: 'arraybuffer'
            });
        });

        if (response && response.data) {
            fs.writeFileSync(zipPath, Buffer.from(response.data));

            await sock.sendMessage(chatId, {
                document: fs.readFileSync(zipPath),
                fileName: `${repoName}.zip`,
                mimetype: 'application/zip',
                caption: `✅ Successfully downloaded: *${repoName}*`
            }, { quoted: message });

            // Cleanup zip file
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        } else {
            throw new Error("Failed to download repository zip.");
        }

    } catch (error) {
        console.error("Error in gitcloneCommand:", error);
        await sock.sendMessage(chatId, {
            text: "❌ Something went wrong while cloning the repository."
        }, { quoted: message });
    }
}

module.exports = gitcloneCommand;
