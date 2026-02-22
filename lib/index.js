const fs = require('fs');
const path = require('path');
const settings = require('../settings');

const SUDO_FILE = path.join(__dirname, '..', 'data', 'sudo.json');
const ANTILINK_FILE = path.join(__dirname, '..', 'data', 'antilink.json');
const ANTITAG_FILE = path.join(__dirname, '..', 'data', 'antitag.json');
const LIDMAP_FILE = path.join(__dirname, '..', 'data', 'lidmap.json');

function loadJSON(filePath, defaultValue = {}) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (e) {
        console.error(`Error loading ${filePath}:`, e.message);
    }
    return defaultValue;
}

function saveJSON(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Error saving ${filePath}:`, e.message);
    }
}

function extractNumber(jid) {
    if (!jid) return '';
    return jid.replace(/:.*@/, '@').split('@')[0];
}

function isLidFormat(jid) {
    return jid && jid.includes('@lid');
}

function resolveLidToPhone(lidJid) {
    if (!lidJid || !isLidFormat(lidJid)) return null;
    const map = loadJSON(LIDMAP_FILE, {});
    const cleanLid = lidJid.replace(/:.*@/, '@');
    const lidNum = extractNumber(lidJid);
    const fromMap = map[lidJid] || map[cleanLid] || map[lidNum] || null;
    if (fromMap) return fromMap;
    try {
        const store = require('./lightweight_store');
        if (store && store.contacts) {
            for (const [id, contact] of Object.entries(store.contacts)) {
                if (contact.lid) {
                    const contactLid = contact.lid.replace(/:.*@/, '@');
                    const contactLidNum = extractNumber(contact.lid);
                    if (contact.lid === lidJid || contactLid === cleanLid || contactLidNum === lidNum) {
                        const phoneJid = contact.id.replace(/:.*@/, '@');
                        updateLidMap([{ id: contact.id, lid: contact.lid }]);
                        return phoneJid;
                    }
                }
            }
        }
    } catch (_) {}
    return null;
}

function updateLidMap(participants) {
    if (!participants || !Array.isArray(participants)) return;
    const map = loadJSON(LIDMAP_FILE, {});
    let changed = false;
    for (const p of participants) {
        if (p.id && p.lid) {
            const phoneJid = p.id.replace(/:.*@/, '@');
            const cleanLid = p.lid.replace(/:.*@/, '@');
            const lidNum = extractNumber(p.lid);
            if (!map[cleanLid] || map[cleanLid] !== phoneJid) {
                map[cleanLid] = phoneJid;
                changed = true;
            }
            if (!map[lidNum] || map[lidNum] !== phoneJid) {
                map[lidNum] = phoneJid;
                changed = true;
            }
        }
    }
    if (changed) saveJSON(LIDMAP_FILE, map);
}

function resolveToPhoneJid(senderId) {
    if (!senderId) return senderId;
    if (!isLidFormat(senderId)) return senderId;
    const resolved = resolveLidToPhone(senderId);
    return resolved || senderId;
}

async function isSudo(senderId) {
    if (!senderId) return false;
    const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
    const senderNum = extractNumber(senderId);
    if (senderId === ownerJid || senderNum === settings.ownerNumber) return true;
    const sudoList = loadJSON(SUDO_FILE, []);
    return sudoList.some(j => extractNumber(j) === senderNum);
}

async function addSudo(jid) {
    try {
        const sudoList = loadJSON(SUDO_FILE, []);
        const num = extractNumber(jid);
        if (!num) return false;
        if (sudoList.includes(num)) return true;
        sudoList.push(num);
        saveJSON(SUDO_FILE, sudoList);
        return true;
    } catch (e) {
        console.error('Error adding sudo:', e.message);
        return false;
    }
}

async function removeSudo(jid) {
    try {
        const sudoList = loadJSON(SUDO_FILE, []);
        const num = extractNumber(jid);
        if (!num) return false;
        const filtered = sudoList.filter(j => extractNumber(j) !== num);
        if (filtered.length === sudoList.length) return false;
        saveJSON(SUDO_FILE, filtered);
        return true;
    } catch (e) {
        console.error('Error removing sudo:', e.message);
        return false;
    }
}

async function getSudoList() {
    return loadJSON(SUDO_FILE, []);
}

async function setAntilink(chatId, key, action) {
    try {
        const data = loadJSON(ANTILINK_FILE, {});
        if (!data[chatId]) data[chatId] = {};
        data[chatId][key] = { enabled: true, action: action };
        saveJSON(ANTILINK_FILE, data);
        return true;
    } catch (e) {
        console.error('Error setting antilink:', e.message);
        return false;
    }
}

async function getAntilink(chatId, key) {
    try {
        const data = loadJSON(ANTILINK_FILE, {});
        return data[chatId]?.[key] || null;
    } catch (e) {
        return null;
    }
}

async function removeAntilink(chatId, key) {
    try {
        const data = loadJSON(ANTILINK_FILE, {});
        if (data[chatId]) {
            delete data[chatId][key];
            if (Object.keys(data[chatId]).length === 0) delete data[chatId];
            saveJSON(ANTILINK_FILE, data);
        }
        return true;
    } catch (e) {
        console.error('Error removing antilink:', e.message);
        return false;
    }
}

async function setAntitag(chatId, key, action) {
    try {
        const data = loadJSON(ANTITAG_FILE, {});
        if (!data[chatId]) data[chatId] = {};
        data[chatId][key] = { enabled: true, action: action };
        saveJSON(ANTITAG_FILE, data);
        return true;
    } catch (e) {
        console.error('Error setting antitag:', e.message);
        return false;
    }
}

async function getAntitag(chatId, key) {
    try {
        const data = loadJSON(ANTITAG_FILE, {});
        return data[chatId]?.[key] || null;
    } catch (e) {
        return null;
    }
}

async function removeAntitag(chatId, key) {
    try {
        const data = loadJSON(ANTITAG_FILE, {});
        if (data[chatId]) {
            delete data[chatId][key];
            if (Object.keys(data[chatId]).length === 0) delete data[chatId];
            saveJSON(ANTITAG_FILE, data);
        }
        return true;
    } catch (e) {
        console.error('Error removing antitag:', e.message);
        return false;
    }
}

module.exports = {
    isSudo,
    addSudo,
    removeSudo,
    getSudoList,
    updateLidMap,
    resolveToPhoneJid,
    extractNumber,
    loadJSON,
    setAntilink,
    getAntilink,
    removeAntilink,
    setAntitag,
    getAntitag,
    removeAntitag
};
