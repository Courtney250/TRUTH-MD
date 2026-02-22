const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'config.db');

let db;
function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.exec(`CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);
    }
    return db;
}

function getConfig(key, defaultValue = null) {
    try {
        const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key);
        return row ? row.value : defaultValue;
    } catch (e) {
        console.error('getConfig error:', e.message);
        return defaultValue;
    }
}

function setConfig(key, value) {
    try {
        getDb().prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, String(value));
        return true;
    } catch (e) {
        console.error('setConfig error:', e.message);
        return false;
    }
}

function getBotName() {
    const settings = require('../settings');
    return getConfig('BOTNAME', settings.botName || 'TRUTH MD');
}

function deleteConfig(key) {
    try {
        getDb().prepare('DELETE FROM config WHERE key = ?').run(key);
        return true;
    } catch (e) {
        console.error('deleteConfig error:', e.message);
        return false;
    }
}

module.exports = { getConfig, setConfig, getBotName, deleteConfig };
