import fs from "fs";
import path from "path";
import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
    name: "upsw",
    alias: ["uploadsw", "statusbot", "swgcall"],
    category: "owner",
    description: "Upload status WA HD dan tag/kirim otomatis ke seluruh grup yang ada di bot",
    usage: ".upsw <caption atau reply media>",
    example: ".upsw Info mabar ges!",
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 2,
    isEnabled: true
};

async function handler(m, { sock }) {
    try {
        let rawText = m.text || m.body || "";
        let text = rawText.replace(/^\.upsw/i, '').trim();

        let q = m.quoted ? m.quoted : m;

        if (!text && q.caption) text = q.caption;
        
        if (text.includes('CLAIM SUCCESS - KURUMI CONVERTSW')) {
            text = ''; 
        }

        let mime = (q.msg || q).mimetype || q.mtype || m.mtype || q.type || '';
        let isVideo = /video/i.test(mime) || /videoMessage/i.test(mime);
        let isImage = /image/i.test(mime) || /imageMessage/i.test(mime);

        if (!isVideo && !isImage) {
            return await m.reply('❌ Balas atau kirim foto/video dengan caption `.upsw teksnya`');
        }

        await m.reply('⏳ Sedang memproses media dan mengambil daftar seluruh grup...');

        let mediaBuffer;
        
        if (typeof q.download === 'function') {
            mediaBuffer = await q.download();
        } 
        else if (typeof sock.downloadMediaMessage === 'function') {
            mediaBuffer = await sock.downloadMediaMessage(q);
        } 
        else {
            const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
            let type = isVideo ? 'video' : 'image';
            const stream = await downloadContentFromMessage(q.msg || q, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaBuffer = buffer;
        }

        if (!mediaBuffer) {
            return await m.reply('❌ Gagal menyedot media dari pesan tersebut.');
        }

        let mediaType = isVideo ? 'video' : 'image';
        
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const senderNumber = m.sender || m.key.remoteJid;
        
        // Ambil seluruh JID grup yang tersimpan di cache/database bot atau store sock
        let groupList = [];
        try {
            // Mengambil semua chats yang berakhiran @g.us (grup WhatsApp)
            const chats = sock.chats ? Object.values(sock.chats) : [];
            groupList = chats.filter(c => c.id && c.id.endsWith('@g.us')).map(c => c.id);
            
            // Fallback tambahan dari global.db jika ada
            if (global.db && global.db.data && global.db.data.chats) {
                const dbChats = Object.keys(global.db.data.chats).filter(id => id.endsWith('@g.us'));
                groupList = [...new Set([...groupList, ...dbChats])];
            }
        } catch (e) {
            console.error('Gagal mengambil list grup:', e);
        }

        // Gabungkan bot, owner, dan semua grup ke dalam target view status (Supaya kesebar/tag ke semua grup)
        const viewList = [botNumber, senderNumber, ...groupList];

        const statusOptions = {
            [mediaType]: mediaBuffer,
            caption: text,
            mimetype: isVideo ? 'video/mp4' : 'image/jpeg' 
        };

        // Eksekusi upload ke status@broadcast dengan jid list seluruh grup
        await sock.sendMessage('status@broadcast', statusOptions, {
            backgroundColor: '#000000',
            statusJidList: viewList
        });

        await m.reply(`✅ *BERHASIL UPLOAD STATUS!*\n\n📝 *Caption:* ${text ? text : '_(Tanpa Caption)_'}\n🌐 *Disebarkan ke:* ${groupList.length} Grup Aktif.`);
    } catch (error) {
        console.error('UpSW & Swgcall Plugin Error:', error);
        await m.reply('❌ *GAGAL*\n\n> ' + error.message);
    }
}

export { pluginConfig as config, handler };