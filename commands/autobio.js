const os = require("os");
const { getBotName } = require('../lib/configdb.js'); // Import getBotName function

const botStartTime = Date.now();
const BIO_UPDATE_INTERVAL = 60000;
let bioUpdateInterval = null;
let lastBioUpdate = null;

const detectPlatform = () => {
  if (process.env.DYNO) return "☁️ Heroku";
  if (process.env.RENDER) return "⚡ Render";
  if (process.env.PREFIX?.includes("termux")) return "📱 Termux";
  if (process.env.PORTS && process.env.CYPHERX_HOST_ID) return "🌀 TRUTH-MD";
  if (process.env.P_SERVER_UUID) return "🖥️ Panel";
  if (process.env.LXC) return "🐦‍⬛ LXC";

  switch (os.platform()) {
    case "win32": return "🪟 Windows";
    case "darwin": return "🍎 macOS";
    case "linux": return "🐧 Linux";
    default: return "❓ Unknown";
  }
};

const formatUptime = (ms) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(" ");
};

async function updateBotBio(sock) {
  const uptime = formatUptime(Date.now() - botStartTime);
  const botName = getBotName(); // Get bot name from configdb
  const bio = `⏰ Uptime: ${uptime} | ${detectPlatform()} | 🤖 ${botName}`;
  const finalBio = bio.length > 139 ? bio.slice(0, 136) + "..." : bio;
  await sock.updateProfileStatus(finalBio);
  lastBioUpdate = Date.now();
  console.log(`✅ Bio updated: ${finalBio}`);
}

async function startAutoBio(sock) {
  stopAutoBio();
  await updateBotBio(sock);
  bioUpdateInterval = setInterval(() => updateBotBio(sock), BIO_UPDATE_INTERVAL);
  console.log("🚀 Auto-bio started.");
}

function stopAutoBio() {
  if (bioUpdateInterval) clearInterval(bioUpdateInterval);
  bioUpdateInterval = null;
  console.log("⏹️ Auto-bio stopped.");
}

async function autoBioCommand(sock, chatId) {
  const uptime = formatUptime(Date.now() - botStartTime);
  const botName = getBotName(); // Get bot name from configdb
  const status = bioUpdateInterval
    ? `✅ Auto-Bio ACTIVE\nBot Name: ${botName}\nLast: ${lastBioUpdate ? new Date(lastBioUpdate).toLocaleTimeString() : "Never"}\nInterval: ${BIO_UPDATE_INTERVAL/1000}s\nPlatform: ${detectPlatform()}\nUptime: ${uptime}`
    : `⏸️ Auto-Bio INACTIVE\nBot Name: ${botName}\nPlatform: ${detectPlatform()}\nUptime: ${uptime}`;
  await sock.sendMessage(chatId, { text: status });
}

module.exports = { autoBioCommand, startAutoBio, stopAutoBio, updateBotBio };
