import axios from 'axios'

const pluginConfig = {
    name: 'reportmass',
    alias: ['reportwa', 'spamreport'],
    category: 'owner',
    description: '⚠️ Report nomor WA massal (100x) - ILEGAL!',
    usage: '.reportmass <nomor> [jumlah]',
    example: '.reportmass 62857xxxxxxx 100',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 10,
    isEnabled: true
}

// ─── CONFIG ──────────────────────────────────────────────────
const REPORT_URL = 'https://wa.me/'
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/604.1'
]

// ─── HELPERS ──────────────────────────────────────────────────
function randomUa() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function randomIp() {
    return `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizePhone(phone) {
    let p = String(phone).replace(/\D/g, '')
    if (p.startsWith('0')) p = '62' + p.substring(1)
    if (!p.startsWith('62')) p = '62' + p
    return p
}

// ─── REPORT FUNCTION ──────────────────────────────────────────
async function reportMassal(phone, count = 100) {
    try {
        phone = normalizePhone(phone)
        if (!phone || phone.length < 10) {
            throw new Error('Nomor tidak valid! Format: 62857xxxxxxx')
        }

        if (count < 1) count = 1
        if (count > 500) count = 500 // Maks 500

        const results = []
        const start = Date.now()

        console.log(`[reportmass] 🔥 Target: ${phone}`)
        console.log(`[reportmass] 🔥 Total report: ${count}x`)

        // ─── KIRIM REPORT KE WA.ME ────────────────────────────
        for (let i = 0; i < count; i++) {
            try {
                const url = `${REPORT_URL}${phone}`
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': randomUa(),
                        'X-Forwarded-For': randomIp(),
                        'Accept': 'text/html,application/xhtml+xml'
                    },
                    timeout: 10000,
                    maxRedirects: 5
                })

                const status = response.status
                const success = status === 200 || status === 302 || status === 301

                results.push({
                    success,
                    attempt: i + 1,
                    status,
                    url
                })

                console.log(`[reportmass] ${i+1}/${count} → ${success ? '✅' : '❌'} (${status})`)

            } catch (err) {
                results.push({
                    success: false,
                    attempt: i + 1,
                    error: err.message
                })
                console.log(`[reportmass] ${i+1}/${count} → ❌ (${err.message})`)
            }

            // Delay biar gak kedetect spam
            await sleep(200 + Math.random() * 300)
        }

        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        const success = results.filter(r => r.success).length
        const failed = results.filter(r => !r.success).length

        return {
            success: true,
            target: phone,
            total: count,
            success,
            failed,
            elapsed,
            results
        }

    } catch (error) {
        console.error('[reportmass] Error:', error.message)
        return { success: false, error: error.message }
    }
}

// ─── HANDLER ──────────────────────────────────────────────────
async function handler(m, { sock }) {
    try {
        const args = m.args || []
        const prefix = m.prefix || '.'
        const targetPhone = args[0]?.trim()
        const count = parseInt(args[1]) || 100

        // ─── HELP ─────────────────────────────────────────────
        if (!targetPhone) {
            return m.reply(
                `📱 *REPORT MASSAL WHATSAPP*\n\n` +
                `⚠️ *ILEGAL!* Hanya untuk testing/edukasi.\n\n` +
                `Gunakan: ${prefix}reportmass <nomor> [jumlah]\n` +
                `Contoh: ${prefix}reportmass 62857xxxxxxx 100\n\n` +
                `*Jumlah:* Maksimal 500x\n` +
                `*Efek:* Bisa bikin nomor kena banned/terbatas`
            )
        }

        // ─── VALIDASI ──────────────────────────────────────────
        const phone = normalizePhone(targetPhone)
        if (!phone || phone.length < 10) {
            return m.reply(`❌ Nomor tidak valid! Gunakan format 62857xxxxxxx`)
        }

        const finalCount = Math.min(Math.max(count, 1), 500)
        if (finalCount !== count) {
            await m.reply(`⚠️ Jumlah diubah ke ${finalCount} (maksimal 500)`)
        }

        await m.react('⏳')
        await m.reply(
            `🔥 *REPORT MASSAL DIMULAI!*\n\n` +
            `📱 Target: *${phone}*\n` +
            `📊 Jumlah: *${finalCount}x*\n` +
            `⏳ Estimasi: ${Math.ceil(finalCount * 0.5)} detik\n\n` +
            `⚡ *Proses berjalan...*`
        )

        // ─── EKSEKUSI ──────────────────────────────────────────
        const result = await reportMassal(phone, finalCount)

        // ─── RESPON ──────────────────────────────────────────
        if (result.success) {
            await m.react('✅')

            let report = `📊 *HASIL REPORT MASSAL*\n\n` +
                `📱 Target: ${result.target}\n` +
                `✅ Berhasil: ${result.success}/${result.total}\n` +
                `❌ Gagal: ${result.failed}/${result.total}\n` +
                `⏱️ Waktu: ${result.elapsed}s\n\n` +
                `⚠️ *Gunakan dengan bijak!*`

            return m.reply(report)
        } else {
            await m.react('❌')
            return m.reply(`❌ Gagal: ${result.error}`)
        }

    } catch (error) {
        console.error('[reportmass] ERROR:', error.message)
        await m.react('❌')
        return m.reply(`❌ *Error:* ${error.message.slice(0, 200)}`)
    }
}

// ─── EXPORT ──────────────────────────────────────────────────
export { pluginConfig as config, handler }