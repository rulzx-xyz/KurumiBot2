import axios from 'axios';

const pluginConfig = {
    name: 'tiktokboost',
    alias: ['ttboost', 'boosttiktok'],
    category: 'tools',
    description: 'Boost views or engagement for TikTok videos',
    usage: '.tiktokboost <url>',
    example: '.tiktokboost https://www.tiktok.com/@username/video/123456789',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 3, // Menggantikan limit dengan sistem energi bawaan bot lu
    isEnabled: true
}

async function handler(m, { sock, args }) {
    try {
        // Ambil teks baik dari args maupun dari body pesan langsung
        const textMsg = m.text || m.body || "";
        const text = args.join(' ') || textMsg.trim().split(/ +/).slice(1).join(' ');

        if (!text) {
            return await m.reply(`⚠️ *TikTok Booster*\n\nPlease provide a TikTok video URL\n\nExample: ${pluginConfig.example}`);
        }

        const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
        if (!urlMatch) {
            return await m.reply(`❌ Invalid URL. Please provide a valid TikTok video link.`);
        }

        const tiktokUrl = urlMatch[0];

        if (!tiktokUrl.includes('tiktok.com')) {
            return await m.reply(`❌ Please provide a valid TikTok URL.`);
        }

        // Gunakan sock untuk reaksi (m.react kalau didukung base, atau lewat sock)
        if (typeof m.react === 'function') {
            await m.react('⏳');
        }
        
        await m.reply(`🔄 *Processing your request...*\n\n📱 Boosting TikTok video:\n${tiktokUrl}`);

        const apiUrl = `https://omegatech-api.dixonomega.tech/api/Fun/Tiktok-booster?action=boost&url=${encodeURIComponent(tiktokUrl)}`;
        
        const response = await axios.get(apiUrl, {
            timeout: 30000
        });

        if (!response.data.success) {
            throw new Error('API request failed');
        }

        const data = response.data.data;
        const timestamp = new Date(response.data.timestamp).toLocaleString();

        let reply = `🎯 *TIKTOK BOOSTER SUCCESS*\n\n`;
        reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
        reply += `📹 *Title:* ${data.title || 'Not available'}\n`;
        reply += `👤 *Author:* ${data.author || 'Unknown'}\n`;
        reply += `🔗 *Username:* @${data.username || 'Unknown'}\n`;
        reply += `📊 *Status:* ${data.status || 'Processing'}\n`;
        reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
        reply += `\n📝 *Note:* The likes and views take time to register due to personal reasons.\n`;
        reply += `\n🕐 *Timestamp:* ${timestamp}\n`;
        reply += `🔹 *Source:* ${response.data.source || 'Omegatech'}\n`;
        reply += `🔹 *Attribution:* ${response.data.attribution || '@Omegatech-01'}`;

        if (typeof m.react === 'function') {
            await m.react('✅');
        }
        await m.reply(reply);

    } catch (error) {
        console.error('TikTok Booster Error:', error);
        if (typeof m.react === 'function') {
            await m.react('❌');
        }
        
        let errorMsg = '❌ *Failed to boost TikTok video*\n\n';
        if (error.response) {
            errorMsg += `📌 Status: ${error.response.status}\n`;
            errorMsg += `📌 Error: ${error.response.data?.message || 'Unknown error'}`;
        } else if (error.request) {
            errorMsg += `📌 No response from server. Please try again later.`;
        } else {
            errorMsg += `📌 Error: ${error.message}`;
        }
        
        await m.reply(errorMsg);
    }
}

export { pluginConfig as config, handler }