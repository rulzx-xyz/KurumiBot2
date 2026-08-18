const pluginConfig = {
    name: 'spamswgc',
    alias: ['spamsgc', 'spamstatusgc', 'spamswgroup'],
    category: 'owner',
    description: 'Spam Group Status V2 — pilih grup via button ATAU target langsung by ID grup, lalu burst tanpa jeda',
    usage: '.spamswgc <jumlah 10-100> [id@g.us ...|all] (reply media / + teks)',
    example: '.spamswgc 100 all',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 5,
    isEnabled: true
}

// Session sementara media + jumlah spam pending per user (mode pilih grup)
if (!global._spamswgcPending) global._spamswgcPending = new Map();

const MIN_SPAM = 1; 
const MAX_SPAM = 1000;

// Cari semua JID grup di sebuah teks
const GROUP_JID_RE = /[0-9]+(?:-[0-9]+)?@g\.us/gi;

// ---------------------------------------------------------
// FUNGSI HELPER
// ---------------------------------------------------------

async function prepareGroupStatus(buf, mediaType, caption) {
    if (!mediaType || !buf) {
        return {
            mediaMessage: { text: caption || '' },
            msgType: 'extendedTextMessage'
        };
    }
    if (mediaType.includes('image')) {
        return {
            mediaMessage: { image: buf, caption: caption || '' },
            msgType: 'imageMessage'
        };
    } else if (mediaType.includes('video')) {
        return {
            mediaMessage: { video: buf, caption: caption || '' },
            msgType: 'videoMessage'
        };
    } else if (mediaType.includes('audio')) {
        return {
            mediaMessage: { audio: buf, mimetype: 'audio/mp4', ptt: true },
            msgType: 'audioMessage'
        };
    }
    throw new Error('Tipe media tidak didukung untuk status grup.');
}

async function sendPreparedGroupStatus(sock, jid, mediaMessage) {
    try {
        await sock.sendMessage(jid, { groupStatusMessage: mediaMessage });
        return true;
    } catch (e) {
        return false;
    }
}

async function runBurst({ sock, m, targets, buf, mediaType, caption, count }) {
    const tipe = mediaType ? mediaType.replace('Message', '').toUpperCase() : 'TEKS';
    const totalPlanned = count * targets.length;

    let mediaMessage;
    try {
        const prepared = await prepareGroupStatus(buf, mediaType, caption);
        mediaMessage = prepared.mediaMessage;
    } catch (e) {
        await m.reply(`❌ Gagal menyiapkan pesan: ${e.message}`);
        return { ok: 0, total: totalPlanned };
    }

    await m.reply(
        `🚀 *SPAM SWGC (BURST) DIMULAI*\n\n` +
        `📋 Tipe: ${tipe}\n` +
        `🔁 Jumlah: *${count}x* per grup\n` +
        `👥 Target: *${targets.length}* grup\n` +
        `⚡ Mode: kirim *serempak* tanpa jeda\n\n` +
        `⏳ Tunggu sebentar...`
    );

    const jobs = [];
    for (const t of targets) {
        for (let i = 0; i < count; i++) {
            jobs.push(sendPreparedGroupStatus(sock, t.id, mediaMessage));
        }
    }

    const results = await Promise.allSettled(jobs);
    const ok = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    return { ok, total: totalPlanned };
}

async function extractMedia(m, sock, captionArg) {
    const q = m.quoted ? m.quoted : m;
    const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'audioMessage'];
    const isDirectMedia = MEDIA_TYPES.includes(m.mtype || m.type);
    const isQuotedMedia = m.quoted && MEDIA_TYPES.includes(m.quoted.mtype || m.quoted.type);

    let buf = null;
    let mediaType = null;
    let caption = captionArg || '';

    let activeMsg = isDirectMedia ? m : (isQuotedMedia ? m.quoted : null);
    if (!activeMsg) return { buf, mediaType, caption: caption || m.text || '', hasMedia: false };

    mediaType = activeMsg.mtype || activeMsg.type;

    try {
        if (typeof activeMsg.download === 'function') {
            buf = await activeMsg.download();
        } else if (typeof sock.downloadMediaMessage === 'function') {
            buf = await sock.downloadMediaMessage(activeMsg);
        } else {
            // DYNAMIC IMPORT ADA DI SINI BIAR GAK PENDING
            const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
            const typeStr = mediaType.replace('Message', '').toLowerCase();
            const stream = await downloadContentFromMessage(activeMsg.msg || activeMsg, typeStr);
            const chunks = [];
            for await (const c of stream) chunks.push(c);
            buf = Buffer.concat(chunks);
        }
    } catch (e) {
        console.error('Extract media error:', e);
    }

    if (!caption) caption = activeMsg.caption || activeMsg.text || '';
    
    return { buf, mediaType, caption, hasMedia: !!buf };
}

async function resolveTargets(sock, jids) {
    const uniq = [...new Set(jids)];
    const kept = [];
    for (const jid of uniq) {
        let name = 'Grup';
        try { name = (await sock.groupMetadata(jid)).subject || 'Grup'; } catch {}
        kept.push({ id: jid, name });
    }
    return { targets: kept };
}

// ---------------------------------------------------------
// HANDLER UTAMA
// ---------------------------------------------------------

async function handler(m, { sock, args }) {
    const text = args.join(' ');
    const senderNumber = m.sender || m.key.participant;
    const prefix = m.prefix || ".";

    // ==========================================
    // 1. CALLBACK DARI TOMBOL (send_<JID> / send_all)
    // ==========================================
    if (text && text.startsWith('send_')) {
        const pending = global._spamswgcPending.get(senderNumber);
        if (!pending || (!pending.buf && !pending.caption && !pending.hasMedia)) {
            return await m.reply('⚠️ Sesi kedaluwarsa. Silakan kirim ulang media/teks + *.spamswgc <jumlah>*');
        }

        let targets = [];
        if (text === 'send_all') {
            const groups = await sock.groupFetchAllParticipating();
            targets = Object.values(groups).map(g => ({ id: g.id, name: g.subject || 'Grup' }));
            if (!targets.length) return await m.reply('❌ Bot tidak ada di grup manapun.');
        } else {
            const targetJid = text.replace('send_', '').trim();
            if (!targetJid.endsWith('@g.us')) return await m.reply('❌ JID tidak valid.');
            let name = 'Grup';
            try { name = (await sock.groupMetadata(targetJid)).subject || 'Grup'; } catch {}
            targets = [{ id: targetJid, name }];
        }

        global._spamswgcPending.delete(senderNumber);
        if (typeof m.react === 'function') await m.react('⏳');
        
        const { ok, total } = await runBurst({
            sock, m, targets,
            buf: pending.buf, mediaType: pending.mediaType, caption: pending.caption, count: pending.count,
        });
        
        const tipe = pending.mediaType ? pending.mediaType.replace('Message', '').toUpperCase() : 'TEKS';
        if (typeof m.react === 'function') await m.react('✅');
        
        return await m.reply(
            `✅ *SPAM SWGC SELESAI!*\n\n` +
            `Berhasil: *${ok}/${total}*\n` +
            `👥 Target: *${targets.length}* grup\n` +
            `📋 Tipe: ${tipe}\n` +
            `📌 Cek di *tab Status* WhatsApp`
        );
    }

    // ==========================================
    // 2. PARSING TEKS AWAL
    // ==========================================
    const raw = (text || '').trim();
    const parts = raw.split(/ +/);
    const countRaw = parts.shift();
    const count = parseInt(countRaw, 10);
    let rest = parts.join(' ');

    const jidMatches = rest.match(GROUP_JID_RE) || [];
    const wantAll = /\b(all|semua)\b/i.test(rest);
    const captionArg = rest
        .replace(GROUP_JID_RE, '')
        .replace(/\b(all|semua)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!countRaw || Number.isNaN(count)) {
        return await m.reply(
            `🔁 *SPAM SWGC — GROUP STATUS*\n\n` +
            `Cara pakai:\n` +
            `• *${prefix}spamswgc <jumlah>* → pilih grup lewat tombol\n` +
            `• *${prefix}spamswgc <jumlah> <id@g.us>* → langsung ke grup itu\n` +
            `• *${prefix}spamswgc <jumlah> all* → spam semua grup\n\n` +
            `Jumlah: *${MIN_SPAM}*–*${MAX_SPAM}*.\n` +
            `Contoh: *${prefix}spamswgc 100 yahhh*`
        );
    }

    if (count < MIN_SPAM || count > MAX_SPAM) {
        return await m.reply(`❌ Jumlah harus antara *${MIN_SPAM}* dan *${MAX_SPAM}*.`);
    }

    let extracted;
    try {
        extracted = await extractMedia(m, sock, captionArg);
    } catch (e) {
        return await m.reply(`❌ Gagal download media: ${e.message}`);
    }

    const { buf, mediaType, caption, hasMedia } = extracted;
    
    let finalCaption = caption;
    if (!hasMedia && !caption) {
        return await m.reply(`❌ Sertakan media atau teks.\nContoh: *${prefix}spamswgc 100 halo semua*`);
    }

    // ==========================================
    // 3. TARGET LANGSUNG (MODE BURST OTOMATIS)
    // ==========================================
    if (jidMatches.length || wantAll) {
        let targets = [];
        let invalid = [];
        
        if (wantAll && !jidMatches.length) {
            const groups = await sock.groupFetchAllParticipating();
            targets = Object.values(groups).map(g => ({ id: g.id, name: g.subject || 'Grup' }));
        } else {
            let joined = {};
            try { joined = await sock.groupFetchAllParticipating(); } catch {}
            const known = new Set(Object.keys(joined));
            const valid = jidMatches.filter(j => known.size ? known.has(j) : true);
            invalid = jidMatches.filter(j => known.size && !known.has(j));
            const r = await resolveTargets(sock, valid);
            targets = r.targets;
        }

        if (!targets.length) {
            let msgErr = '❌ Tidak ada grup target yang valid.';
            if (invalid.length) msgErr += `\n⚠️ JID salah: ${invalid.length}`;
            return await m.reply(msgErr);
        }

        if (typeof m.react === 'function') await m.react('⏳');
        const { ok, total } = await runBurst({
            sock, m, targets, buf, mediaType, caption: finalCaption, count,
        });
        const tipe = mediaType ? mediaType.replace('Message', '').toUpperCase() : 'TEKS';
        if (typeof m.react === 'function') await m.react('✅');
        
        let extra = '';
        if (invalid.length) extra += `\n⚠️ JID tak dikenal: *${invalid.length}*`;
        return await m.reply(
            `✅ *SPAM SWGC SELESAI!*\n\n` +
            `Berhasil: *${ok}/${total}*\n` +
            `👥 Target: *${targets.length}* grup${extra}\n` +
            `📋 Tipe: ${tipe}`
        );
    }

    // ==========================================
    // 4. MUNCULKAN TOMBOL PILIH GRUP
    // ==========================================
    if (typeof m.react === 'function') await m.react('🔍');

    global._spamswgcPending.set(senderNumber, {
        buf, mediaType, caption: finalCaption, count, hasMedia,
        timestamp: Date.now(),
    });
    setTimeout(() => global._spamswgcPending.delete(senderNumber), 5 * 60 * 1000);

    const groups = await sock.groupFetchAllParticipating();
    const list = Object.values(groups);
    
    if (!list.length) return await m.reply('❌ Bot tidak ada di grup manapun.');

    const rows = list.map((g) => {
        const members = g.participants?.length || '?';
        return {
            title: `${g.subject}`,
            description: `👥 ${members} member`,
            id: `${prefix}spamswgc send_${g.id}`
        };
    });

    const tipe = mediaType ? mediaType.replace('Message', '').toUpperCase() : 'TEKS';
    let headerText = `🔁 *PILIH GRUP UNTUK SPAM SWGC*\n\n`;
    headerText += `📋 Konten: *${tipe}*\n`;
    headerText += `🔁 Jumlah: *${count}x* (burst tanpa jeda)\n`;
    headerText += `📝 Caption: _${finalCaption ? finalCaption.slice(0, 60) : 'Tanpa teks'}_\n`;
    headerText += `📊 Total grup: *${list.length}*\n\n`;
    headerText += `Pilih grup atau kirim ke semua:\n_(atau langsung: ${prefix}spamswgc ${count} <id@g.us>)_`;

    const buttonParams = {
        text: headerText,
        footer: '⚡ SPAMSWGC — Group Status V2 (burst)',
        interactiveButtons: [
            {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: "📋 PILIH GRUP",
                    sections: [
                        {
                            title: "📂 DAFTAR GRUP BOT",
                            rows: rows,
                        },
                    ],
                }),
            },
            {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: "🚀 SPAM KE SEMUA GRUP",
                    id: `${prefix}spamswgc send_all`,
                }),
            },
        ],
    };

    await sock.sendMessage(m.chat, buttonParams, { quoted: m });

    if (typeof m.react === 'function') await m.react('✅');
}

export { pluginConfig as config, handler }