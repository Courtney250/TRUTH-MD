const fs = require('fs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, '..', 'session');
const TEMP_DIRS = [
    path.join(__dirname, '..', 'temp'),
    path.join(__dirname, '..', 'tmp'),
    path.join(__dirname, '..', 'commands', 'temp'),
    path.join(__dirname, '..', 'assets', 'temp'),
];
const STORE_FILE = path.join(__dirname, '..', 'baileys_store.json');

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_STORE_SIZE_MB = 10;
const TEMP_FILE_MAX_AGE = 60 * 60 * 1000;

const PROTECTED_SESSION_FILES = new Set([
    'creds.json',
]);

function log(msg, color) {
    try {
        const chalk = require('chalk');
        const prefix = chalk.magenta.bold('[ TRUTH - MD ]');
        console.log(`${prefix} ${chalk[color] ? chalk[color](msg) : msg}`);
    } catch {
        console.log(`[ TRUTH - MD ] ${msg}`);
    }
}

function cleanupSessionFiles() {
    try {
        if (!fs.existsSync(SESSION_DIR)) return;

        const now = Date.now();
        const files = fs.readdirSync(SESSION_DIR);
        let removed = 0;

        for (const file of files) {
            if (PROTECTED_SESSION_FILES.has(file)) continue;
            if (file.startsWith('app-state-sync-key-')) continue;
            if (file.startsWith('app-state-sync-version-')) continue;

            const isOldKey = file.startsWith('pre-key-') ||
                             file.startsWith('sender-key-') ||
                             file.startsWith('session-') ||
                             file.startsWith('device-list-');

            if (!isOldKey) continue;

            const filePath = path.join(SESSION_DIR, file);
            try {
                const stat = fs.statSync(filePath);
                if ((now - stat.mtimeMs) > SESSION_MAX_AGE) {
                    fs.unlinkSync(filePath);
                    removed++;
                }
            } catch {}
        }

        if (removed > 0) {
            log(`Session cleanup: removed ${removed} files older than 7 days`, 'yellow');
        }
    } catch (err) {
        log(`Session cleanup error: ${err.message}`, 'red');
    }
}

function cleanupTempFiles() {
    let removed = 0;
    const now = Date.now();
    const mediaExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.opus', '.webp', '.webm', '.ogg', '.wav', '.pdf']);

    for (const dir of TEMP_DIRS) {
        try {
            if (!fs.existsSync(dir)) continue;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const filePath = path.join(dir, entry.name);
                try {
                    if (entry.isDirectory()) {
                        const subFiles = fs.readdirSync(filePath);
                        for (const sub of subFiles) {
                            const subPath = path.join(filePath, sub);
                            const stat = fs.statSync(subPath);
                            if (stat.isFile() && (now - stat.mtimeMs) > TEMP_FILE_MAX_AGE) {
                                fs.unlinkSync(subPath);
                                removed++;
                            }
                        }
                    } else if (entry.isFile()) {
                        const stat = fs.statSync(filePath);
                        if ((now - stat.mtimeMs) > TEMP_FILE_MAX_AGE) {
                            fs.unlinkSync(filePath);
                            removed++;
                        }
                    }
                } catch {}
            }
        } catch {}
    }

    const rootDir = path.join(__dirname, '..');
    try {
        const rootFiles = fs.readdirSync(rootDir);
        for (const file of rootFiles) {
            const ext = path.extname(file).toLowerCase();
            if (!mediaExts.has(ext)) continue;
            const filePath = path.join(rootDir, file);
            try {
                const stat = fs.statSync(filePath);
                if (stat.isFile() && (now - stat.mtimeMs) > TEMP_FILE_MAX_AGE) {
                    fs.unlinkSync(filePath);
                    removed++;
                }
            } catch {}
        }
    } catch {}

    if (removed > 0) {
        log(`Temp cleanup: removed ${removed} orphaned files`, 'yellow');
    }
}

function capStoreFileSize() {
    try {
        if (!fs.existsSync(STORE_FILE)) return;
        const stat = fs.statSync(STORE_FILE);
        const sizeMB = stat.size / (1024 * 1024);

        if (sizeMB > MAX_STORE_SIZE_MB) {
            const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));

            const chatIds = Object.keys(data.chats || {});
            if (chatIds.length > 500) {
                const sorted = chatIds
                    .map(id => ({ id, time: data.chats[id].conversationTimestamp || data.chats[id].lastMessageRecvTimestamp || 0 }))
                    .sort((a, b) => b.time - a.time);
                const keep = new Set(sorted.slice(0, 500).map(c => c.id));
                for (const id of chatIds) {
                    if (!keep.has(id)) {
                        delete data.chats[id];
                        if (data.messages && data.messages[id]) {
                            delete data.messages[id];
                        }
                    }
                }
            }

            const contactIds = Object.keys(data.contacts || {});
            if (contactIds.length > 2000) {
                const withActivity = contactIds
                    .map(id => ({ id, time: data.contacts[id].conversationTimestamp || data.contacts[id].lastSeen || 0 }))
                    .sort((a, b) => b.time - a.time);
                const keepContacts = new Set(withActivity.slice(0, 2000).map(c => c.id));
                for (const id of contactIds) {
                    if (!keepContacts.has(id)) delete data.contacts[id];
                }
            }

            const msgJids = Object.keys(data.messages || {});
            for (const jid of msgJids) {
                if (data.messages[jid] && data.messages[jid].length > 10) {
                    data.messages[jid] = data.messages[jid].slice(-10);
                }
            }

            fs.writeFileSync(STORE_FILE, JSON.stringify(data));
            const newSize = (fs.statSync(STORE_FILE).size / (1024 * 1024)).toFixed(1);
            log(`Store file trimmed: ${sizeMB.toFixed(1)}MB → ${newSize}MB`, 'yellow');
        }
    } catch (err) {
        log(`Store cap error: ${err.message}`, 'red');
    }
}

function runStartupCleanup() {
    log('Running startup storage cleanup...', 'cyan');
    cleanupTempFiles();
    cleanupSessionFiles();
    capStoreFileSize();
    log('Startup cleanup complete.', 'green');
}

module.exports = {
    runStartupCleanup,
    cleanupSessionFiles,
    cleanupTempFiles,
    capStoreFileSize
};
