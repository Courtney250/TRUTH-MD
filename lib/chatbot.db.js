const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'chatbot.db');

let db;
function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.exec(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);
        db.exec(`CREATE TABLE IF NOT EXISTS user_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp INTEGER DEFAULT (strftime('%s','now'))
        )`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_user_messages_user ON user_messages(user_id)`);
    }
    return db;
}

function getSetting(key) {
    try {
        const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? row.value : null;
    } catch (e) {
        console.error('getSetting error:', e.message);
        return null;
    }
}

function setSetting(key, value) {
    try {
        getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
        return true;
    } catch (e) {
        console.error('setSetting error:', e.message);
        return false;
    }
}

function storeUserMessage(userId, message) {
    try {
        getDb().prepare('INSERT INTO user_messages (user_id, message) VALUES (?, ?)').run(userId, message);
        const count = getDb().prepare('SELECT COUNT(*) as cnt FROM user_messages WHERE user_id = ?').get(userId);
        if (count && count.cnt > 50) {
            getDb().prepare(`DELETE FROM user_messages WHERE user_id = ? AND id NOT IN (
                SELECT id FROM user_messages WHERE user_id = ? ORDER BY id DESC LIMIT 50
            )`).run(userId, userId);
        }
        return true;
    } catch (e) {
        console.error('storeUserMessage error:', e.message);
        return false;
    }
}

function getUserMessages(userId, limit = 10) {
    try {
        const rows = getDb().prepare('SELECT message FROM user_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit);
        return rows.map(r => r.message).reverse();
    } catch (e) {
        console.error('getUserMessages error:', e.message);
        return [];
    }
}

module.exports = { getSetting, setSetting, storeUserMessage, getUserMessages };
