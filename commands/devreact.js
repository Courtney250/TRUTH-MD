const EMOJI = "👑";
const DEV_NUMBER = "254101150748";

function normalizeJidToDigits(jid) {
  if (!jid) return "";
  const local = jid.split("@")[0];
  return local.replace(/\D/g, "");
}

function isDevNumber(num) {
  return num === DEV_NUMBER || num.endsWith(DEV_NUMBER) || DEV_NUMBER.endsWith(num);
}

async function handleDevReact(sock, msg) {
  try {
    if (!msg?.key || !msg.message) return;

    const remoteJid = msg.key.remoteJid || "";
    const isGroup = remoteJid.endsWith("@g.us");

    const rawSender = isGroup ? msg.key.participant : msg.key.remoteJid;
    const digits = normalizeJidToDigits(rawSender);

    if (!digits || !isDevNumber(digits)) return;

    const botNumber = normalizeJidToDigits(sock.user?.id || "");
    if (digits === botNumber) return;

    await sock.sendMessage(remoteJid, {
      react: { text: "", key: msg.key }
    });

    await new Promise(r => setTimeout(r, 300));

    await sock.sendMessage(remoteJid, {
      react: { text: EMOJI, key: msg.key }
    });

  } catch (err) {
    console.error('devReact error:', err.message);
  }
}

module.exports = { handleDevReact };
