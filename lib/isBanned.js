const fs = require('fs');
const path = require('path');

const BANNED_FILE = path.join(__dirname, '..', 'data', 'banned.json');

function loadBanned() {
    try {
        if (fs.existsSync(BANNED_FILE)) {
            return JSON.parse(fs.readFileSync(BANNED_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Error loading banned list:', e.message);
    }
    return [];
}

function saveBanned(list) {
    try {
        fs.writeFileSync(BANNED_FILE, JSON.stringify(list, null, 2));
    } catch (e) {
        console.error('Error saving banned list:', e.message);
    }
}

function isBanned(senderId) {
    const list = loadBanned();
    return list.includes(senderId);
}

function addBan(senderId) {
    const list = loadBanned();
    if (!list.includes(senderId)) {
        list.push(senderId);
        saveBanned(list);
        return true;
    }
    return false;
}

function removeBan(senderId) {
    let list = loadBanned();
    const idx = list.indexOf(senderId);
    if (idx !== -1) {
        list.splice(idx, 1);
        saveBanned(list);
        return true;
    }
    return false;
}

module.exports = { isBanned, addBan, removeBan };
