const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const { rmSync } = require('fs');

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true, timeout: 120000 }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || stdout || err.message || '').toString()));
            resolve((stdout || '').toString());
        });
    });
}

async function hasGitRepo() {
    const gitDir = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) return false;
    try {
        await run('git --version');
        return true;
    } catch {
        return false;
    }
}

async function updateViaGit() {
    const oldRev = (await run('git rev-parse HEAD').catch(() => 'unknown')).trim();
    await run('git fetch --all --prune');
    const newRev = (await run('git rev-parse origin/main').catch(() => '')).trim();

    if (!newRev) {
        throw new Error('Could not fetch latest commit from origin/main');
    }

    const alreadyUpToDate = oldRev === newRev;
    let commits = '';
    let files = '';

    if (!alreadyUpToDate) {
        commits = await run(`git log --pretty=format:"%h %s (%an)" ${oldRev}..${newRev}`).catch(() => '');
        files = await run(`git diff --name-status ${oldRev} ${newRev}`).catch(() => '');
        try {
            await run('git stash');
        } catch {}
        await run(`git pull --rebase origin main`);
    }

    return { oldRev, newRev, alreadyUpToDate, commits, files };
}

function downloadFile(url, dest, visited = new Set()) {
    return new Promise((resolve, reject) => {
        try {
            if (visited.has(url) || visited.size > 5) {
                return reject(new Error('Too many redirects'));
            }
            visited.add(url);

            const useHttps = url.startsWith('https://');
            const client = useHttps ? require('https') : require('http');
            const req = client.get(url, {
                headers: {
                    'User-Agent': 'truth-md-Updater/1.0',
                    'Accept': '*/*'
                }
            }, res => {
                if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                    const location = res.headers.location;
                    if (!location) return reject(new Error(`HTTP ${res.statusCode} without Location`));
                    const nextUrl = new URL(location, url).toString();
                    res.resume();
                    return downloadFile(nextUrl, dest, visited).then(resolve).catch(reject);
                }

                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }

                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
                file.on('error', err => {
                    try { file.close(() => {}); } catch {}
                    fs.unlink(dest, () => reject(err));
                });
            });
            req.on('error', err => {
                fs.unlink(dest, () => reject(err));
            });
            req.setTimeout(60000, () => {
                req.destroy(new Error('Download timeout'));
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function extractZip(zipPath, outDir) {
    if (process.platform === 'win32') {
        const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outDir.replace(/\\/g, '/')}' -Force"`;
        await run(cmd);
        return;
    }
    try {
        await run('command -v unzip');
        await run(`unzip -o '${zipPath}' -d '${outDir}'`);
        return;
    } catch {}
    try {
        await run('command -v 7z');
        await run(`7z x -y '${zipPath}' -o'${outDir}'`);
        return;
    } catch {}
    try {
        await run('busybox unzip -h');
        await run(`busybox unzip -o '${zipPath}' -d '${outDir}'`);
        return;
    } catch {}
    throw new Error("No system unzip tool found (unzip/7z/busybox). Git mode is recommended.");
}

function copyRecursive(src, dest, ignore = [], relative = '', outList = []) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
        if (ignore.includes(entry)) continue;
        const s = path.join(src, entry);
        const d = path.join(dest, entry);
        const stat = fs.lstatSync(s);
        if (stat.isDirectory()) {
            copyRecursive(s, d, ignore, path.join(relative, entry), outList);
        } else {
            fs.copyFileSync(s, d);
            if (outList) outList.push(path.join(relative, entry).replace(/\\/g, '/'));
        }
    }
}

async function updateViaZip(sock, chatId, message, zipOverride) {
    const zipUrl = (zipOverride || settings.updateZipUrl || process.env.UPDATE_ZIP_URL || '').trim();
    if (!zipUrl) {
        throw new Error('No ZIP URL configured. Set settings.updateZipUrl or UPDATE_ZIP_URL env.');
    }
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const zipPath = path.join(tmpDir, 'update.zip');
    await downloadFile(zipUrl, zipPath);
    const extractTo = path.join(tmpDir, 'update_extract');
    if (fs.existsSync(extractTo)) fs.rmSync(extractTo, { recursive: true, force: true });
    await extractZip(zipPath, extractTo);

    const entries = fs.readdirSync(extractTo).map(n => path.join(extractTo, n));
    const root = entries.find(e => fs.lstatSync(e).isDirectory()) || extractTo;

    const ignore = ['node_modules', '.git', 'session', 'tmp', 'temp', 'data', 'baileys_store.json', '.env', '.replit', 'replit.nix', 'replit.md'];
    const copied = [];

    let preservedOwner = null;
    let preservedBotOwner = null;
    try {
        preservedOwner = settings.ownerNumber ? String(settings.ownerNumber) : null;
        preservedBotOwner = settings.botOwner ? String(settings.botOwner) : null;
    } catch {}

    copyRecursive(root, process.cwd(), ignore, '', copied);

    if (preservedOwner) {
        try {
            const settingsPath = path.join(process.cwd(), 'settings.js');
            if (fs.existsSync(settingsPath)) {
                let text = fs.readFileSync(settingsPath, 'utf8');
                text = text.replace(/ownerNumber:\s*'[^']*'/, `ownerNumber: '${preservedOwner}'`);
                if (preservedBotOwner) {
                    text = text.replace(/botOwner:\s*'[^']*'/, `botOwner: '${preservedBotOwner}'`);
                }
                fs.writeFileSync(settingsPath, text);
            }
        } catch {}
    }

    try { fs.rmSync(extractTo, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(zipPath, { force: true }); } catch {}
    return { copiedFiles: copied };
}

async function restartProcess(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { text: '> *Truth md Updated completely! Restarting 🔄 and initializing bot data 🚀* ...' }, { quoted: message });
    } catch {}

    try {
        await sock.end();
    } catch (e) {
        console.error('Error during graceful Baileys shutdown:', e.message);
    }

    const sessionPath = path.join(process.cwd(), 'session');

    const filesToDelete = [
        'app-state-sync-version.json',
        'message-history.json',
        'sender-key-memory.json',
        'baileys_store_multi.json',
        'baileys_store.json'
    ];

    if (fs.existsSync(sessionPath)) {
        console.log(`[RESTART] Clearing volatile session data in: ${sessionPath}`);

        filesToDelete.forEach(fileName => {
            const filePath = path.join(sessionPath, fileName);
            if (fs.existsSync(filePath)) {
                try {
                    rmSync(filePath, { force: true });
                    console.log(`[RESTART] Deleted: ${fileName}`);
                } catch (e) {
                    console.error(`[RESTART] Failed to delete ${fileName}:`, e.message);
                }
            }
        });
    }

    try {
        await run('npm install --no-audit --no-fund');
    } catch (e) {
        console.error('[RESTART] npm install failed:', e.message);
    }

    try {
        await run('pm2 restart all');
        return;
    } catch {}

    setTimeout(() => {
        process.exit(0);
    }, 500);
}

async function checkForUpdates() {
    if (await hasGitRepo()) {
        const oldRev = (await run('git rev-parse HEAD').catch(() => 'unknown')).trim();
        await run('git fetch --all --prune');
        const newRev = (await run('git rev-parse origin/main').catch(() => '')).trim();

        if (!newRev) return { available: false, method: 'git', error: 'Could not reach remote repository' };

        if (oldRev === newRev) {
            return { available: false, method: 'git', currentRev: oldRev };
        }

        let commits = '';
        let fileCount = 0;
        try {
            commits = (await run(`git log --pretty=format:"• %s" ${oldRev}..${newRev}`)).trim();
            const files = (await run(`git diff --name-only ${oldRev} ${newRev}`)).trim();
            fileCount = files ? files.split('\n').length : 0;
        } catch {}

        return { available: true, method: 'git', oldRev, newRev, commits, fileCount };
    }

    const zipUrl = (settings.updateZipUrl || process.env.UPDATE_ZIP_URL || '').trim();
    if (zipUrl) {
        return { available: true, method: 'zip', note: 'ZIP update available (cannot pre-check changes)' };
    }

    return { available: false, method: 'none', error: 'No update source configured' };
}

async function updateCommand(sock, chatId, message, senderIsSudo, zipOverride) {
    const commandText = message.message?.extendedTextMessage?.text || message.message?.conversation || '';
    const isSimpleRestart = commandText.toLowerCase().includes('restart') && !commandText.toLowerCase().includes('update');

    if (!message.key.fromMe && !senderIsSudo) {
        await sock.sendMessage(chatId, { text: 'Only bot owner or sudo can use .restart or .update command' }, { quoted: message });
        return;
    }

    try {
        await sock.sendMessage(chatId, { text: '*🔍 Checking for updates...*' }, { quoted: message });
        await sock.sendMessage(chatId, {
            react: { text: '🔍', key: message.key }
        });

        const check = await checkForUpdates();

        if (isSimpleRestart) {
            if (check.available) {
                let noticeMsg = '📦 *Updates available but not installing (restart only)*\n\n';
                if (check.method === 'git') {
                    noticeMsg += `Pending: \`${check.oldRev.substring(0, 7)}\` → \`${check.newRev.substring(0, 7)}\`\n`;
                    noticeMsg += `Files changed: ${check.fileCount}\n`;
                    if (check.commits) {
                        noticeMsg += `\n*Changes:*\n${check.commits}\n`;
                    }
                    noticeMsg += '\n💡 _Use .update to install these updates_';
                }
                await sock.sendMessage(chatId, { text: noticeMsg }, { quoted: message });
            } else {
                const msg = check.error
                    ? `ℹ️ Could not check for updates: ${check.error}`
                    : `✅ *No updates available* — You're on the latest version (${(check.currentRev || '').substring(0, 7)}).`;
                await sock.sendMessage(chatId, { text: msg }, { quoted: message });
            }

            await sock.sendMessage(chatId, { text: '🔄 *Restarting bot now...*' }, { quoted: message });
            await sock.sendMessage(chatId, {
                react: { text: '🔄', key: message.key }
            });
        } else {
            if (!check.available) {
                const noUpdateMsg = check.error
                    ? `❌ Update check failed: ${check.error}`
                    : `✅ *No updates available*\n\nYou're running the latest version (${(check.currentRev || '').substring(0, 7)}).`;
                await sock.sendMessage(chatId, { text: noUpdateMsg }, { quoted: message });
                await sock.sendMessage(chatId, {
                    react: { text: '✅', key: message.key }
                });
                return;
            }

            let updateNotice = '📦 *Update available!*\n\n';
            if (check.method === 'git') {
                updateNotice += `From: \`${check.oldRev.substring(0, 7)}\` → \`${check.newRev.substring(0, 7)}\`\n`;
                updateNotice += `Files changed: ${check.fileCount}\n`;
                if (check.commits) {
                    updateNotice += `\n*Changes:*\n${check.commits}\n`;
                }
            } else {
                updateNotice += check.note + '\n';
            }
            updateNotice += '\n⏳ *Installing update now...*';

            await sock.sendMessage(chatId, { text: updateNotice }, { quoted: message });
            await sock.sendMessage(chatId, {
                react: { text: '🆙', key: message.key }
            });

            let updateSummary = '';

            if (await hasGitRepo()) {
                try {
                    const { oldRev, newRev, alreadyUpToDate, commits, files } = await updateViaGit();
                    updateSummary = alreadyUpToDate
                        ? `✅ Already up to date (${newRev.substring(0, 7)})`
                        : `✅ Updated ${oldRev.substring(0, 7)} → ${newRev.substring(0, 7)}`;
                    console.log('[update] Git update:', updateSummary);
                } catch (gitErr) {
                    console.warn('[update] Git update failed, trying ZIP fallback:', gitErr.message);
                    const { copiedFiles } = await updateViaZip(sock, chatId, message, zipOverride);
                    updateSummary = `✅ Updated via ZIP (${copiedFiles.length} files)`;
                }
            } else {
                const { copiedFiles } = await updateViaZip(sock, chatId, message, zipOverride);
                updateSummary = `✅ Updated via ZIP (${copiedFiles.length} files)`;
            }

            await sock.sendMessage(chatId, { text: updateSummary }, { quoted: message });
        }

        try {
            const v = require('../settings').version || '';
            await sock.sendMessage(chatId, { text: `> *Initialization started ...🆙️*` }, { quoted: message });
            await sock.sendMessage(chatId, {
                react: { text: '💓', key: message.key }
            });
        } catch {
            await sock.sendMessage(chatId, { text: 'Restarted Successfully. Enjoy!' }, { quoted: message });
        }

        await restartProcess(sock, chatId, message);
    } catch (err) {
        console.error('Update failed:', err);
        await sock.sendMessage(chatId, { text: `❌ Update failed:\n${String(err.message || err)}` }, { quoted: message });
    }
}

module.exports = updateCommand;
