const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

async function githubCommand(sock, chatId, message) {
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

  try {
  
  const fkontak = createFakeContact(message);
    
const pushname = message.pushName || "Unknown User";
    const repoPath = settings.githubRepo || 'Courtney250/TRUTH-md';
    const res = await fetch(`https://api.github.com/repos/${repoPath}`, {
        headers: { 'User-Agent': 'TRUTH-MD-Bot/1.0' }
    });

    if (!res.ok) {
        const repoUrl = `https://github.com/${repoPath}`;
        let txt = `🔹  \`𝙱𝙾𝚃 𝚁𝙴𝙿𝙾 𝙸𝙽𝙵𝙾.\` \n\n`;
        txt += `🔸  *Name* : ${settings.botName || 'TRUTH MD'}\n`;
        txt += `🔸  *Version* : ${settings.version || '1.0.0'}\n`;
        txt += `🔸  *Owner* : ${settings.botOwner || 'courtney'}\n`;
        txt += `🔸  *REPO* : ${repoUrl}\n\n`;
        txt += `🔹  *Description* : ${settings.description || 'WhatsApp Bot'}\n\n`;
        txt += `@${pushname} Don't forget to fork and star my repo`;

        const imgPath = path.join(__dirname, '../asset/IMG-20251114-WA0002.jpg');
        if (fs.existsSync(imgPath)) {
            const imgBuffer = fs.readFileSync(imgPath);
            await sock.sendMessage(chatId, {
                image: imgBuffer,
                caption: txt,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: false,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363409714698622@newsletter',
                        newsletterName: 'TRUTH-MD Official',
                        serverMessageId: -1
                    }
                }
            },{ quoted: fkontak });
        } else {
            await sock.sendMessage(chatId, { text: txt }, { quoted: fkontak });
        }

        await sock.sendMessage(chatId, {
            react: { text: '', key: message.key }
        });
        return;
    }

    const json = await res.json();

    let txt = 
           `🔹  \`𝙱𝙾𝚃 𝚁𝙴𝙿𝙾 𝙸𝙽𝙵𝙾.\` \n\n`;
    txt += `🔸  *Name* : ${json.name}\n`;
    txt += `🔸  *Watchers* : ${json.watchers_count}\n`;
    txt += `🔸  *Size* : ${(json.size / 1024).toFixed(2)} MB\n`;
    txt += `🔸  *Last Updated* : ${moment(json.updated_at).format('DD/MM/YY - HH:mm:ss')}\n`;
    txt += `🔸  *REPO* : ${json.html_url}\n\n`;    
    txt += `🔹  *Forks* : ${json.forks_count}\n`;
    txt += `🔹  *Stars* : ${json.stargazers_count}\n`;
    txt += `🔹  *Desc* : ${json.description || 'None'}\n\n`;
    txt += `@${pushname} Don't forget to fork and star my repo`;

    const imgPath = path.join(__dirname, '../asset/IMG-20251114-WA0002.jpg');
    if (fs.existsSync(imgPath)) {
        const imgBuffer = fs.readFileSync(imgPath);
        await sock.sendMessage(chatId, {
            image: imgBuffer,
            caption: txt,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363409714698622@newsletter',
                    newsletterName: 'TRUTH-MD Official',
                    serverMessageId: -1
                }
            }
        },{ quoted: fkontak });
    } else {
        await sock.sendMessage(chatId, { text: txt }, { quoted: fkontak });
    }

    await sock.sendMessage(chatId, {
            react: { text: '', key: message.key }
        });
    
  } catch (error) {
    console.error('GitHub command error:', error.message);
    await sock.sendMessage(chatId, { text: '❌ Error fetching repository information.' }, { quoted: message });
  }
}

module.exports = githubCommand; 
