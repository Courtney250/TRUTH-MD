const axios = require("axios");

const AI_MODELS = {
    gpt: { endpoint: 'https://apis.xwolf.space/api/ai/gpt', name: 'GPT' },
    mistral: { endpoint: 'https://apis.xwolf.space/api/ai/mistral', name: 'Mistral' },
    deepseek: { endpoint: 'https://apis.xwolf.space/api/ai/deepseek', name: 'DeepSeek' },
    cohere: { endpoint: 'https://apis.xwolf.space/api/ai/cohere', name: 'Cohere' },
    claude: { endpoint: 'https://apis.xwolf.space/api/ai/claude', name: 'Claude' },
    gemini: { endpoint: 'https://apis.xwolf.space/api/ai/gemini', name: 'Gemini' },
    venice: { endpoint: 'https://apis.xwolf.space/api/ai/venice', name: 'Venice' },
    groq: { endpoint: 'https://apis.xwolf.space/api/ai/groq', name: 'Groq' }
};

async function aiCommand(sock, chatId, message, modelKey) {
    try {
        await sock.sendMessage(chatId, {
            react: { text: '🛰️', key: message.key }
        });

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const parts = text.split(' ');
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            const modelList = Object.keys(AI_MODELS).map(k => `.${k}`).join(', ');
            return await sock.sendMessage(chatId, {
                text: `Please provide a question.\n\nExample: .${modelKey || 'gpt'} write a basic html code\n\nAvailable AI models: ${modelList}`
            }, { quoted: message });
        }

        const model = AI_MODELS[modelKey] || AI_MODELS.gpt;

        const res = await axios.post(model.endpoint, {
            prompt: query
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });

        if (!res.data || !res.data.success) {
            throw new Error('API returned unsuccessful response');
        }

        const answer = res.data.response;

        if (!answer) {
            throw new Error('No answer in API response');
        }

        await sock.sendMessage(chatId, {
            text: `*${model.name}:*\n\n${answer}`
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (err) {
        console.error(`AI (${modelKey}) error:`, err.message);
        await sock.sendMessage(chatId, {
            text: `❎ Error with ${(AI_MODELS[modelKey] || AI_MODELS.gpt).name}: ${err.message}`
        }, { quoted: message });
    }
}

module.exports = aiCommand;
module.exports.AI_MODELS = AI_MODELS;
