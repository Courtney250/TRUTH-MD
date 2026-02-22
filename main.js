/*━━━━━━━━━━━━━━━━━━━━*/
// Raw Output Suppression Code
/*━━━━━━━━━━━━━━━━━━━━*/

const originalWrite = process.stdout.write;
process.stdout.write = function (chunk, encoding, callback) {
    const message = chunk.toString();

    if (message.includes('Closing session: SessionEntry') || message.includes('SessionEntry {')) {
        return;
    }

    return originalWrite.apply(this, arguments);
};

const originalWriteError = process.stderr.write;
process.stderr.write = function (chunk, encoding, callback) {
    const message = chunk.toString();
    if (message.includes('Closing session: SessionEntry')) {
        return;
    }
    return originalWriteError.apply(this, arguments);
};

const originalLog = console.log;
console.log = function (message, ...optionalParams) {

    if (typeof message === 'string' && message.startsWith('Closing session: SessionEntry')) {
        return;
    }
    
    originalLog.apply(console, [message, ...optionalParams]);
};

//this code is to avoid preKeyCount bound coded by superstar

/*━━━━━━━━━━━━━━━━━━━━*/
// -----Core imports first-----
/*━━━━━━━━━━━━━━━━━━━━*/
const settings = require('./settings');
require('./config.js');
const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fs = require('fs');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { jidDecode } = require('@whiskeysockets/baileys');
const { updateLidMap, resolveToPhoneJid, isSudo } = require('./lib/index');
const isAdmin = require('./lib/isAdmin');
const { Antilink } = require('./lib/antilink');
const { tictactoeCommand, handleTicTacToeMove } = require('./commands/tictactoe');
const { getConfig } = require('./lib/configdb');

/*━━━━━━━━━━━━━━━━━━━━*/
// -----Command imports -Handlers
/*━━━━━━━━━━━━━━━━━━━━*/
const { 
   autotypingCommand,
   isAutotypingEnabled,
   handleAutotypingForMessage,
   handleAutotypingForCommand, 
   showTypingAfterCommand
 } = require('./commands/autotyping');

const {
    autoreadReceiptsCommand,
    applyReadReceiptsPrivacy,
    getReadReceiptsSetting
} = require('./commands/autoreadreceipts');

const {
  handleAntieditCommand,
  handleMessageEdit,
  storeMessage: storeEditMessage
} = require('./commands/antiedit');


 const {
  getPrefix, 
  handleSetPrefixCommand 
  } = require('./commands/setprefix');

const {
  getOwnerName, 
  handleSetOwnerCommand 
} = require('./commands/setowner');

const {
  getBotName, 
  handleSetBotCommand 
} = require('./commands/setbot');

// Add this with your other owner-related imports
const {
  getOwnerNumber,
  handleSetOwnerNumberCommand
} = require('./commands/setownernumber');
 
const {
 autoreadCommand,
 isAutoreadEnabled, 
 handleAutoread 
 } = require('./commands/autoread');
 
 const { 
    incrementMessageCount, 
    topMembers, 
    listOnlineCommand, 
    listOfflineCommand,
    handleUserActivity,
    updateUserActivity,
    getOnlineMembers 
} = require('./commands/topmembers');
 
 const { 
 setGroupDescription, 
 setGroupName, 
 setGroupPhoto 
 } = require('./commands/groupmanage');

const { createGroupCommand } = require('./commands/creategroup');

const { 
 handleAntilinkCommand, 
 handleLinkDetection 
 } = require('./commands/antilink');

const { 
 handleAntitagCommand, 
 handleTagDetection
 } = require('./commands/antitag');
 
const { 
 handleMentionDetection,
 mentionToggleCommand,
 setMentionCommand
 } = require('./commands/mention');
 
const { 
 handleAntiBadwordCommand,
 handleBadwordDetection
  } = require('./lib/antibadword');

const { 
    welcomeCommand, 
    goodbyeCommand, 
    setwelcomeCommand, 
    setgoodbyeCommand, 
    showsettingsCommand, 
    resetCommand,
    handleJoinEvent,
    handleLeaveEvent 
} = require('./commands/welcomemodule');
  
const {
 handleAntideleteCommand,
 handleMessageRevocation,
 storeMessage } = require('./commands/antidelete');
 
const {
 anticallCommand,
 readState: 
 readAnticallState 
 } = require('./commands/anticall');
 
const {
 pmblockerCommand, 
 readState: readPmBlockerState 
 } = require('./commands/pmblocker');
 
const {
 addCommandReaction, 
 handleAreactCommand 
 } = require('./lib/reactions');
 
const {
  autoStatusCommand, 
  handleStatusUpdate 
  } = require('./commands/autostatus');
  
const {
 startHangman, 
 guessLetter 
 } = require('./commands/hangman');
 
const {
 startTrivia, 
 answerTrivia 
 } = require('./commands/trivia');

const {
 miscCommand, 
 handleHeart 
 } = require('./commands/misc');
const { 
   setWatermarkCommand, 
   applyWatermark, 
   applyMediaWatermark 
} = require('./commands/setwatermark');
const { 
   handleDevReact 
} = require('./commands/devreact');
const { 
   opentimeCommand, 
   closetimeCommand, 
   tagadminCommand 
} = require('./commands/grouptime');
const { 
   blockCommand, 
   blocklistCommand, 
   unblockallCommand 
} = require('./commands/block');
const { 
    pendingRequestsCommand, 
    approveAllCommand, 
    rejectAllCommand,
    addRequestCommand,
    clearRequestsCommand
} = require('./commands/grouprequests');
const { 
    antidemoteCommand, 
    antipromoteCommand,
    handleGroupParticipantsUpdate: handleAntiPromoteDemote
} = require('./commands/antipromote');
const { 
obfuscateCommand, 
obfuscateAdvancedCommand, 
quickObfuscateCommand 
} = require('./commands/obfuscate');
const {
  getSetting,
  setSetting,
  storeUserMessage
} = require('./lib/chatbot.db');
const {
  handleChatbotCommand,
  handleChatbotResponse
} = require('./commands/chatbot');

 
/*━━━━━━━━━━━━━━━━━━━━*/
//Command imorts ---
/*━━━━━━━━━━━━━━━━━━━━*/
const { paymentCommand, setPaymentCommand, delPaymentCommand } = require('./commands/payment');
const gitcloneCommand = require('./commands/gitclone');
const getpluginCommand = require('./commands/getplugin');
const pairCommand = require('./commands/pair');
const { chaneljidCommand } = require('./commands/chaneljid');
const getppCommand =require('./commands/getpp');
const tagAllCommand = require('./commands/tagall');
const helpCommand = require('./commands/help');
const banCommand = require('./commands/ban');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const imgCommand = require('./commands/img');
const shazamCommand = require('./commands/shazam');
const reportBugCommand = require('./commands/reportbug');
const saveStatusCommand = require('./commands/save');
const fetchCommand = require('./commands/fetch');
const vcfCommand = require('./commands/vcf'); // Add this line
const setGroupStatusCommand = require('./commands/togstatus'); // Add this line
const developerCommand = require('./commands/developer');

/*━━━━━━━━━━━━━━━━━━━━*/
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
/*━━━━━━━━━━━━━━━━━━━━*/

const deleteCommand = require('./commands/delete');
const closeGCCommand = require('./commands/closegc');
const openGCCommand = require('./commands/opengc');
const killAllCommand = require('./commands/killall');
const linkCommand = require('./commands/link');
const { 
    handleAntiGroupMentionCommand, 
    handleGroupMentionDetection 
} = require('./commands/antigroupmention');
const { 
   handleAntiStickerCommand, 
   handleStickerDetection 
} = require('./commands/antisticker');
const { handleAntiPhotoCommand, handlePhotoDetection } = require('./commands/antiphoto');
const ttsCommand = require('./commands/tts');
const ownerCommand = require('./commands/owner');
const listonlineCommand = require('./commands/listonline');
const leaveGroupCommand = require('./commands/leavegroup');
const nglCommand = require('./commands/ngl');

/*━━━━━━━━━━━━━━━━━━━━*/
const memeCommand = require('./commands/meme');
const tagCommand = require('./commands/tag');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
/*━━━━━━━━━━━━━━━━━━━━*/

/*━━━━━━━━━━━━━━━━━━━━*/
const jokeCommand = require('./commands/joke');
const quoteCommand = require('./commands/quote');
const factCommand = require('./commands/fact');
const weatherCommand = require('./commands/weather');
const newsCommand = require('./commands/news');
const kickCommand = require('./commands/kick');
const simageCommand = require('./commands/simage');
const attpCommand = require('./commands/attp');
const { complimentCommand } = require('./commands/compliment');
const onlineCommand = require('./commands/online');
const kickAllCommand = require('./commands/kickall');

/*━━━━━━━━━━━━━━━━━━━━*/
const { insultCommand } = require('./commands/insult');
const { eightBallCommand } = require('./commands/eightball');
const { lyricsCommand } = require('./commands/lyrics');
const { dareCommand } = require('./commands/dare');
const { truthCommand } = require('./commands/truth');
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const sudoCommand = require('./commands/sudo');
const aliveCommand = require('./commands/alive');
const blurCommand = require('./commands/img-blur');
const githubCommand = require('./commands/github');
const uptimeCommand = require('./commands/uptime');
const tutorialCommand = require('./commands/tutorial');
const setMenuImageCommand = require('./commands/setmenuimage');
const connectCommand = require('./commands/connect');
const listConnectedCommand = require('./commands/listconnected');
const deployManager = require('./deployManager');
/*━━━━━━━━━━━━━━━━━━━━*/

/*━━━━━━━━━━━━━━━━━━━━*/
const antibadwordCommand = require('./commands/antibadword');
const takeCommand = require('./commands/take');
const { flirtCommand } = require('./commands/flirt');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const shipCommand = require('./commands/ship');
const groupInfoCommand = require('./commands/groupinfo');
const resetlinkCommand = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const viewOnceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const { simpCommand } = require('./commands/simp');
const { stupidCommand } = require('./commands/stupid');
const stickerTelegramCommand = require('./commands/stickertelegram');
const textmakerCommand = require('./commands/textmaker');
const clearTmpCommand = require('./commands/cleartmp');
const setProfilePicture = require('./commands/setpp');
/*━━━━━━━━━━━━━━━━━━━━*/

/*━━━━━━━━━━━━━━━━━━━━*/
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const spotifyCommand = require('./commands/spotify');
const playCommand = require('./commands/play');
const tiktokCommand = require('./commands/tiktok');
const songCommand = require('./commands/song');
const aiCommand = require('./commands/ai');
const urlCommand = require('./commands/url');
const { handleTranslateCommand } = require('./commands/translate');
const { handleSsCommand } = require('./commands/ss');
const musicCommand = require('./commands/music');
/*━━━━━━━━━━━━━━━━━━━━*/

/*━━━━━━━━━━━━━━━━━━━━*/
const { goodnightCommand } = require('./commands/goodnight');
const { shayariCommand } = require('./commands/shayari');
const { rosedayCommand } = require('./commands/roseday');
const imagineCommand = require('./commands/imagine');
const videoCommand = require('./commands/video');
const { animeCommand } = require('./commands/anime');
const { piesCommand, piesAlias } = require('./commands/pies');
const stickercropCommand = require('./commands/stickercrop');
const updateCommand = require('./commands/update');
const removebgCommand = require('./commands/removebg');
const { reminiCommand } = require('./commands/remini');
const { igsCommand } = require('./commands/igs');
/*━━━━━━━━━━━━━━━━━━━━*/

/*━━━━━━━━━━━━━━━━━━━━*/
const settingsCommand = require('./commands/settings');
const soraCommand = require('./commands/sora');
const apkCommand = require('./commands/apk');
const bibleCommand = require('./commands/bible');
const quranCommand = require('./commands/quran');
const menuConfigCommand = require('./commands/menuConfig');
const ytsCommand = require('./commands/yts');
const joinCommand = require('./commands/join');

/*━━━━━━━━━━━━━━━━━━━━*/

/*━━━━━━━━━━━━━━━━━━━━*/
// Advanced settings commands
/*━━━━━━━━━━━━━━━━━━━━*/
const {
  setbotimageCommand,
  setvarCommand,
  modeCommand,
  toggleSettingCommand
} = require('./commands/advancedsettings');
/*━━━━━━━━━━━━━━━━━━━━*/

/*━━━━━━━━━━━━━━━━━━━━*/
// Global settings
/*━━━━━━━━━━━━━━━━━━━━*/
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029VbCafMZBA1f42UxcYW0D";
global.ytch = "Truth md";

// Add this near the top of main.js with other global configurations
const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363409714698622@newsletter',
            newsletterName: 'Truth md',
            serverMessageId: -1
        }
    }
};

async function handleMessages(sock, messageUpdate, printLog ) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Fixed dev react to 254101150748
        await handleDevReact(sock, message);

        // Continue with your existing code...
        await handleAutoread(sock, message);
        // Store message for antidelete feature
        if (message.message) {
            storeMessage(sock, message);
        }

        // Handle message revocation
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const chatId = message.key.remoteJid;
        const rawSenderId = message.key.participant || message.key.remoteJid;
        const senderAlt = message.key.participantAlt || message.key.remoteJidAlt || '';
        const senderId = (senderAlt && senderAlt.includes('@s.whatsapp.net')) ? senderAlt : rawSenderId;

        if (rawSenderId.includes('@lid') && senderAlt.includes('@s.whatsapp.net')) {
            updateLidMap([{ id: senderAlt, lid: rawSenderId }]);
        }
            
 /*━━━━━━━━━━━━━━━━━━━━*/
       // Dynamic prefix      
       const prefix = getPrefix();
        
        const isGroup = chatId.endsWith('@g.us');
        const resolvedSenderId = resolveToPhoneJid(senderId);
        const senderIsSudo = await isSudo(resolvedSenderId);

        // Preserve original message for commands that need it (like connect)
const rawMessage = (
    message.message?.conversation?.trim() ||
    message.message?.extendedTextMessage?.text?.trim() ||
    message.message?.imageMessage?.caption?.trim() ||
    message.message?.videoMessage?.caption?.trim() ||
    ''
).replace(/\.\s+/g, '.').trim();

        // For command detection, use lowercase
        const userMessage = rawMessage.toLowerCase();

        // Keep rawText for other commands that need original casing
        const rawText = rawMessage;

        const time = new Date().toLocaleTimeString();
        const pushname = message.pushName || "Unknown User";
        const chatType = chatId.endsWith('@g.us') ? 'Group' : 'Private';
        const body = message.message.conversation || message.message.extendedTextMessage?.text || '';

        if (userMessage && userMessage.startsWith(prefix)) {
            const commandStartTime = Date.now();
            const topBar = chalk.red('━━━━━━━━━━') + chalk.yellow(' 『 ') + chalk.green('TRUTH-MD') + chalk.yellow(' 』 ') + chalk.blue('━━━━━━━━━━') + chalk.green('━━━━━━');
            const bottomBar = chalk.yellow('━━━━━') + chalk.red('━━━━━━━') + chalk.magenta('━━━━━━━━━━━━━') + chalk.green('━━━━━━━━') + chalk.cyan(' ~~');
            console.log(topBar);
            console.log(chalk.yellow('»') + chalk.cyan(` Source: command`));
            console.log(chalk.yellow('»') + chalk.green(` Sender: ${pushname}`));
            console.log(chalk.yellow('»') + chalk.yellow(` Message Time: ${time}`));
            console.log(chalk.yellow('»') + chalk.magenta(` Message Type: ${chatType}`));
            console.log(chalk.yellow('»') + chalk.blue(` Chat ID: ${chatId}`));
            console.log(chalk.yellow('»') + chalk.red(` Message: ${body || "—"}`));
            console.log(bottomBar);

            const originalSendMessage = sock.sendMessage;
            sock.sendMessage = async function(...args) {
                const responseTime = Date.now() - commandStartTime;
                console.log(chalk.green(`[SPEED] Bot response speed: ${responseTime}ms`));
                sock.sendMessage = originalSendMessage;
                return originalSendMessage.apply(this, args);
            };
        }

        try {

            const mode = getConfig('MODE', settings.commandMode || 'public');
            const isGroup = chatId.endsWith('@g.us');
            if (mode === 'private' && !message.key.fromMe && !senderIsSudo) {
                return;
            }
            if (mode === 'groups' && !isGroup && !message.key.fromMe && !senderIsSudo) {
                return;
            }
            if (mode === 'dms' && isGroup && !message.key.fromMe && !senderIsSudo) {
                return;
            }
        } catch (error) {
            console.error('Error checking access mode:', error);
        }
        // Check if user is banned (skip ban check for unban command)
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            // Only respond occasionally to avoid spam
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, {
                    text: '❌ You are banned from using the bot. Contact an admin to get unbanned.',
                    ...channelInfo
                });
            }
            return;
        }

        // First check if it's a game move
        if (/^[1-9]$/.test(userMessage) || userMessage.toLowerCase() === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }



        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Check for bad words FIRST, before ANY other processing
        if (isGroup && userMessage) {
            await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            await Antilink(message, sock);
        }

        if (isGroup) {
            await handleStickerDetection(sock, chatId, message, senderId);
            await handlePhotoDetection(sock, chatId, message, senderId);
            await handleGroupMentionDetection(sock, chatId, message, senderId);
        }

        // PM blocker: block non-owner DMs when enabled (do not ban)
        if (!isGroup && !message.key.fromMe && !senderIsSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    // Inform user, delay, then block without banning globally
                    await sock.sendMessage(chatId, { text: pmState.message || 'Private messages are blocked. Please contact the owner in groups only.' });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) { }
                    return;
                }
            } catch (e) { }
        }

        /*━━━━━━━━━━━━━━━━━━━━*/
        // Then check for command prefix
        /*━━━━━━━━━━━━━━━━━━━━*/
        
        
        // Check for "prefix" word to help users who forgot it
        if (userMessage === 'prefix' || userMessage === 'getprefix' || userMessage === 'whatprefix') {
            if (!message.key.fromMe && !senderIsSudo) {
                return;
            }
            await sock.sendMessage(chatId, { 
                text: `*Current Prefix is:*  [ ${prefix} ]\n\n_To use a command, type the prefix followed by the command name._\n_Example: ${prefix}help_`,
                ...channelInfo 
            }, { quoted: message });
            return;
        }

        // Then check for command prefix
        if (!userMessage.startsWith(prefix)) {
            // Show typing indicator if autotyping is enabled
            await handleAutotypingForMessage(sock, chatId, userMessage);

            if (isGroup) {
                // In groups, only handle tag and mention detection
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
            } else {
                 // In private chats, handle chatbot responses
                await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
              }
            return;
        }

        // List of admin commands
        const adminCommands = [
          `${prefix}mute`,
          `${prefix}unmute`,
          `${prefix}ban`,
          `${prefix}unban`,
          `${prefix}promote`,
          `${prefix}demote`,
          `${prefix}kick`,
          `${prefix}tagall`, 
          `${prefix}tagnotadmin`, 
          `${prefix}hidetag`,
          `${prefix}antilink`,
          `${prefix}antitag`, 
          `${prefix}setgdesc`, 
          `${prefix}setgname`, 
          `${prefix}setgpp`];
          
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        // List of owner commands
        const ownerCommands = [
         `${prefix}mode`, 
         `${prefix}autostatus`, 
         `${prefix}antidelete`, 
         `${prefix}cleartmp`, 
         `${prefix}setpp`, 
         `${prefix}clearsession`, 
         `${prefix}areact`, 
         `${prefix}autoreact`, 
         `${prefix}autotyping`, 
         `${prefix}autoread`, 
         `${prefix}pmblocker`];
        
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        // Check admin status only for admin commands in groups
        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId, message);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { text: 'Please make the bot an admin to use admin commands.', ...channelInfo }, { quoted: message });
                return;
            }

            if (
                userMessage.startsWith(`${prefix}mute`) ||
                userMessage === `${prefix}unmute` ||
                userMessage.startsWith(`${prefix}ban`) ||
                userMessage.startsWith(`${prefix}unban`) ||
                userMessage.startsWith(`${prefix}promote`) ||
                userMessage.startsWith(`${prefix}demote`)
            ) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: 'Sorry, only group admins can use this command.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
            }
        }

        // Check owner status for owner commands
        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsSudo) {
                await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner or sudo!' }, { quoted: message });
                return;
            }
        }

        // Command handlers - Execute commands immediately without waiting for typing indicator
        // We'll show typing indicator after command execution if needed
        let commandExecuted = false;

        switch (true) {
       //prefix case 
        case userMessage.startsWith(`${prefix}setprefix`):
         await handleSetPrefixCommand(sock, chatId, senderId, message, userMessage, prefix);
                break;

              case userMessage.startsWith(`${prefix}cid`):
    await chaneljidCommand(sock, chatId, message);
    commandExecuted = true;
    break;
              //watermark import

           case userMessage.startsWith(`${prefix}setwatermark`):
    await setWatermarkCommand(sock, chatId, senderId, message, userMessage);
    break;
    //_________________________________
   
     case userMessage.startsWith(`${prefix}chatbot`): {
    const match = userMessage.split(' ')[1]; // on | off | undefined
    await handleChatbotCommand(
        sock,
        chatId,
        message,
        match,
        message.key.fromMe || senderIsSudo
    );
    commandExecuted = true;
    break;
}
//_________________________________________
                        
                              //set owner  
              
            case userMessage.startsWith(`${prefix}payment`):
                await paymentCommand(sock, chatId, message, prefix);
                break;

            case userMessage.startsWith(`${prefix}setpayment`):
                await setPaymentCommand(sock, chatId, senderId, message, rawText.split(' ').slice(1).join(' '), prefix, senderIsSudo);
                break;

            case userMessage.startsWith(`${prefix}delpayment`):
                await delPaymentCommand(sock, chatId, message, rawText.split(' ').slice(1).join(' '), prefix);
                break;

            case userMessage.startsWith(`${prefix}setownername`):
                await handleSetOwnerCommand(sock, chatId, senderId, message, userMessage, prefix);
                break;

                 //set bot  
              
            case userMessage.startsWith(`${prefix}setbot`):
                await handleSetBotCommand(sock, chatId, senderId, message, userMessage, prefix);
                break
                
            case userMessage === `${prefix}simage`:
            case userMessage === `${prefix}toimage`: {
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMessage?.stickerMessage) {
                    await simageCommand(sock, quotedMessage, chatId);
                } else {
                    await sock.sendMessage(chatId, { text: 'Please reply to a sticker with the toimage command to convert it.',...channelInfo }, { quoted: message });
                }
                commandExecuted = true;
                break;
            }
            case userMessage.startsWith(`${prefix}kick`):
                const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await kickCommand(sock, chatId, senderId, mentionedJidListKick, message, senderIsSudo);
                break;
            case userMessage.startsWith(`${prefix}mute`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const muteArg = parts[1];
                    const muteDuration = muteArg !== undefined ? parseInt(muteArg, 10) : undefined;
                    if (muteArg !== undefined && (isNaN(muteDuration) || muteDuration <= 0)) {
                        await sock.sendMessage(chatId, { text: 'Please provide a valid number of minutes or use?.mute with no number to mute immediately.'}, { quoted: message });
                    } else {
                        await muteCommand(sock, chatId, senderId, message, muteDuration);
                    }
                }
                break;

                      // Add menu configuration command
            case userMessage.startsWith(`${prefix}menuconfig`) || 
                 userMessage.startsWith(`${prefix}menuset`) || 
                 userMessage.startsWith(`${prefix}changemenu`):
                const menuArgs = userMessage.split(' ').slice(1);
                await menuConfigCommand(sock, chatId, message, menuArgs);
                commandExecuted = true;
                break;
              // Add these cases in your command switch statement
case userMessage.startsWith(`${prefix}connect`):
    // Use rawMessage to preserve case for session strings
    await connectCommand(sock, chatId, senderId, message, rawMessage, prefix);
    commandExecuted = true;
    break;

case userMessage === `${prefix}listconnected`:
case userMessage === `${prefix}listconnections`:
    await listConnectedCommand(sock, chatId, senderId, message, prefix);
    commandExecuted = true;
    break;

              case userMessage.startsWith(`${prefix}togstatus`) || 
     userMessage.startsWith(`${prefix}swgc`) || 
     userMessage.startsWith(`${prefix}groupstatus`):
    
    if (!isGroup) {
        await sock.sendMessage(chatId, { 
            text: '❌ This command only works in groups!' 
        }, { quoted: message });
        return;
    }
    
    // Check admin status
    const togAdminStatus = await isAdmin(sock, chatId, senderId);
    if (!togAdminStatus.isSenderAdmin && !message.key.fromMe && !senderIsSudo) {
        await sock.sendMessage(chatId, { 
            text: '❌ Only group admins can use this command!' 
        }, { quoted: message });
        return;
    }
    
    await setGroupStatusCommand(sock, chatId, message);
    commandExecuted = true;
    break;
              case userMessage === `${prefix}leave` || 
     userMessage === `${prefix}leavegroup` ||
     userMessage === `${prefix}exitgroup`:
    await leaveGroupCommand(sock, chatId, message);
    commandExecuted = true;
    break;
              case userMessage === `${prefix}block`:
    await blockCommand(sock, chatId, message, senderIsSudo);
    commandExecuted = true;
    break;

case userMessage === `${prefix}blocklist` || userMessage === `${prefix}listblocked`:
    await blocklistCommand(sock, chatId, message, senderIsSudo);
    commandExecuted = true;
    break;

case userMessage === `${prefix}unblockall`:
    await unblockallCommand(sock, chatId, message, senderIsSudo);
    commandExecuted = true;
    break;
              case userMessage.startsWith(`${prefix}ngl`):
    await nglCommand(sock, chatId, message, userMessage, settings);
    commandExecuted = true;
    break;
              case userMessage === `${prefix}pending` || 
     userMessage === `${prefix}pendingrequests` ||
     userMessage === `${prefix}joinrequests`:
    
    await pendingRequestsCommand(sock, chatId, message);
    commandExecuted = true;
    break;

case userMessage === `${prefix}approveall`:
    await approveAllCommand(sock, chatId, message);
    commandExecuted = true;
    break;

case userMessage === `${prefix}rejectall`:
    await rejectAllCommand(sock, chatId, message);
    commandExecuted = true;
    break;
                case userMessage === `${prefix}helpers`:
    await developerCommand(sock, chatId, message);
    commandExecuted = true;
    break;
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                //---some owner commands
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage === `${prefix}unmute`:
                await unmuteCommand(sock, chatId, senderId);
                break;
            case userMessage.startsWith(`${prefix}ban`):
                await banCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}unban`):
                await unbanCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}help` ||                            userMessage === `${prefix}menu` ||
                  userMessage === `${prefix}list`:
                await helpCommand(sock, chatId, message, global.channelLink);
                commandExecuted = true;
                break;
            case userMessage === `${prefix}sticker` || 
                 userMessage === `${prefix}s`:
                await stickerCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith(`${prefix}warnings`):
                const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warningsCommand(sock, chatId, mentionedJidListWarnings);
                break;
            case userMessage.startsWith(`${prefix}warn`):
                const mentionedJidListWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await warnCommand(sock, chatId, senderId, mentionedJidListWarn, message);
                break;
            case userMessage.startsWith(`${prefix}delete`) || userMessage.startsWith(`${prefix}del`):
                await deleteCommand(sock, chatId, message, senderId);
                break;
            case userMessage === `${prefix}closegc`:
                await closeGCCommand(sock, chatId, message, senderId);
                break;
            case userMessage === `${prefix}opengc`:
                await openGCCommand(sock, chatId, message, senderId);
                break;
            case userMessage === `${prefix}killall`:
                await killAllCommand(sock, chatId, message, senderId);
                break;
            case userMessage === `${prefix}link`:
                await linkCommand(sock, chatId, message, senderId);
                break;
            case userMessage.startsWith(`${prefix}antisticker`):
                await handleAntiStickerCommand(sock, chatId, message, senderId);
                break;
            case userMessage.startsWith(`${prefix}antiphoto`):
                await handleAntiPhotoCommand(sock, chatId, message, senderId);
                break;

            case userMessage.startsWith(`${prefix}antigroupmention`):
                await handleAntiGroupMentionCommand(sock, chatId, message, senderId);
                break;

            case userMessage.startsWith(`${prefix}tts`):
                const text = userMessage.slice(4).trim();
                await ttsCommand(sock, chatId, text, message);
                break;
            case userMessage.startsWith(`${prefix}attp`):
                await attpCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}apk`):
                await apkCommand(sock, chatId, message);
                break;
              case userMessage.startsWith(`${prefix}img2link`) || 
     userMessage.startsWith(`${prefix}imagelink`) || 
     userMessage.startsWith(`${prefix}imgtourl`):
    await img2linkCommand(sock, chatId, senderId, message, userMessage);
    break;
              case userMessage.startsWith(`${prefix}yts`) || 
     userMessage.startsWith(`${prefix}ytsearch`):
    await ytsCommand(sock, chatId, senderId, message, userMessage);
    break;
              case userMessage.startsWith(`${prefix}join`):
    await joinCommand(sock, chatId, senderId, message, userMessage);
    break;
              case userMessage.startsWith(`${prefix}antiedit`):
    const antieditMatch = userMessage.slice(9).trim();
    await handleAntieditCommand(sock, chatId, message, antieditMatch);
    break;
              case userMessage === `${prefix}removeall`:
    await kickAllCommand(sock, chatId, message, senderIsSudo);
    commandExecuted = true;
    break;

            case userMessage.startsWith(`${prefix}antidemote`):
                if (!isGroup) return;
                await antidemoteCommand(sock, chatId, message);
                commandExecuted = true;
                break;

            case userMessage.startsWith(`${prefix}antipromote`):
                if (!isGroup) return;
                await antipromoteCommand(sock, chatId, message);
                commandExecuted = true;
                break;
/*━━━━━━━━━━━━━━━━━━━━*/  
 //Obfuscation commands
/*━━━━━━━━━━━━━━━━━━━━*/
case userMessage.startsWith(`${prefix}obfuscate`):
case userMessage.startsWith(`${prefix}obfs`):
    await obfuscateCommand(sock, chatId, message, userMessage);
    commandExecuted = true;
    break;

case userMessage.startsWith(`${prefix}obfuscate2`):
case userMessage.startsWith(`${prefix}obfs2`):
case userMessage.startsWith(`${prefix}obfuscateadv`):
    await obfuscateAdvancedCommand(sock, chatId, message, userMessage);
    commandExecuted = true;
    break;

case userMessage.startsWith(`${prefix}quickobfs`):
case userMessage.startsWith(`${prefix}qobfs`):
    await quickObfuscateCommand(sock, chatId, message, userMessage);
    commandExecuted = true;
    break;
                
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // settings-------
                /*━━━━━━━━━━━━━━━━━━━━*/

            case userMessage === `${prefix}settings`:
            case userMessage === `${prefix}getsettings`:
                await settingsCommand(sock, chatId, message, senderIsSudo);
                break;
            case userMessage.startsWith(`${prefix}anticall`):
                if (!message.key.fromMe && !senderIsSudo) {
                    await sock.sendMessage(chatId, { text: 'Only owner/sudo can use anticall.' }, { quoted: message });
                    break;
                }
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await anticallCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith(`${prefix}pmblocker`):
                if (!message.key.fromMe && !senderIsSudo) {
                    await sock.sendMessage(chatId, { text: 'Only owner/sudo can use pmblocker.' }, { quoted: message });
                    commandExecuted = true;
                    break;
                }
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    await pmblockerCommand(sock, chatId, message, args);
                }
                commandExecuted = true;
                break;
            case userMessage === `${prefix}owner`:
                await ownerCommand(sock, chatId);
                break;
                /*━━━━━━━━━━━━━━━━━━━━*/
               // Pairing command - Available to everyone
               /*━━━━━━━━━━━━━━━━━━━━*/
case userMessage.startsWith(`${prefix}pair`):
    const pairArgs = rawText.slice(6).trim(); // Remove ".pair " from the message
    await pairCommand(sock, chatId, message, pairArgs);
    commandExecuted = true;
    break;
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // Advanced settings commands
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage.startsWith(`${prefix}setbotimage`):
                await setbotimageCommand(sock, chatId, senderId, message, userMessage);
                break;
            case userMessage.startsWith(`${prefix}setbotname`):
                await setbotnameCommand(sock, chatId, senderId, message, userMessage);
                break;
            case userMessage.startsWith(`${prefix}setownername`):
                await setownernameCommand(sock, chatId, senderId, message, userMessage);
                break;
            case userMessage === `${prefix}setvar`:
            case userMessage === `${prefix}cmdlist`:
                await setvarCommand(sock, chatId, senderId, message, userMessage, prefix);
                break;
            case userMessage.startsWith(`${prefix}mode`):
                await modeCommand(sock, chatId, senderId, message, userMessage, prefix);
                break;
            case userMessage.startsWith(`${prefix}autotyping`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'AUTOTYPING', 'Auto typing', prefix, 'autotyping');
                break;
            case userMessage.startsWith(`${prefix}alwaysonline`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'ALWAYSONLINE', 'Always online', prefix, 'alwaysonline');
                break;
            case userMessage.startsWith(`${prefix}autorecording`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'AUTORECORDING', 'Auto recording', prefix, 'autorecording');
                break;
            case userMessage.startsWith(`${prefix}autostatusreact`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'AUTOSTATUSREACT', 'Auto status react', prefix, 'autostatusreact');
                break;
            case userMessage.startsWith(`${prefix}antibad`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'ANTIBADWORD', 'Anti bad word', prefix, 'antibad');
                break;
            case userMessage.startsWith(`${prefix}autosticker`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'AUTOSTICKER', 'Auto sticker', prefix, 'autosticker');
                break;
            case userMessage.startsWith(`${prefix}autoreply`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'AUTOREPLY', 'Auto reply', prefix, 'autoreply');
                break;
            case userMessage.startsWith(`${prefix}autoreact`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'AUTOREACT', 'Auto react', prefix, 'autoreact');
                break;
            case userMessage.startsWith(`${prefix}autostatusreply`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'AUTOSTATUSREPLY', 'Status reply', prefix, 'autostatusreply');
                break;
            case userMessage.startsWith(`${prefix}antibot`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'ANTIBOT', 'Anti bot', prefix, 'antibot');
                break;
            case userMessage.startsWith(`${prefix}heartreact`):
                await toggleSettingCommand(sock, chatId, senderId, message, 'HEARTREACT', 'Heart react', prefix, 'heartreact');
                break;

              // autostaus
            case userMessage.startsWith(`${prefix}statuscapture`):
                await statusCaptureInfoCommand(sock, chatId, message);
                break;
              case userMessage.startsWith(`${prefix}img`) || 
     userMessage.startsWith(`${prefix}image`) || 
     userMessage.startsWith(`${prefix}googleimage`) ||
     userMessage.startsWith(`${prefix}searchimg`):
    await imgCommand(sock, chatId, senderId, message, userMessage);
    break;
                     
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // GroupCommands------
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage === `${prefix}tagall`:
                if (isSenderAdmin || message.key.fromMe) {
                    await tagAllCommand(sock, chatId, senderId, message);
                } else {
                    await sock.sendMessage(chatId, { text: 'Sorry, only group admins can use the .tagall command.', ...channelInfo }, { quoted: message });
                }
                break;
            case userMessage === `${prefix}tagnotadmin`:
                await tagNotAdminCommand(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith(`${prefix}hidetag`):
                {
                    const messageText = rawText.slice(8).trim();
                    const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                    await hideTagCommand(sock, chatId, senderId, messageText, replyMessage, message);
                }
                break;
            case userMessage.startsWith(`${prefix}tag`):
                const messageText = rawText.slice(4).trim();  // use rawText here, not userMessage
                const replyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                await tagCommand(sock, chatId, senderId, messageText, replyMessage, message);
                break;
            case userMessage.startsWith(`${prefix}antilink`):
                if (!isGroup) {
                    await sock.sendMessage(chatId, {
                        text: 'This command can only be used in groups.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, {
                        text: 'Please make the bot an admin first.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                await handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                break;
            case userMessage.startsWith(`${prefix}antitag`):
                if (!isGroup) {
                    await sock.sendMessage(chatId, {
                        text: 'This command can only be used in groups.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, {
                        text: 'Please make the bot an admin first.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
                await handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message);
                break;
              case userMessage.startsWith(`${prefix}opentime`):
    await opentimeCommand(sock, chatId, senderId, message, userMessage);
    break;

case userMessage.startsWith(`${prefix}closetime`):
    await closetimeCommand(sock, chatId, senderId, message, userMessage);
    break;

case userMessage.startsWith(`${prefix}tagadmin`) || 
     userMessage.startsWith(`${prefix}tagadmins`):
    await tagadminCommand(sock, chatId, senderId, message, userMessage);
    break;
              case userMessage === `${prefix}online`:
    if (!isGroup) {
        await sock.sendMessage(chatId, { 
            text: 'This command can only be used in groups!', 
            ...channelInfo 
        }, { quoted: message });
        return;
    }
    await onlineCommand(sock, chatId, message);
    commandExecuted = true;
    break;
   case userMessage === `${prefix}vcf`:
    if (!isGroup) {
        await sock.sendMessage(chatId, { 
            text: '❌ This command can only be used in groups!' 
        }, { quoted: message });
        return;
    }
    
    // Use existing isSenderAdmin variable (no new adminStatus declaration)
    if (!isSenderAdmin && !message.key.fromMe && !senderIsSudo) {
        // But we need to check if isSenderAdmin was already set
        // If not, check admin status now
        const vcfAdminCheck = await isAdmin(sock, chatId, senderId);
        if (!vcfAdminCheck.isSenderAdmin && !message.key.fromMe && !senderIsSudo) {
            await sock.sendMessage(chatId, { 
                text: '❌ Only group admins can export contacts!' 
            }, { quoted: message });
            return;
        }
    }
    
    await vcfCommand(sock, chatId, message);
    commandExecuted = true;
    break;
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // meme Commands and etc
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage === `${prefix}meme`:
                await memeCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}joke`:
                await jokeCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}quote`:
                await quoteCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}fact`:
                await factCommand(sock, chatId, message, message);
                break;
            case userMessage.startsWith(`${prefix}weather`):
                const city = userMessage.slice(9).trim();
                if (city) {
                    await weatherCommand(sock, chatId, message, city);
                } else {
                    await sock.sendMessage(chatId, { text: `Please specify a city, e.g., ${prefix}weather London`, ...channelInfo }, { quoted: message });
                }
                break;
            case userMessage === `${prefix}news`:
                await newsCommand(sock, chatId);
                break;
            case userMessage.startsWith(`${prefix}ttt`) || userMessage.startsWith(`${prefix}tictactoe`):
                const tttText = userMessage.split(' ').slice(1).join(' ');
                await tictactoeCommand(sock, chatId, senderId, tttText);
                break;
            case userMessage.startsWith(`${prefix}move`):
                const position = parseInt(userMessage.split(' ')[1]);
                if (isNaN(position)) {
                    await sock.sendMessage(chatId, { text: 'Please provide a valid position number for Tic-Tac-Toe move.', ...channelInfo }, { quoted: message });
                } else {
                    tictactoeMove(sock, chatId, senderId, position);
                }
                break;
/*━━━━━━━━━━━━━━━━━━━━*/
// Online tracking combined with topmembers
/*━━━━━━━━━━━━━━━━━━━━*/
case userMessage === `${prefix}online`:
case userMessage === `${prefix}listonline`:
case userMessage === `${prefix}offline`:
case userMessage === `${prefix}listoffline`:
case userMessage === `${prefix}topmembers`:
    if (!isGroup) {
        await sock.sendMessage(chatId, { 
            text: '❌ Group only command!' 
        }, { quoted: message });
        return;
    }
    
    if (userMessage === `${prefix}online` || userMessage === `${prefix}listonline`) {
        await listOnlineCommand(sock, chatId, isGroup);
    } else if (userMessage === `${prefix}offline` || userMessage === `${prefix}listoffline`) {
        await listOfflineCommand(sock, chatId, isGroup);
    } else {
        topMembers(sock, chatId, isGroup);
    }
    
    commandExecuted = true;
    break;
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // game commands
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage.startsWith(`${prefix}hangman`):
                startHangman(sock, chatId);
                break;
            case userMessage.startsWith(`${prefix}guess`):
                const guessedLetter = userMessage.split(' ')[1];
                if (guessedLetter) {
                    guessLetter(sock, chatId, guessedLetter);
                } else {
                    sock.sendMessage(chatId, { text: `Please guess a letter using ${prefix}guess <letter>`, ...channelInfo }, { quoted: message });
                }
                break;
            case userMessage.startsWith(`${prefix}trivia`):
                startTrivia(sock, chatId);
                break;
            case userMessage.startsWith(`${prefix}answer`):
                const answer = userMessage.split(' ').slice(1).join(' ');
                if (answer) {
                    answerTrivia(sock, chatId, answer);
                } else {
                    sock.sendMessage(chatId, { text: `Please provide an answer using ${prefix}answer <answer>`, ...channelInfo }, { quoted: message });
                }
                break;
            case userMessage.startsWith(`${prefix}compliment`):
                await complimentCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}insult`):
                await insultCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}8ball`):
                const question = userMessage.split(' ').slice(1).join(' ');
                await eightBallCommand(sock, chatId, question);
                break;
            case userMessage.startsWith(`${prefix}lyrics`):
                const songTitle = userMessage.split(' ').slice(1).join(' ');
                await lyricsCommand(sock, chatId, songTitle, message);
                break;
              // Add this case in your command switch statement
            case userMessage.startsWith(`${prefix}setownernumber`):
                await handleSetOwnerNumberCommand(sock, chatId, senderId, message, userMessage, prefix);
                break;
            case userMessage.startsWith(`${prefix}gitclone`):
                if (!message.key.fromMe && !senderIsSudo) {
                    await sock.sendMessage(chatId, { text: '❌ Only owner/sudo can use gitclone.' }, { quoted: message });
                    break;
                }
                await gitcloneCommand(sock, chatId, message);
                break;
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // Game commands
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage.startsWith(`${prefix}simp`):
                const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await simpCommand(sock, chatId, quotedMsg, mentionedJid, senderId);
                break;
            case userMessage.startsWith(`${prefix}stupid`) || userMessage.startsWith(`${prefix}itssostupid`) || userMessage.startsWith(`${prefix}iss`):
                const stupidQuotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const stupidMentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                const stupidArgs = userMessage.split(' ').slice(1);
                await stupidCommand(sock, chatId, stupidQuotedMsg, stupidMentionedJid, senderId, stupidArgs);
                break;
            case userMessage === `${prefix}dare`:
                await dareCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}truth`:
                await truthCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}clear`:
                if (isGroup) await clearCommand(sock, chatId);
                break;
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // GroupCommand
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage.startsWith(`${prefix}promote`):
                const mentionedJidListPromote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await promoteCommand(sock, chatId, mentionedJidListPromote, message);
                break;
            case userMessage.startsWith(`${prefix}demote`):
                const mentionedJidListDemote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                await demoteCommand(sock, chatId, mentionedJidListDemote, message);
                break;
            case userMessage === `${prefix}ping` ||
                  userMessage === `${prefix}p`:
                await pingCommand(sock, chatId, message);
                break;

            case userMessage.startsWith(`${prefix}sudo`):
            case userMessage.startsWith(`${prefix}addsudo`):
            case userMessage.startsWith(`${prefix}delsudo`):
            case userMessage.startsWith(`${prefix}removesudo`):
            case userMessage.startsWith(`${prefix}sudolist`):
            case userMessage.startsWith(`${prefix}getsudo`):
                await sudoCommand(sock, chatId, message);
                break;
           
           case userMessage.startsWith(`${prefix}bible`):
    const query = rawText.slice(7).trim(); // Remove ".bible " from the message
    await bibleCommand(sock, chatId, message, query);
    break;
                
            case userMessage === `${prefix}quran`:
                await quranCommand(sock, chatid, message);
                break;
           
            case userMessage === `${prefix}getpp`:
               await getppCommand(sock, chatId, message, senderIsSudo);
              break;

            case userMessage.startsWith(`${prefix}setmenuimage`):
               await setMenuImageCommand(sock, chatId, senderId, message, userMessage);
              break;

            case userMessage === `${prefix}uptime`:
                await uptimeCommand(sock, chatId, message);
                break;
                
            case userMessage === `${prefix}tutorial`:
                await tutorialCommand(sock, chatId, message);
                break
                
            case userMessage === `${prefix}alive`:
                await aliveCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}mention`):
                {
                    const args = userMessage.split(' ').slice(1).join(' ');
                    const isOwner = message.key.fromMe || senderIsSudo;
                    await mentionToggleCommand(sock, chatId, message, args, isOwner);
                }
                break;
            case userMessage === `${prefix}setmention`:
                {
                    const isOwner = message.key.fromMe || senderIsSudo;
                    await setMentionCommand(sock, chatId, message, isOwner);
                }
                break;
            case userMessage.startsWith(`${prefix}blur`):
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                await blurCommand(sock, chatId, message, quotedMessage);
                break;
            // Welcome commands
case userMessage.startsWith(`${prefix}welcome`):
    await welcomeCommand(sock, chatId, message);
    commandExecuted = true;
    break;

case userMessage.startsWith(`${prefix}setwelcome`):
    await setwelcomeCommand(sock, chatId, senderId, message, userMessage);
    commandExecuted = true;
    break;

case userMessage === `${prefix}showwelcome`:
    await showsettingsCommand(sock, chatId, message, userMessage);
    commandExecuted = true;
    break;

case userMessage === `${prefix}resetwelcome`:
    await resetCommand(sock, chatId, senderId, message, userMessage);
    commandExecuted = true;
    break;

// Goodbye commands
case userMessage.startsWith(`${prefix}goodbye`):
    await goodbyeCommand(sock, chatId, message);
    commandExecuted = true;
    break;

case userMessage.startsWith(`${prefix}setgoodbye`):
    await setgoodbyeCommand(sock, chatId, senderId, message, userMessage);
    commandExecuted = true;
    break;

case userMessage === `${prefix}showgoodbye`:
    await showsettingsCommand(sock, chatId, message, userMessage);
    commandExecuted = true;
    break;

case userMessage === `${prefix}resetgoodbye`:
    await resetCommand(sock, chatId, senderId, message, userMessage);
    commandExecuted = true;
    break;
                
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // github
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage === `${prefix}git`:
            case userMessage === `${prefix}github`:
            case userMessage === `${prefix}sc`:
            case userMessage === `${prefix}script`:
            case userMessage === `${prefix}repo`:
                await githubCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}antibadword`):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.', ...channelInfo }, { quoted: message });
                    return;
                }

                const adminStatus = await isAdmin(sock, chatId, senderId);
                isSenderAdmin = adminStatus.isSenderAdmin;
                isBotAdmin = adminStatus.isBotAdmin;

                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: '*Bot must be admin to use this feature*', ...channelInfo }, { quoted: message });
                    return;
                }

                await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
                break;
;
            
           case userMessage.startsWith(`${prefix}take`):
                const takeArgs = rawText.slice(5).trim().split(' ');
                await takeCommand(sock, chatId, message, takeArgs);
                break;
            case userMessage === `${prefix}flirt`:
                await flirtCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}character`):
                await characterCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}waste`):
                await wastedCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}ship`:
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo }, { quoted: message });
                    return;
                }
                await shipCommand(sock, chatId, message);
                break;
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                //Some groupCommands
                /*━━━━━━━━━━━━━━━━━━━━*/
                
                
            case userMessage === `${prefix}groupinfo` || 
                 userMessage === `${prefix}infogroup` || 
                 userMessage === '.infogrupo':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo }, { quoted: message });
                    return;
                }
                await groupInfoCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}reset` || userMessage === `${prefix}revoke`:
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo }, { quoted: message });
                    return;
                }
                await resetlinkCommand(sock, chatId, senderId);
                break;
            case userMessage === `${prefix}admin` ||
                 userMessage === `${prefix}listadmin`:
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo }, { quoted: message });
                    return;
                }
                await staffCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}tourl`) || 
                 userMessage.startsWith(`${prefix}url`):
                await urlCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}emojimix`) ||
                 userMessage.startsWith(`${prefix}emix`):
                await emojimixCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}tg`) ||                                  userMessage.startsWith(`${prefix}tgsticker`):
                await stickerTelegramCommand(sock, chatId, message);
                break;
                
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // OtherCommands
                /*━━━━━━━━━━━━━━━━━━━━*/

            case userMessage === `${prefix}vv`:
                await viewOnceCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}clearsession` || userMessage === '.clearsesi':
                await clearSessionCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}autostatus`):
                const autoStatusArgs = userMessage.split(' ').slice(1);
                await autoStatusCommand(sock, chatId, message, autoStatusArgs);
                break;
            case userMessage.startsWith(`${prefix}simp`):
                await simpCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}metallic`):
                await textmakerCommand(sock, chatId, message, userMessage, 'metallic');
                break;
            case userMessage.startsWith(`${prefix}ice`):
                await textmakerCommand(sock, chatId, message, userMessage, 'ice');
                break;
            case userMessage.startsWith(`${prefix}snow`):
                await textmakerCommand(sock, chatId, message, userMessage, 'snow');
                break;
            case userMessage.startsWith(`${prefix}impressive`):
                await textmakerCommand(sock, chatId, message, userMessage, 'impressive');
                break;
            case userMessage.startsWith(`${prefix}matrix`):
                await textmakerCommand(sock, chatId, message, userMessage, 'matrix');
                break;
            case userMessage.startsWith(`${prefix}light`):
                await textmakerCommand(sock, chatId, message, userMessage, 'light');
                break;
            case userMessage.startsWith(`${prefix}neon`):
                await textmakerCommand(sock, chatId, message, userMessage, 'neon');
                break;
            case userMessage.startsWith(`${prefix}devil`):
                await textmakerCommand(sock, chatId, message, userMessage, 'devil');
                break;
            case userMessage.startsWith(`${prefix}purple`):
                await textmakerCommand(sock, chatId, message, userMessage, 'purple');
                break;
            case userMessage.startsWith(`${prefix}thunder`):
                await textmakerCommand(sock, chatId, message, userMessage, 'thunder');
                break;
            case userMessage.startsWith(`${prefix}leaves`):
                await textmakerCommand(sock, chatId, message, userMessage, 'leaves');
                break;
            case userMessage.startsWith(`${prefix}1917`):
                await textmakerCommand(sock, chatId, message, userMessage, '1917');
                break;
            case userMessage.startsWith(`${prefix}arena`):
                await textmakerCommand(sock, chatId, message, userMessage, 'arena');
                break;
            case userMessage.startsWith(`${prefix}hacker`):
                await textmakerCommand(sock, chatId, message, userMessage, 'hacker');
                break;
            case userMessage.startsWith(`${prefix}sand`):
                await textmakerCommand(sock, chatId, message, userMessage, 'sand');
                break;
            case userMessage.startsWith(`${prefix}blakpink`):
                await textmakerCommand(sock, chatId, message, userMessage, 'blackpink');
                break;
            case userMessage.startsWith(`${prefix}glitch`):
                await textmakerCommand(sock, chatId, message, userMessage, 'glitch');
                break;
            case userMessage.startsWith(`${prefix}fire`):
                await textmakerCommand(sock, chatId, message, userMessage, 'fire');
                break;
            case userMessage.startsWith(`${prefix}antidelete`):
                const antideleteMatch = userMessage.slice(11).trim();
                await handleAntideleteCommand(sock, chatId, message, antideleteMatch);
                break;
            case userMessage === `${prefix}surrender`:
                // Handle surrender command for tictactoe game
                await handleTicTacToeMove(sock, chatId, senderId, 'surrender');
                break;
            case userMessage === `${prefix}cleartemp`:
                await clearTmpCommand(sock, chatId, message, senderIsSudo);
                break;
            case userMessage === `${prefix}setpp`:
                await setProfilePicture(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}setgdesc`):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupDescription(sock, chatId, senderId, text, message);
                }
                break;
            case userMessage.startsWith(`${prefix}setgname`):
                {
                    const text = rawText.slice(9).trim();
                    await setGroupName(sock, chatId, senderId, text, message);
                }
                break;
            case userMessage.startsWith(`${prefix}setgpp`):
                await setGroupPhoto(sock, chatId, senderId, message);
                break;
            case userMessage.startsWith(`${prefix}creategroup`) || userMessage.startsWith(`${prefix}newgroup`):
                {
                    const cmdLen = userMessage.startsWith(`${prefix}creategroup`) ? `${prefix}creategroup`.length : `${prefix}newgroup`.length;
                    const text = rawText.slice(cmdLen).trim();
                    await createGroupCommand(sock, chatId, senderId, message, text);
                }
                break;
            case userMessage.startsWith(`${prefix}instagram`) ||                          userMessage.startsWith(`${prefix}insta`) ||  (userMessage === `${prefix}ig` || userMessage.startsWith('.ig ')):
                await instagramCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}igs`):
                await igsCommand(sock, chatId, message, true);
                break;
            case userMessage.startsWith(`${prefix}igs`):
                await igsCommand(sock, chatId, message, false);
                break;            
                case userMessage.startsWith(`${prefix}fb`) || userMessage.startsWith(`${prefix}facebook`):
                await facebookCommand(sock, chatId, message);
                break;
 /*━━━━━━━━━━━━━━━━━━━━*/
 /*******--song&play command cases--
 /*━━━━━━━━━━━━━━━━━━━━*/             
            case userMessage.startsWith(`${prefix}play`):
                await playCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}spotify`): 
                await spotifyCommand(sock, chatId, message);
                break;

           case userMessage.startsWith(`${prefix}img`):
             await imgCommand(sock, chatId, message);
              break;
                
            case userMessage.startsWith(`${prefix}song`) ||                                userMessage.startsWith(`${prefix}mp3`):
                await songCommand(sock, chatId, message);
                break;
           
            case userMessage.startsWith(`${prefix}music`) ||                                userMessage.startsWith(`${prefix}mp3`):
                await musicCommand(sock, chatId, message);
                break;
    
            case userMessage.startsWith(`${prefix}video`):
                await videoCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}tiktok`) ||
                 userMessage.startsWith(`${prefix}tt`):
                await tiktokCommand(sock, chatId, message);
                break;
           case userMessage === `${prefix}name`:
                await shazamCommand(sock, chatId, message);
                break;
              case userMessage === `${prefix}find`:
                await shazamCommand(sock, chatId, message);
                break;
           case userMessage === `${prefix}shazam`:
                await shazamCommand(sock, chatId, message);
                break;
              case userMessage === `${prefix}save`:
                await saveStatusCommand(sock, chatId, message, senderIsSudo);
                break;
              case userMessage === `${prefix}autoreadreciepts`:
                await autoreadReceiptsCommand(sock, chatId, message, senderIsSudo);
                break;
              case userMessage.startsWith(`${prefix}fetch`):
                await fetchCommand(sock, chatId, message);
                break;
              case userMessage === `${prefix}online` || 
     userMessage === `${prefix}listonline` || 
     userMessage === `${prefix}onlinelist`:
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo }, { quoted: message });
        return;
    }
    await listonlineCommand(sock, chatId, message);
    commandExecuted = true;
    break;

   /*━━━━━━━━━━━━━━━━━━━━*/
// Feedback & Report Commands
/*━━━━━━━━━━━━━━━━━━━━*/
case userMessage.startsWith(`${prefix}reportbug`):
case userMessage.startsWith(`${prefix}bugreport`):
case userMessage.startsWith(`${prefix}report`):
    await reportBugCommand(sock, chatId, message, userMessage, settings);
    commandExecuted = true;
    break;
 /*━━━━━━━━━━━━━━━━━━━━*/
 /*********--ai&gemini cmd cases--
 /*━━━━━━━━━━━━━━━━━━━━*/               
            case userMessage.startsWith(`${prefix}gpt`):
                await aiCommand(sock, chatId, message, 'gpt');
                break;
            case userMessage.startsWith(`${prefix}gemini`):
                await aiCommand(sock, chatId, message, 'gemini');
                break;
            case userMessage.startsWith(`${prefix}mistral`):
                await aiCommand(sock, chatId, message, 'mistral');
                break;
            case userMessage.startsWith(`${prefix}deepseek`):
                await aiCommand(sock, chatId, message, 'deepseek');
                break;
            case userMessage.startsWith(`${prefix}cohere`):
                await aiCommand(sock, chatId, message, 'cohere');
                break;
            case userMessage.startsWith(`${prefix}claude`):
                await aiCommand(sock, chatId, message, 'claude');
                break;
            case userMessage.startsWith(`${prefix}venice`):
                await aiCommand(sock, chatId, message, 'venice');
                break;
            case userMessage.startsWith(`${prefix}groq`):
                await aiCommand(sock, chatId, message, 'groq');
                break;
            case userMessage.startsWith(`${prefix}translate`) || 
                 userMessage.startsWith(`${prefix}trt`):
                const commandLength = userMessage.startsWith('.translate') ? 10 : 4;
                await handleTranslateCommand(sock, chatId, message, userMessage.slice(commandLength));
                return;
            case userMessage.startsWith(`${prefix}ss`) ||
                 userMessage.startsWith(`${prefix}ssweb`) || 
                 userMessage.startsWith(`${prefix}screenshot`):
                const ssCommandLength = userMessage.startsWith('.screenshot') ? 11 : (userMessage.startsWith(`${prefix}ssweb`) ? 6 : 3);
                await handleSsCommand(sock, chatId, message, userMessage.slice(ssCommandLength).trim());
                break;
            case userMessage.startsWith(`${prefix}areact`) || 
                 userMessage.startsWith(`${prefix}autoreact`) ||                           userMessage.startsWith(`${prefix}autoreaction`):
                const isOwnerOrSudo = message.key.fromMe || senderIsSudo;
                await handleAreactCommand(sock, chatId, message, isOwnerOrSudo);
                break;
            case userMessage === `${prefix}goodnight` || 
                 userMessage === '.lovenight' || 
                 userMessage === '.gn':
                await goodnightCommand(sock, chatId, message);
                break;
            case userMessage === '.shayari' || 
                 userMessage === '.shayri':
                await shayariCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}roseday`:
                await rosedayCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}imagine`) || 
                 userMessage.startsWith(`${prefix}flux`) || 
                 userMessage.startsWith(`${prefix}dalle`): 
                 await imagineCommand(sock, chatId, message);
                break;
            case userMessage === `${prefix}jid`:
             await groupJidCommand(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}chjid`):
                await channelJidCommand(sock, chatId, message, rawText);
                break;
            case userMessage.startsWith(`${prefix}autotyping`):
                await autotypingCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith(`${prefix}autoread`):
                await autoreadCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith(`${prefix}heat`):
                await handleHeart(sock, chatId, message);
                break;
            case userMessage.startsWith(`${prefix}heart`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['horny', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith(`${prefix}circle`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['circle', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith(`${prefix})gbtq`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['lgbtq', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith(`${prefix}lolice`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['lolice', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith(`${prefix}simpcard`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['simpcard', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith(`${prefix}misc`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['misc', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith('.its-so-stupid'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['its-so-stupid', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith(`${prefix}namecard`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['namecard', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;

            case userMessage.startsWith('.oogway2'):
            case userMessage.startsWith('.oogway'):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const sub = userMessage.startsWith('.oogway2') ? 'oogway2' : 'oogway';
                    const args = [sub, ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith(`${prefix}tweet`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['tweet', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
            case userMessage.startsWith(`${prefix}ytcomment`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = ['youtube-comment', ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                
                break;
                // Add this case to your switch statement:
case userMessage.startsWith(`${prefix}getplugin`):
    await getpluginCommand(sock, chatId, message, prefix, senderIsSudo);
    commandExecuted = true;
    break;
                
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                //Photo EffectsCommand
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage.startsWith(`${prefix}comrade`):
            case userMessage.startsWith(`${prefix}gay`):
            case userMessage.startsWith(`${prefix}glass`):
            case userMessage.startsWith(`${prefix}jail`):
            case userMessage.startsWith(`${prefix}passed`):
            case userMessage.startsWith(`${prefix}triggered`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const sub = userMessage.slice(1).split(/\s+/)[0];
                    const args = [sub, ...parts.slice(1)];
                    await miscCommand(sock, chatId, message, args);
                }
                break;
                
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // Animu commands
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage.startsWith(`${prefix}animu`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    const args = parts.slice(1);
                    await animeCommand(sock, chatId, message, args);
                }
                break;
            // animu aliases
            case userMessage.startsWith(`${prefix}nom`):
            case userMessage.startsWith(`${prefix}poke`):
            case userMessage.startsWith(`${prefix}cry`):
            case userMessage.startsWith(`${prefix}hug`):
            case userMessage.startsWith(`${prefix}pat`):
            case userMessage.startsWith(`${prefix}kiss`):
            case userMessage.startsWith(`${prefix}wink`):
            case userMessage.startsWith(`${prefix}facepalm`):
            case userMessage.startsWith(`${prefix}face-palm`): 
            case userMessage.startsWith(`${prefix}quote`):
            case userMessage.startsWith(`${prefix}loli`):
                {
                    const parts = userMessage.trim().split(/\s+/);
                    let sub = parts[0].slice(1);
                    if (sub === 'facepalm') sub = 'face-palm';
                    if (sub === 'quote' || sub === 'animuquote') sub = 'quote';
                    await animeCommand(sock, chatId, message, [sub]);
                }
                break;
            case userMessage === `${prefix}crop`:
                await stickercropCommand(sock, chatId, message);
                commandExecuted = true;
                break;
            case userMessage.startsWith(`${prefix}pies`):
                {
                    const parts = rawText.trim().split(/\s+/);
                    const args = parts.slice(1);
                    await piesCommand(sock, chatId, message, args);
                    commandExecuted = true;
                }
                break;
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                //countries
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage === '.china':
                await piesAlias(sock, chatId, message, 'china');
                commandExecuted = true;
                break;
            case userMessage === '.indonesia':
                await piesAlias(sock, chatId, message, 'indonesia');
                commandExecuted = true;
                break;
            case userMessage === '.japan':
                await piesAlias(sock, chatId, message, 'japan');
                commandExecuted = true;
                break;
            case userMessage === '.korea':
                await piesAlias(sock, chatId, message, 'korea');
                commandExecuted = true;
                break;
            case userMessage === '.hijab':
                await piesAlias(sock, chatId, message, 'hijab');
                commandExecuted = true;
                break;
                
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // RemoveBackgroundCommand
                /*━━━━━━━━━━━━━━━━━━━━*/
            case userMessage.startsWith(`${prefix}restart`):
            case userMessage.startsWith(`${prefix}update`):
            case userMessage.startsWith(`${prefix}reboot`):
                {
                    const parts = rawText.trim().split(/\s+/);
                    const zipArg = parts[1] && parts[1].startsWith('http') ? parts[1] : '';
                    await updateCommand(sock, chatId, message, senderIsSudo, zipArg);
                }
                commandExecuted = true;
                break;
            case userMessage.startsWith(`${prefix}removebg`) || 
                 userMessage.startsWith(`${prefix}rmbg`) || 
                 userMessage.startsWith(`${prefix}nobg`):
                await removebgCommand.exec(sock, message, userMessage.split(' ').slice(1));
                break;
            case userMessage.startsWith(`${prefix}remini`) ||
                 userMessage.startsWith(`${prefix}enhance`) || 
                 userMessage.startsWith(`${prefix}remin`):
                await reminiCommand(sock, chatId, message, userMessage.split(' ').slice(1));
                break;
            case userMessage.startsWith(`${prefix}sora`):
                await soraCommand(sock, chatId, message);
                break;
                
                
                
                /*━━━━━━━━━━━━━━━━━━━━*/
                // Group default Commands
                /*━━━━━━━━━━━━━━━━━━━━*/
                
                
            default:
                if (isGroup) {
                    // In groups, only handle tag and mention detection
                    await handleTagDetection(sock, chatId, message, senderId);
                    await handleMentionDetection(sock, chatId, message);
                } else {
                    
                }
                commandExecuted = false;
                break;
        }

        // If a command was executed, show typing status after command execution
        if (commandExecuted !== false) {
            // Command was executed, now show typing status after command execution
            await showTypingAfterCommand(sock, chatId);
        }

        async function channelJidCommand(sock, chatId, message, rawText) {
            const jid = message.key.remoteJid;
            const args = (rawText || '').replace(/^\.chjid\s*/i, '').trim();

            if (jid.endsWith('@newsletter')) {
                return await sock.sendMessage(chatId, {
                    text: `✅ *Channel JID:*\n\n${jid}`
                }, { quoted: message });
            }

            if (args) {
                const urlMatch = args.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/);
                if (urlMatch) {
                    try {
                        const inviteCode = urlMatch[1];
                        const metadata = await sock.newsletterMetadata('invite', inviteCode);
                        if (metadata && metadata.id) {
                            return await sock.sendMessage(chatId, {
                                text: `✅ *Channel JID:*\n\n${metadata.id}`
                            }, { quoted: message });
                        }
                    } catch (e) {
                        return await sock.sendMessage(chatId, {
                            text: `❌ Could not fetch channel info.\n\n*Error:* ${e.message || 'Unknown error'}`
                        }, { quoted: message });
                    }
                }
                return await sock.sendMessage(chatId, {
                    text: '❌ Invalid channel URL. Please provide a valid WhatsApp channel link.\n\n*Usage:* `.chjid https://whatsapp.com/channel/xxxxx`'
                }, { quoted: message });
            }

            await sock.sendMessage(chatId, {
                text: '📝 *CHJID USAGE*\n\nUse this command inside a channel, or provide a channel URL:\n`.chjid https://whatsapp.com/channel/xxxxx`'
            }, { quoted: message });
        }

        // Function to handle .groupjid command
        async function groupJidCommand(sock, chatId, message) {
            const groupJid = message.key.remoteJid;

            if (!groupJid.endsWith('@g.us')) {
                return await sock.sendMessage(chatId, {
                    text: "❌ This command can only be used in a group."
                });
            }

            await sock.sendMessage(chatId, {
                text: `✅ Group JID: ${groupJid}`
            }, {
                quoted: message
            });
        }
    } catch (error) {
        try {
            const chatId = typeof message !== 'undefined' ? message?.key?.remoteJid : undefined;
            console.error('❌ Error in message handler:', error);
            
            if (chatId && typeof sock !== 'undefined') {
                let errorMessage = error.message || 'Unknown error';
                if (errorMessage.includes('Cannot find module')) {
                    errorMessage = `Missing command file: ${errorMessage.split('\'')[1]}`;
                }
                const cmdText = typeof userMessage !== 'undefined' ? userMessage.split(' ')[0] : 'unknown';

                await sock.sendMessage(chatId, {
                    text: `*❌ 𝙴𝚁𝚁𝙾𝚁 𝙳𝙴𝚃𝙴𝙲𝚃𝙴𝙳*\n\n*Command:* ${cmdText}\n*Error:* ${errorMessage}\n\n_Please report this to the developer._`,
                    ...channelInfo
                }, { quoted: message });
            }
        } catch (innerErr) {
            console.error('❌ Error in error handler:', innerErr.message);
        }
    }
}


async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;

        // Check if it's a group
        if (!id.endsWith('@g.us')) return;

        let isPublic = true;
        try {
            const currentMode = getConfig('MODE', settings.commandMode || 'public');
            isPublic = currentMode === 'public' || currentMode === 'groups';
        } catch (e) {
            try {
                const modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
                if (typeof modeData.isPublic === 'boolean') isPublic = modeData.isPublic;
            } catch (_) {}
        }

        // Handle promotion events
        if (action === 'promote') {
            await handleAntiPromoteDemote(sock, update);
            if (!isPublic) return;
            await handlePromotionEvent(sock, id, participants, author);
            return;
        }

        // Handle demotion events
        if (action === 'demote') {
            await handleAntiPromoteDemote(sock, update);
            if (!isPublic) return;
            await handleDemotionEvent(sock, id, participants, author);
            return;
        }

        // Handle join events
        if (action === 'add') {
            await handleJoinEvent(sock, id, participants);
        }

        // Handle leave events
        if (action === 'remove') {
            await handleLeaveEvent(sock, id, participants);
        }
    } catch (error) {
        console.error('Error in handleGroupParticipantUpdate:', error);
    }
}

// Instead, export the handlers along with handleMessages
module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus: async (sock, status) => {
        await handleStatusUpdate(sock, status);
    }
};
