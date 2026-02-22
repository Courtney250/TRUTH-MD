const fs = require('fs');
const path = require('path');

const PAYMENT_FILE = path.join(__dirname, '../data/payments.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(PAYMENT_FILE))) {
    fs.mkdirSync(path.dirname(PAYMENT_FILE), { recursive: true });
}

function getPayments() {
    try {
        if (!fs.existsSync(PAYMENT_FILE)) return {};
        return JSON.parse(fs.readFileSync(PAYMENT_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function savePayments(payments) {
    fs.writeFileSync(PAYMENT_FILE, JSON.stringify(payments, null, 2));
}

async function paymentCommand(sock, chatId, message, prefix) {
    const payments = getPayments();
    const userPayments = payments['global'] || [];

    if (userPayments.length === 0) {
        return sock.sendMessage(chatId, { 
            text: `❌ *No payment methods set.*\n\nUse *${prefix}setpayment <name>|<method>|<details>* to add one.\nExample: *${prefix}setpayment COURTNEY|M-Pesa|+254769575667*` 
        }, { quoted: message });
    }

    let text = `💳 *AVAILABLE PAYMENT METHODS* 💳\n\n`;
    userPayments.forEach((p, i) => {
        text += `${i + 1}. *Name:* ${p.name}\n   *Method:* ${p.method}\n   *Details:* ${p.details}\n\n`;
    });
    text += `_Please ensure you use the correct details for transactions._\n\n*Note:* Provide a screenshot after payment for verification.`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

async function setPaymentCommand(sock, chatId, senderId, message, args, prefix, isSudo) {
    if (!message.key.fromMe && !isSudo) {
        return sock.sendMessage(chatId, { text: '❌ *Only the bot owner can set payment methods.*' }, { quoted: message });
    }

    const parts = args.split('|').map(s => s.trim());
    if (parts.length < 3) {
        return sock.sendMessage(chatId, { 
            text: `❌ *Invalid format.*\n\nUsage: *${prefix}setpayment <name>|<method>|<details>*\nExample: *${prefix}setpayment COURTNEY|M-Pesa|+254769575667*` 
        }, { quoted: message });
    }

    const [name, method, details] = parts;
    const payments = getPayments();
    
    if (!payments['global']) payments['global'] = [];
    payments['global'].push({ name, method, details });
    
    savePayments(payments);

    await sock.sendMessage(chatId, { 
        text: `✅ *Payment method added successfully!*\n\n*Name:* ${name}\n*Method:* ${method}\n*Details:* ${details}` 
    }, { quoted: message });
}

module.exports = { paymentCommand, setPaymentCommand };
