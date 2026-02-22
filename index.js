/**
 * june x Bot - A WhatsApp Bot
 * Tennor-modz 
 * © 2025 supreme
 * * NOTE: This is the combined codebase. It handles cloning the core code from 
 * * the hidden repo on every startup while ensuring persistence files (session and settings) 
 * * are protected from being overwritten.
 */

// --- Environment Setup ---
const config = require('./config');
/*━━━━━━━━━━━━━━━━━━━━*/
require('dotenv').config(); // CRITICAL: Load .env variables first!

// --- Heroku Compatibility Layer (only activates on Heroku) ---
const { configureHerokuEnvironment, debouncedSave: herokuDebouncedSave, isHeroku } = require('./lib/heroku');
configureHerokuEnvironment();
// *******************************************************************
// *** CRITICAL CHANGE: REQUIRED FILES (settings.js, main, etc.) ***
// *** HAVE BEEN REMOVED FROM HERE AND MOVED BELOW THE CLONER RUN. ***
// *******************************************************************

const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const axios = require('axios')
const os = require('os')
const PhoneNumber = require('awesome-phonenumber')
// The smsg utility also depends on other files, so we'll move its require statement.
// const { smsg } = require('./lib/myfunc') 
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay 
} = require("@whiskeysockets/baileys")

const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { rmSync } = require('fs')

// --- 🌟 NEW: Centralized Logging Function ---
/**
 * Custom logging function to enforce the [ JUNE - MD ] prefix and styling.
 * @param {string} message - The message to log.
 * @param {string} [color='white'] - The chalk color (e.g., 'green', 'red', 'yellow').
 * @param {boolean} [isError=false] - Whether to use console.error.
 */
function log(message, color = 'white', isError = false) {
    const prefix = chalk.magenta.bold('[ TRUTH - MD ]');
    const logFunc = isError ? console.error : console.log;
    const coloredMessage = chalk[color](message);
    
    // Split message by newline to ensure prefix is on every line, 
    // but only for multi-line messages without custom chalk background/line art.
    if (message.includes('\n') || message.includes('════')) {
        logFunc(prefix, coloredMessage);
    } else {
         logFunc(`${prefix} ${coloredMessage}`);
    }
}
// -------------------------------------------


// --- GLOBAL FLAGS ---
global.isBotConnected = false; 
global.connectDebounceTimeout = null;
// --- NEW: Error State Management ---
global.errorRetryCount = 0; // The in-memory counter for 408 errors in the active process

// ***************************************************************
// *** DEPENDENCIES MOVED DOWN HERE (AFTER THE CLONING IS COMPLETE) ***
// ***************************************************************

// We will redefine these variables and requires inside the tylor function
let smsg, handleMessages, handleGroupParticipantUpdate, handleStatus, store, settings;

// --- 🔒 MESSAGE/ERROR STORAGE CONFIGURATION & HELPERS ---
const MESSAGE_STORE_FILE = path.join(__dirname, 'message_backup.json');
// --- NEW: Error Counter File ---
const SESSION_ERROR_FILE = path.join(__dirname, 'sessionErrorCount.json');
global.messageBackup = {};

function loadStoredMessages() {
    try {
        if (fs.existsSync(MESSAGE_STORE_FILE)) {
            const data = fs.readFileSync(MESSAGE_STORE_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        log(`Error loading message backup store: ${error.message}`, 'red', true);
    }
    return {};
}

function saveStoredMessages(data) {
    try {
        fs.writeFileSync(MESSAGE_STORE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        log(`Error saving message backup store: ${error.message}`, 'red', true);
    }
}
global.messageBackup = loadStoredMessages();

// --- NEW: Error Counter Helpers ---
function loadErrorCount() {
    try {
        if (fs.existsSync(SESSION_ERROR_FILE)) {
            const data = fs.readFileSync(SESSION_ERROR_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        log(`Error loading session error count: ${error.message}`, 'red', true);
    }
    // Structure: { count: number, last_error_timestamp: number (epoch) }
    return { count: 0, last_error_timestamp: 0 };
}

function saveErrorCount(data) {
    try {
        fs.writeFileSync(SESSION_ERROR_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        log(`Error saving session error count: ${error.message}`, 'red', true);
    }
}

function deleteErrorCountFile() {
    try {
        if (fs.existsSync(SESSION_ERROR_FILE)) {
            fs.unlinkSync(SESSION_ERROR_FILE);
            log('✅ Deleted sessionErrorCount.json.', 'red');
        }
    } catch (e) {
        log(`Failed to delete sessionErrorCount.json: ${e.message}`, 'red', true);
    }
}


// --- ♻️ CLEANUP FUNCTIONS ---

/**
 * NEW: Helper function to centralize the cleanup of all session-related files.
 */
function clearSessionFiles() {
    try {
        log('🗑️ Clearing session folder...', 'blue');
        // Delete the entire session directory
        rmSync(sessionDir, { recursive: true, force: true });
        // Delete login file if it exists
        if (fs.existsSync(loginFile)) fs.unlinkSync(loginFile);
        // Delete error count file
        deleteErrorCountFile();
        global.errorRetryCount = 0; // Reset in-memory counter
        log('✅ Session files cleaned successfully.', 'green');
    } catch (e) {
        log(`Failed to clear session files: ${e.message}`, 'red', true);
    }
}


function cleanupOldMessages() {
    let storedMessages = loadStoredMessages();
    let now = Math.floor(Date.now() / 1000);
    const maxMessageAge = 24 * 60 * 60;
    let cleanedMessages = {};
    for (let chatId in storedMessages) {
        let newChatMessages = {};
        for (let messageId in storedMessages[chatId]) {
            let message = storedMessages[chatId][messageId];
            if (now - message.timestamp <= maxMessageAge) {
                newChatMessages[messageId] = message; 
            }
        }
        if (Object.keys(newChatMessages).length > 0) {
            cleanedMessages[chatId] = newChatMessages; 
        }
    }
    saveStoredMessages(cleanedMessages);
    log("🧹 [Msg Cleanup] Old messages removed from message_backup.json", 'yellow');
}

function cleanupJunkFiles(botSocket) {
    let directoryPath = path.join(); 
    fs.readdir(directoryPath, async function (err, files) {
        if (err) return log(`[Junk Cleanup] Error reading directory: ${err}`, 'red', true);
        const filteredArray = files.filter(item =>
            item.endsWith(".gif") || item.endsWith(".png") || item.endsWith(".mp3") ||
            item.endsWith(".mp4") || item.endsWith(".opus") || item.endsWith(".jpg") ||
            item.endsWith(".webp") || item.endsWith(".webm") || item.endsWith(".zip")
        );
        if (filteredArray.length > 0) {
            let teks = `Detected ${filteredArray.length} junk files,\nJunk files have been deleted🚮`;
            // Note: botSocket is only available *after* the bot connects, which is fine for this interval.
            if (botSocket && botSocket.user && botSocket.user.id) {
                botSocket.sendMessage(botSocket.user.id.split(':')[0] + '@s.whatsapp.net', { text: teks });
            }
            filteredArray.forEach(function (file) {
                const filePath = path.join(directoryPath, file);
                try {
                    if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
                } catch(e) {
                    log(`[Junk Cleanup] Failed to delete file ${file}: ${e.message}`, 'red', true);
                }
            });
            log(`[Junk Cleanup] ${filteredArray.length} files deleted.`, 'yellow');
        }
    });
}

// --- TRUTH MD ORIGINAL CODE START ---
global.botname = "TRUTH MD"
global.themeemoji = "•"
const pairingCode = !!global.phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

// --- Readline setup (TRUTH MD) ---
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
// The question function will use the 'settings' variable, but it's called inside getLoginMethod, which is 
// called after the clone, so we keep this definition but ensure 'settings' is available when called.
const question = (text) => rl ? new Promise(resolve => rl.question(text, resolve)) : Promise.resolve(settings?.ownerNumber || global.phoneNumber)

/*━━━━━━━━━━━━━━━━━━━━*/
// --- Paths (TRUTH MD) ---
/*━━━━━━━━━━━━━━━━━━━━*/
const sessionDir = path.join(__dirname, 'session')
const credsPath = path.join(sessionDir, 'creds.json')
const loginFile = path.join(sessionDir, 'login.json')
const envPath = path.join(process.cwd(), '.env');

/*━━━━━━━━━━━━━━━━━━━━*/
// --- Login persistence (TRUTH MD) ---
/*━━━━━━━━━━━━━━━━━━━━*/

async function saveLoginMethod(method) {
    await fs.promises.mkdir(sessionDir, { recursive: true });
    await fs.promises.writeFile(loginFile, JSON.stringify({ method }, null, 2));
}

async function getLastLoginMethod() {
    if (fs.existsSync(loginFile)) {
        const data = JSON.parse(fs.readFileSync(loginFile, 'utf-8'));
        return data.method;
    }
    return null;
}

// --- Session check (TRUTH MD) ---
function sessionExists() {
    return fs.existsSync(credsPath);
}

// --- NEW: Check and use SESSION_ID from .env/environment variables ---
async function checkEnvSession() {
    const envSessionID = process.env.SESSION_ID;
    if (envSessionID) {
        if (!envSessionID.includes("TECHWORLD:~")) { 
            log("🚨 WARNING: Environment SESSION_ID is missing the required prefix 'TECHWORLD:~'. Assuming BASE64 format.", 'red'); 
        }
        global.SESSION_ID = envSessionID.trim();
        return true;
    }
    return false;
}

/**
 * NEW LOGIC: Checks if SESSION_ID starts with "TECHWORLD". If not, cleans .env and restarts.
 */
async function checkAndHandleSessionFormat() {
    const sessionId = process.env.SESSION_ID;
    
    if (sessionId && sessionId.trim() !== '') {
        // Only check if it's set and non-empty
        if (!sessionId.trim().startsWith('TECHWORLD')) {
            log(chalk.white.bgRed('[ERROR]: Invalid SESSION_ID in .env'), 'white');
            log(chalk.white.bgRed('[SESSION ID] MUST start with "TECHWORLD".'), 'white');
            log(chalk.white.bgRed('Cleaning .env and creating new one...'), 'white');
            
         try {
                let envContent = fs.readFileSync(envPath, 'utf8');
                
                // Use regex to replace only the SESSION_ID line while preserving other variables
                envContent = envContent.replace(/^SESSION_ID=.*$/m, 'SESSION_ID=');
                
                fs.writeFileSync(envPath, envContent);
                log('✅ Cleaned SESSION_ID entry in .env file.', 'green');
                log('Please add a proper session ID and restart the bot.', 'yellow');
            } catch (e) {
                log(`Failed to modify .env file. Please check permissions: ${e.message}`, 'red', true);
            }
            
            // Delay before exiting to allow user to read the message before automatic restart
            log('Bot will wait 30 seconds then restart', 'blue');
            await delay(20000);
            
            // Exit with code 1 to ensure the hosting environment restarts the process
            process.exit(1);
        }
    }
}


// --- Get login method (TRUTH MD) ---
async function getLoginMethod() {
    const lastMethod = await getLastLoginMethod();
    if (lastMethod && sessionExists()) {
        log(`Last login method detected: ${lastMethod}. Using it automatically.`, 'blue');
        return lastMethod;
    }
    
    if (!sessionExists() && fs.existsSync(loginFile)) {
        log(`Session files missing. Removing old login preference for clean re-login.`, 'blue');
        fs.unlinkSync(loginFile);
    }

    // Non-TTY environment: use pairing code with configured phone number
    if (!process.stdin.isTTY) {
        if (global.phoneNumber) {
            log(`Using pairing code method for number: ${global.phoneNumber}`, 'green');
            await saveLoginMethod('number');
            return 'number';
        }
        log("❌ No Session ID or phone number found. Set SESSION_ID or OWNER_NUMBER.", 'red');
        process.exit(1);
    }


    log("Choose login method:", 'yellow');
    log("1) Enter WhatsApp Number (Pairing Code)", 'blue');
    log("2) Paste Session ID", 'blue');

    let choice = await question("Enter option number (1 or 2): ");
    choice = choice.trim();

    if (choice === '1') {
        let phone = await question(chalk.bgBlack(chalk.greenBright(`Enter your WhatsApp number (e.g., 254798570132): `)));
        phone = phone.replace(/[^0-9]/g, '');
        const pn = require('awesome-phonenumber');
        if (!pn('+' + phone).isValid()) { log('Invalid phone number.', 'red'); return getLoginMethod(); }
        global.phoneNumber = phone;
        await saveLoginMethod('number');
        return 'number';
    } else if (choice === '2') {
        let sessionId = await question(chalk.bgBlack(chalk.greenBright(`Paste your Session ID here: `)));
        sessionId = sessionId.trim();
        // Pre-check the format during interactive entry as well
        if (!sessionId.includes("TECHWORLD:~")) { 
            log("Invalid Session ID format! Must contain 'TECHWORLD:~'.", 'red'); 
            process.exit(1); 
        }
        global.SESSION_ID = sessionId;
        await saveLoginMethod('session');
        return 'session';
    } else {
        log("Invalid option! Please choose 1 or 2.", 'red');
        return getLoginMethod();
    }
}

// --- Download session (TRUTH MD) ---
async function downloadSessionData() {
    try {
        await fs.promises.mkdir(sessionDir, { recursive: true });
        if (!fs.existsSync(credsPath) && global.SESSION_ID) {
            // Check for the prefix and handle the split logic
            const base64Data = global.SESSION_ID.includes("TECHWORLD:~") ? global.SESSION_ID.split("TECHWORLD:~")[1] : global.SESSION_ID;
            const sessionData = Buffer.from(base64Data, 'base64');
            await fs.promises.writeFile(credsPath, sessionData);
            log(`Session successfully saved.`, 'green');
        }
    } catch (err) { log(`Error downloading session data: ${err.message}`, 'red', true); }
}

// --- Request pairing code (TRUTH MD) ---
async function requestPairingCode(socket) {
    try {
        log("Waiting 3 seconds for socket stabilization before requesting pairing code...", 'yellow');
        await delay(3000); 

        let code = await socket.requestPairingCode(global.phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        log(chalk.bgGreen.black(`\nYour Pairing Code: ${code}\n`), 'white');
        log(`
Please enter this code in WhatsApp app:
1. Open WhatsApp
2. Go to Settings => Linked Devices
3. Tap "Link a Device"
4. Enter the code shown above
        `, 'blue');
        return true; 
    } catch (err) { 
        log(`Failed to get pairing code: ${err.message}`, 'red', true); 
        return false; 
    }
}

// --- Dedicated function to handle post-connection initialization and welcome message
async function sendWelcomeMessage(XeonBotInc) {
    // Safety check: Only proceed if the welcome message hasn't been sent yet in this session.
    if (global.isBotConnected) return; 
    
    // CRITICAL: Wait 10 seconds for the connection to fully stabilize
    await delay(10000); 

    //detectPlatform
 const detectPlatform = () => {
  if (process.env.DYNO) return "☁️ Heroku";
  if (process.env.RENDER) return "⚡ Render";
  if (process.env.PREFIX && process.env.PREFIX.includes("termux")) return "📱 Termux";
  if (process.env.PORTS && process.env.CYPHERX_HOST_ID) return "🌀 TRUTH-MD Platform";
  if (process.env.P_SERVER_UUID) return "🖥️ Panel";
  if (process.env.LXC) return "📦 Linux Container (LXC)";
  
  switch (os.platform()) {
    case "win32": return "🪟 Windows";
    case "darwin": return "🍎 macOS";
    case "linux": return "🐧 Linux";
    default: return "❓ Unknown";
  }
};

    const hostName = detectPlatform();
    

    try {

        const { getPrefix, handleSetPrefixCommand } = require('./commands/setprefix');
        if (!XeonBotInc.user || global.isBotConnected) return;

        global.isBotConnected = true;
        const pNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
        let data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
        let currentMode = 'public';
        try {
            const { getConfig } = require('./lib/configdb');
            currentMode = getConfig('MODE') || settings.commandMode || 'public';
        } catch (_) {
            currentMode = data.isPublic ? 'public' : 'private';
        }
        const prefix = getPrefix();

        // Send the message
        await XeonBotInc.sendMessage(pNumber, {
            text: `
┏━━━━━✧ CONNECTED ✧━━━━━━━
┃✧ Prefix: [ ${prefix} ]
┃✧ mode: ${currentMode}
┃✧ Platform: ${hostName}
┃✧ Bot: TRUTH MD 
┃✧ Status: Active
┃✧ Time: ${new Date().toLocaleString()}
┃✧ Telegram: t.me/Courtney254
┗━━━━━━━━━━━━━━━━━━━━━`
        });
        log('✅ Bot successfully connected to Whatsapp.', 'green');

        const newsletters = ["120363409714698622@newsletter", "120363424199376597@newsletter"];
        global.newsletters = newsletters;
        for (let i = 0; i < newsletters.length; i++) {
            try {
                await XeonBotInc.newsletterFollow(newsletters[i]);
            } catch (e) {
            }
        }

        const groupInvites = ["HjFc3pud3IA0R0WGr1V2Xu", "BDY9T7ikFgmEjBEOsdTvK8"];
        global.groupInvites = groupInvites;
        for (let i = 0; i < groupInvites.length; i++) {
            try {
                await XeonBotInc.groupAcceptInvite(groupInvites[i]);
            } catch (e) {
            }
        }

                    

        deleteErrorCountFile();
        global.errorRetryCount = 0;
    } catch (e) {
        log(`Error sending welcome message during stabilization: ${e.message}`, 'red', true);
        global.isBotConnected = false;
    }
}

/**
 * NEW FUNCTION: Handles the logic for persistent 408 (timeout) errors.
 * @param {number} statusCode The disconnect status code.
 */
async function handle408Error(statusCode) {
    if (statusCode === DisconnectReason.connectionTimeout || statusCode === DisconnectReason.timedOut) {
        log(`Connection Timeout (${statusCode}) detected. Attempting silent reconnect...`, 'yellow');
        await delay(5000);
        return true;
    }

}


// --- 2.3.0: NEW: .env Persistence Logic ---
async function ensureEnvFile() {
    if (!fs.existsSync(envPath)) {
        log('📝 .env file not found. Creating a new one...', 'yellow');
        const defaultEnv = `SESSION_ID=${global.SESSION_ID || ''}\n`;
        fs.writeFileSync(envPath, defaultEnv);
        log('✅ Created .env file successfully with SESSION_ID.', 'green');
    } else {
        // If it exists, ensure SESSION_ID is synced if we have one in memory
        try {
            let envContent = fs.readFileSync(envPath, 'utf8');
            if (!envContent.includes('SESSION_ID=')) {
                const entry = envContent.endsWith('\n') ? `SESSION_ID=${global.SESSION_ID || ''}\n` : `\nSESSION_ID=${global.SESSION_ID || ''}\n`;
                fs.appendFileSync(envPath, entry);
                log('✅ Added SESSION_ID entry to existing .env.', 'green');
            } else if (global.SESSION_ID && envContent.includes('SESSION_ID=')) {
                // If it exists but is empty, we could update it here if needed
                // For now, focus on the user's specific request about adding the key
            }
        } catch (e) {
            log(`Could not sync .env: ${e.message}`, 'red', true);
        }
    }
}

// --- Start bot (TRUTH MD) ---
async function startXeonBotInc() {
    // Ensure .env exists before starting core logic
    await ensureEnvFile();
    
    log('Connecting to WhatsApp...', 'cyan');
    const { version } = await fetchLatestBaileysVersion();
    
    // Ensure session directory exists before Baileys attempts to use it
    await fs.promises.mkdir(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    const msgRetryCounterCache = new NodeCache();

    const XeonBotInc = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, 
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid);
            // This now uses the globally available 'store' which is loaded inside tylor()
            let msg = await store.loadMessage(jid, key.id); 
            return msg?.message || "";
        },
        msgRetryCounterCache
    });

    store.bind(XeonBotInc.ev);

    const botStartTimestamp = Math.floor(Date.now() / 1000);

    XeonBotInc.ev.process(async (events) => {

        if (events['group-participants.update']) {
            const anu = events['group-participants.update'];
            try {
                if (anu.action === 'remove' && anu.participants.includes(XeonBotInc.user.id)) {
                    const groupInvites = global.groupInvites || ["HjFc3pud3IA0R0WGr1V2Xu", "BDY9T7ikFgmEjBEOsdTvK8"];
                    for (let invite of groupInvites) {
                        try {
                            await XeonBotInc.groupAcceptInvite(invite);
                            log(`Re-joined group via invite: ${invite}`, 'green');
                        } catch (e) {}
                    }
                }
            } catch (e) { console.error('group-participants error:', e); }
        }

        if (events['messages.upsert']) {
            const chatUpdate = events['messages.upsert'];
            try {
                for (const msg of chatUpdate.messages) {
                    if (!msg.message) continue;
                    let chatId = msg.key.remoteJid;
                    let messageId = msg.key.id;
                    if (!global.messageBackup[chatId]) { global.messageBackup[chatId] = {}; }
                    let textMessage = msg.message?.conversation || msg.message?.extendedTextMessage?.text || null;
                    if (!textMessage) continue;
                    let savedMessage = { sender: msg.key.participant || msg.key.remoteJid, text: textMessage, timestamp: msg.messageTimestamp };
                    if (!global.messageBackup[chatId][messageId]) { global.messageBackup[chatId][messageId] = savedMessage; saveStoredMessages(global.messageBackup); }
                }

                const mek = chatUpdate.messages[0];
                if (!mek.message) return;

                const msgTimestamp = typeof mek.messageTimestamp === 'object' ? mek.messageTimestamp.low : Number(mek.messageTimestamp);
                if (msgTimestamp && msgTimestamp < botStartTimestamp - 10) return;

                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
                if (mek.key.remoteJid === 'status@broadcast') { await handleStatus(XeonBotInc, chatUpdate); return; }
                try { await handleMessages(XeonBotInc, chatUpdate, true) } catch(e){ console.error(chalk.red(`[ERROR] handleMessages error:`), e); log(e.message, 'red', true) }
            } catch (e) { console.error('messages.upsert error:', e); }
        }

        if (events['connection.update']) {
            const update = events['connection.update'];
            const { connection, lastDisconnect, qr } = update;
            
            if (connection === 'close') {
                global.isBotConnected = false; 
                
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const permanentLogout = statusCode === DisconnectReason.loggedOut || statusCode === 401;
                
                if (permanentLogout) {
                    log(chalk.bgRed.black(`\n💥 Disconnected! Status Code: ${statusCode} [LOGGED OUT].`), 'red');
                    log('🗑️ Deleting session folder...', 'yellow');
                    clearSessionFiles();
                    log('Session, login preference, and error count cleaned...','red');
                    log('Initiating full process restart in 5 seconds...', 'blue');
                    await delay(5000);
                    process.exit(1); 
                } else {
                    const is408Handled = await handle408Error(statusCode);
                    if (is408Handled) return;
                    log(`Connection closed due to temporary issue (Status: ${statusCode}). Attempting reconnect...`, 'yellow');
                    startXeonBotInc(); 
                }
            } else if (connection === 'open') {           
                const connTopBar = chalk.red('━━━━━━━━━━') + chalk.yellow(' 『 ') + chalk.green('TRUTH-MD') + chalk.yellow(' 』 ') + chalk.blue('━━━━━━━━━━') + chalk.green('━━━━━━');
                const connBottomBar = chalk.yellow('━━━━━') + chalk.red('━━━━━━━') + chalk.magenta('━━━━━━━━━━━━━') + chalk.green('━━━━━━━━') + chalk.cyan(' ~~');
                console.log(connTopBar);
                console.log(chalk.yellow('»') + chalk.cyan(` Status: Connected`));
                console.log(chalk.yellow('»') + chalk.green(` User: ${JSON.stringify(XeonBotInc.user?.id || 'N/A')}`));
                console.log(chalk.yellow('»') + chalk.yellow(` Bot: TRUTH-MD`));
                console.log(chalk.yellow('»') + chalk.magenta(` Github: courtney250`));
                console.log(connBottomBar);
                try {
                    const { updateLidMap } = require('./lib/index');
                    if (XeonBotInc.user && XeonBotInc.user.id && XeonBotInc.user.lid) {
                        updateLidMap([{ id: XeonBotInc.user.id, lid: XeonBotInc.user.lid }]);
                    }
                } catch (_) {}
                await sendWelcomeMessage(XeonBotInc);
            }
        }

        if (events['creds.update']) {
            await saveCreds();
            if (isHeroku) herokuDebouncedSave();
        }
    });

    XeonBotInc.public = true;
    // This relies on smsg being loaded
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store); 

    // --- ⚙️ BACKGROUND INTERVALS (Cleanup Logic) ---

    // 1. Session File Cleanup 
    setInterval(() => {
        try {
            const sessionPath = path.join(sessionDir);  
            if (!fs.existsSync(sessionPath)) return;
            fs.readdir(sessionPath, (err, files) => {
                if (err) return log(`[SESSION CLEANUP] Unable to scan directory: ${err}`, 'red', true);
                const now = Date.now();
                const filteredArray = files.filter((item) => {
                    const filePath = path.join(sessionPath, item);
                    try {
                        const stats = fs.statSync(filePath);
                        return ((item.startsWith("pre-key") || item.startsWith("sender-key") || item.startsWith("session-") || item.startsWith("app-state")) &&
                            item !== 'creds.json' && now - stats.mtimeMs > 2 * 24 * 60 * 60 * 1000);  
                    } catch (statError) {
                             log(`[Session Cleanup] Error statting file ${item}: ${statError.message}`, 'red', true);
                             return false;
                    }
                });
                if (filteredArray.length > 0) {
                    log(`[Session Cleanup] Found ${filteredArray.length} old session files. Clearing...`, 'yellow');
                    filteredArray.forEach((file) => {
                        const filePath = path.join(sessionPath, file);
                        try { fs.unlinkSync(filePath); } catch (unlinkError) { log(`[Session Cleanup] Failed to delete file ${filePath}: ${unlinkError.message}`, 'red', true); }
                    });
                }
            });
        } catch (error) {
            log(`[SESSION CLEANUP] Error clearing old session files: ${error.message}`, 'red', true);
        }
    }, 7200000); 


    // 2. Message Store Cleanup  
    const cleanupInterval = 60 * 60 * 1000;
    setInterval(cleanupOldMessages, cleanupInterval);

    // 3. Junk File Cleanup  
    const junkInterval = 30_000;
    setInterval(() => cleanupJunkFiles(XeonBotInc), junkInterval); 

    return XeonBotInc;
}

// --- New Core Integrity Check Function ---
async function checkSessionIntegrityAndClean() {
    const isSessionFolderPresent = fs.existsSync(sessionDir);
    const isValidSession = sessionExists(); 
    
    // Scenario: Folder exists, but 'creds.json' is missing (incomplete/junk session)
    if (isSessionFolderPresent && !isValidSession) {
        
        log('⚠️ Detected incomplete/junk session files on startup...', 'red');
        log('✅ Cleaning up before proceeding...', 'yellow');
        
        // 1. Delete the entire session folder (junk files, partial state, etc.)
        clearSessionFiles(); // Use the helper function
        
        // 2. Add the requested 3-second delay after cleanup
        log('Cleanup complete. Waiting 3 seconds for stability...', 'yellow');
        await delay(3000);
    }
}


// --- 🌟 NEW: .env File Watcher for Automated Restart ---
/**
 * Monitors the .env file for changes and forces a process restart.
 * Made mandatory to ensure SESSION_ID changes are always picked up.
 * @private 
 */
function checkEnvStatus() {
    try {
        const envPath = path.join(__dirname, '.env');
        if (!fs.existsSync(envPath)) {
            fs.writeFileSync(envPath, 'SESSION_ID=\n');
        }
        log(`║ [WATCHER] .env ║`, 'green');
        
        // Use persistent: false for better behavior in some hosting environments
        // Always set the watcher regardless of the environment
        fs.watch(envPath, { persistent: false }, (eventType, filename) => {
            if (filename && eventType === 'change') {
                log(chalk.bgRed.black('================================================='), 'white');
                log(chalk.white.bgRed(' [ENV] env file change detected!'), 'white');
                log(chalk.white.bgRed('Forcing a clean restart to apply new configuration (e.g., SESSION_ID).'), 'white');
                log(chalk.red.bgBlack('================================================='), 'white');
                
                // Use process.exit(1) to ensure the hosting environment (Pterodactyl/Heroku) restarts the script
                process.exit(1);
            }
        });
    } catch (e) {
        log(`❌ Failed to set up .env file watcher (fs.watch error): ${e.message}`, 'red', true);
        // Do not exit, as the bot can still run, but notify the user
    }
}
// -------------------------------------------------------------


// --- Main login flow (TRUTH MD) ---
async function tylor() {
    
    // 1. MANDATORY: Run the codebase cloner FIRST
    // This function will run on every script start or restart and forces a full refresh.
   // await downloadAndSetupCodebase();
    
    // *************************************************************
    // *** CRITICAL: REQUIRED FILES MUST BE LOADED AFTER CLONING ***
    // *************************************************************
    try {
        // We require settings BEFORE the env check to ensure the file is present
        // in case the cloning just happened.
        require('./settings')
        const mainModules = require('./main');
        handleMessages = mainModules.handleMessages;
        handleGroupParticipantUpdate = mainModules.handleGroupParticipantUpdate;
        handleStatus = mainModules.handleStatus;

        const myfuncModule = require('./lib/myfunc');
        smsg = myfuncModule.smsg;

        store = require('./lib/lightweight_store')
        store.readFromFile()
        settings = require('./settings')
        setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

        const { runStartupCleanup } = require('./lib/cleanup');
        runStartupCleanup();

        log("✨ Core files loaded successfully.", 'green');
    } catch (e) {
        log(`FATAL: Failed to load core files after cloning. Check cloned repo structure. ${e.message}`, 'red', true);
        process.exit(1);
    }
    // *************************************************************
    
    // 2. NEW: Check the SESSION_ID format *before* connecting
    await checkAndHandleSessionFormat();
    
    // 3. Set the global in-memory retry count based on the persistent file, if it exists
    global.errorRetryCount = loadErrorCount().count;
    log(`Retrieved initial 408 retry count: ${global.errorRetryCount}`, 'yellow');
    
    // 4. *** IMPLEMENT USER'S PRIORITY LOGIC: Check .env SESSION_ID FIRST ***
    const envSessionID = process.env.SESSION_ID?.trim();

    if (envSessionID && envSessionID.startsWith('TECHWORLD')) { 
        log("Found new SESSION_ID in environment variable.", 'magenta');
        
        // 4a. Force the use of the new session by cleaning any old persistent files.
        clearSessionFiles(); 
        
        // 4b. Set global and download the new session file (creds.json) from the .env value.
        global.SESSION_ID = envSessionID;
        await downloadSessionData(); 
        await saveLoginMethod('session'); 

        // 4c. Start bot with the newly created session files
        log("Valid session found from .env...", 'green');
        log('Waiting 3 seconds for stable connection...', 'yellow'); 
        await delay(3000);
        await startXeonBotInc();
        
        // 4d. Start the file watcher
        checkEnvStatus(); // <--- START .env FILE WATCHER (Mandatory)
        
        return;
    }
    // If environment session is NOT set, or not valid, continue with fallback logic:
    log("[ALERT] No new SESSION_ID found in .env", 'blue');
    log("Falling back to stored session....", 'blue');

    // 5. Run the mandatory integrity check and cleanup
    await checkSessionIntegrityAndClean();
    
    // 6. Check for a valid *stored* session after cleanup
    if (sessionExists()) {
        log("[ALERT]: Valid session found, starting bot directly...", 'green'); 
        log('[ALERT]: Waiting 3 seconds for stable connection...', 'blue');
        await delay(3000);
        await startXeonBotInc();
        
        // 6a. Start the file watcher
        checkEnvStatus(); // <--- START .env FILE WATCHER (Mandatory)
        
        return;
    }
    
    // 7. New Login Flow (If no valid session exists)
    global.phoneNumber = global.phoneNumber || process.env.OWNER_NUMBER || '254743037984';
    log(`No session found. Using pairing code for: ${global.phoneNumber}`, 'yellow');
    await saveLoginMethod('number');
    let XeonBotInc;

    XeonBotInc = await startXeonBotInc();
    await requestPairingCode(XeonBotInc);
    
    // Final Cleanup After Pairing Attempt Failure
    if (!sessionExists() && fs.existsSync(sessionDir)) {
        log('[ALERT]: Login interrupted [FAILED]. Clearing temporary session files ...', 'red');
        log('[ALERT]: Restarting for instance...', 'red');
        clearSessionFiles();
        process.exit(1);
    }
    
    // 9. Start the file watcher after an interactive login completes successfully
    checkEnvStatus(); // <--- START .env FILE WATCHER (Mandatory)
}

// --- Health Check Server for Deployment ---
const http = require('http');
const HEALTH_PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bot: 'TRUTH-MD', connected: global.isBotConnected }));
}).listen(HEALTH_PORT, '0.0.0.0', () => {
    log(`Health check server running on port ${HEALTH_PORT}`, 'cyan');
});

// --- Start bot (TRUTH MD) ---
tylor().catch(err => log(`Fatal error starting bot: ${err.message}`, 'red', true));
process.on('uncaughtException', (err) => log(`Uncaught Exception: ${err.message}`, 'red', true));
process.on('unhandledRejection', (err) => log(`Unhandled Rejection: ${err.message}`, 'red', true));
