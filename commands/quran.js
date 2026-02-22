const axios = require('axios');

module.exports = async function quranCommand(sock, chatId, message, surahNumber) {
    try {
        if (!surahNumber || isNaN(surahNumber)) {
            await sock.sendMessage(chatId, { text: "📖 Usage: .quran <surah_number>\nExample: .quran 1" });
            return;
        }

        const url = `https://apis.davidcyriltech.my.id/quran?surah=${surahNumber}`;
        const res = await axios.get(url);

        if (!res.data.success) {
            await sock.sendMessage(chatId, { text: "❌ Could not fetch Surah. Please try another number." });
            return;
        }

        const { number, name, type, ayahCount, tafsir, recitation } = res.data.surah;

        // 1️⃣ Send surah info as text
        let reply = `📖 *Surah ${name.english}* (${name.arabic})\n\n`;
        reply += `🔢 Surah Number: ${number}\n📌 Type: ${type}\n📜 Ayahs: ${ayahCount}\n\n`;
        reply += `📝 Tafsir: ${tafsir.id}`;

        await sock.sendMessage(chatId, { text: reply });

        // 2️⃣ Send audio as PTT (voice note)
        await sock.sendMessage(chatId, {
            audio: { url: recitation },
            mimetype: "audio/mp4",
            ptt: true
        }, { quoted: message });

    } catch (err) {
        await sock.sendMessage(chatId, { text: "⚠️ Error fetching Surah. Try again later." });
        console.error("Quran command error:", err.message);
    }
};
