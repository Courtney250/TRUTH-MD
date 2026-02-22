const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'data', 'messageCount.json');
const onlineStatusFilePath = path.join(__dirname, '..', 'data', 'onlineStatus.json');
const OFFLINE_THRESHOLD_MINUTES = 5; // User considered offline after 5 minutes

function loadJson(filePath) {
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        return JSON.parse(data);
    }
    return {};
}

function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadMessageCounts() {
    return loadJson(dataFilePath);
}

function saveMessageCounts(messageCounts) {
    saveJson(dataFilePath, messageCounts);
}

function loadOnlineStatus() {
    return loadJson(onlineStatusFilePath);
}

function saveOnlineStatus(onlineStatus) {
    saveJson(onlineStatusFilePath, onlineStatus);
}

function incrementMessageCount(groupId, userId) {
    const messageCounts = loadMessageCounts();

    if (!messageCounts[groupId]) {
        messageCounts[groupId] = {};
    }

    if (!messageCounts[groupId][userId]) {
        messageCounts[groupId][userId] = 0;
    }

    messageCounts[groupId][userId] += 1;
    saveMessageCounts(messageCounts);
}

function updateUserActivity(groupId, userId) {
    const onlineStatus = loadOnlineStatus();
    
    if (!onlineStatus[groupId]) {
        onlineStatus[groupId] = {};
    }
    
    onlineStatus[groupId][userId] = {
        lastSeen: Date.now(),
        isOnline: true
    };
    
    saveOnlineStatus(onlineStatus);
}

function getOnlineMembers(groupId) {
    const onlineStatus = loadOnlineStatus();
    const groupStatus = onlineStatus[groupId] || {};
    const now = Date.now();
    
    const result = {
        onlineMembers: [],
        offlineMembers: []
    };
    
    for (const [userId, status] of Object.entries(groupStatus)) {
        const minutesAgo = Math.floor((now - status.lastSeen) / 60000);
        const isOnline = minutesAgo <= OFFLINE_THRESHOLD_MINUTES;
        
        const memberInfo = {
            userId: userId,
            lastSeen: status.lastSeen,
            minutesAgo: minutesAgo,
            isCurrentlyOnline: isOnline
        };
        
        if (isOnline) {
            result.onlineMembers.push(memberInfo);
        } else {
            result.offlineMembers.push(memberInfo);
        }
    }
    
    // Sort online members by most recent activity
    result.onlineMembers.sort((a, b) => a.minutesAgo - b.minutesAgo);
    
    // Sort offline members by most recent first
    result.offlineMembers.sort((a, b) => a.minutesAgo - b.minutesAgo);
    
    return result;
}

function formatTimeAgo(minutes) {
    if (minutes === 0) return 'just now';
    
    if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function listOnlineCommand(sock, chatId, isGroup) {
    if (!isGroup) {
        sock.sendMessage(chatId, { text: 'This command is only available in group chats.' });
        return;
    }

    const { onlineMembers } = getOnlineMembers(chatId);
    
    if (onlineMembers.length === 0) {
        sock.sendMessage(chatId, { text: 'No members are currently online.' });
        return;
    }

    let message = '🟢 Online Members 🟢\n\n';
    onlineMembers.forEach((member, index) => {
        message += `${index + 1}. @${member.userId.split('@')[0]} - Last active: ${formatTimeAgo(member.minutesAgo)}\n`;
    });
    
    message += `\nTotal online: ${onlineMembers.length}`;

    sock.sendMessage(chatId, { 
        text: message, 
        mentions: onlineMembers.map(member => member.userId) 
    });
}

function listOfflineCommand(sock, chatId, isGroup) {
    if (!isGroup) {
        sock.sendMessage(chatId, { text: 'This command is only available in group chats.' });
        return;
    }

    const { offlineMembers } = getOnlineMembers(chatId);
    
    if (offlineMembers.length === 0) {
        sock.sendMessage(chatId, { text: 'No members are currently offline.' });
        return;
    }

    let message = '🔴 Offline Members 🔴\n\n';
    offlineMembers.forEach((member, index) => {
        message += `${index + 1}. @${member.userId.split('@')[0]} - Last seen: ${formatTimeAgo(member.minutesAgo)}\n`;
    });
    
    message += `\nTotal offline: ${offlineMembers.length}`;

    sock.sendMessage(chatId, { 
        text: message, 
        mentions: offlineMembers.map(member => member.userId) 
    });
}

function topMembers(sock, chatId, isGroup) {
    if (!isGroup) {
        sock.sendMessage(chatId, { text: 'This command is only available in group chats.' });
        return;
    }

    const messageCounts = loadMessageCounts();
    const groupCounts = messageCounts[chatId] || {};

    const sortedMembers = Object.entries(groupCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    if (sortedMembers.length === 0) {
        sock.sendMessage(chatId, { text: 'No message activity recorded yet.' });
        return;
    }

    let message = '🏆 Top Members Based on Message Count:\n\n';
    sortedMembers.forEach(([userId, count], index) => {
        message += `${index + 1}. 🔹@${userId.split('@')[0]} - ${count} messages\n`;
    });

    sock.sendMessage(chatId, { text: message, mentions: sortedMembers.map(([userId]) => userId) });
}

// Function to update both message count and online status
function handleUserActivity(groupId, userId) {
    incrementMessageCount(groupId, userId);
    updateUserActivity(groupId, userId);
}

// Optional: Cleanup function to periodically update offline status
function cleanupOfflineUsers() {
    const onlineStatus = loadOnlineStatus();
    const now = Date.now();
    let changed = false;
    
    for (const groupId in onlineStatus) {
        for (const userId in onlineStatus[groupId]) {
            const status = onlineStatus[groupId][userId];
            const minutesAgo = Math.floor((now - status.lastSeen) / 60000);
            
            if (minutesAgo > OFFLINE_THRESHOLD_MINUTES && status.isOnline) {
                onlineStatus[groupId][userId].isOnline = false;
                changed = true;
            }
        }
    }
    
    if (changed) {
        saveOnlineStatus(onlineStatus);
    }
}

// Run cleanup every minute (optional)
setInterval(cleanupOfflineUsers, 60000);

module.exports = { 
    incrementMessageCount, 
    topMembers, 
    listOnlineCommand, 
    listOfflineCommand,
    handleUserActivity,
    updateUserActivity,
    getOnlineMembers
};
