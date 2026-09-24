/**
 * PLUGIN: TESTFUNC
 * Test function secara langsung dari WhatsApp
 * Usage: .testfunc <nomor> [count] (reply function)
 * Example: .testfunc 62857xxxxxxx 2 (reply kode function)
 */

const pluginConfig = {
    name: 'testfunc',
    alias: ['tf', 'runfunc'],
    category: 'owner',
    description: '🧪 Test function langsung dari WhatsApp',
    usage: '.testfunc <nomor> [count] (reply function)',
    example: '.testfunc 62857xxxxxxx 2',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

// ─── HELPERS ──────────────────────────────────────────────────
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── HANDLER ──────────────────────────────────────────────────
async function handler(m, { sock }) {
    try {
        if (!sock) return m.reply('❌ Sock tidak tersedia!')

        const args = m.args || []
        const prefix = m.prefix || '.'

        // ─── AMBIL ARGUMEN ─────────────────────────────────────
        const rawNumber = args[0]?.trim()
        const count = parseInt(args[1]) || 1

        // ─── CEK REPLY FUNCTION ────────────────────────────────
        const quoted = m.quoted || m
        const quotedText = quoted.text || quoted.body || ''

        if (!rawNumber) {
            return m.reply(
                `🧪 *TESTFUNC*\n\n` +
                `Test function langsung dari WhatsApp.\n\n` +
                `*Usage:*\n` +
                `${prefix}testfunc <nomor> [count]\n` +
                `(reply function yang mau di-test)\n\n` +
                `*Contoh:*\n` +
                `${prefix}testfunc 62857xxxxxxx 2\n` +
                `> Reply kode function\n\n` +
                `⚠️ Function harus pake format:\n` +
                `async function NamaFunc(sock, target) { ... }`
            )
        }

        // ─── VALIDASI NOMOR ────────────────────────────────────
        const phone = rawNumber.replace(/[^0-9]/g, '')
        if (!phone || phone.length < 10) {
            return m.reply(`❌ Nomor tidak valid! Gunakan 62857xxxxxxx`)
        }

        const target = phone + '@s.whatsapp.net'
        const finalCount = Math.min(Math.max(count, 1), 10)

        // ─── CEK ADA FUNCTION DI REPLY ─────────────────────────
        if (!quotedText || !quotedText.includes('async function')) {
            return m.reply(
                `❌ *Function tidak ditemukan!*\n\n` +
                `Reply pesan yang berisi function.\n` +
                `Format: \`async function Nama(sock, target) { ... }\``
            )
        }

        // ─── PARSE FUNCTION DARI REPLY ─────────────────────────
        let funcCode = quotedText

        // Ekstrak kode function
        const funcMatch = funcCode.match(/async\s+function\s+(\w+)\s*\([\s\S]*?\}\s*$/m)
        if (!funcMatch) {
            // Coba cari pake regex lain
            const altMatch = funcCode.match(/async\s+function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*\}/m)
            if (!altMatch) {
                return m.reply(`❌ Format function tidak valid!`)
            }
            funcCode = altMatch[0]
        }

        // ─── BUAT FUNCTION DINAMIS ─────────────────────────────
        let dynamicFunc
        try {
            // Bersihin kode
            let cleanCode = funcCode
                .replace(/```javascript/g, '')
                .replace(/```js/g, '')
                .replace(/```/g, '')
                .trim()

            // Buat function pake Function constructor
            // Ini jalan di sandbox sederhana
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
            dynamicFunc = new AsyncFunction('sock', 'target', 'delay', `
                ${cleanCode}
                const funcName = ${JSON.stringify(funcMatch?.[1] || 'testFunc')};
                if (typeof eval(funcName) === 'function') {
                    return await eval(funcName)(sock, target);
                }
                return { success: false, error: 'Function not found after eval' };
            `)

        } catch (parseError) {
            return m.reply(
                `❌ *Gagal parse function:*\n${parseError.message.slice(0, 200)}\n\n` +
                `Pastikan format function valid.`
            )
        }

        // ─── EKSEKUSI ──────────────────────────────────────────
        await m.react('⏳')
        await m.reply(
            `🧪 *TESTFUNC RUNNING*\n\n` +
            `📌 Target: ${phone}\n` +
            `🔄 Count: ${finalCount}x\n` +
            `⏳ Mengeksekusi function...`
        )

        const start = Date.now()
        const results = []

        for (let i = 0; i < finalCount; i++) {
            try {
                const result = await dynamicFunc(sock, target, delay)
                results.push({
                    attempt: i + 1,
                    success: true,
                    result: typeof result === 'object' ? JSON.stringify(result).slice(0, 100) : String(result).slice(0, 100)
                })
                console.log(`[testfunc] ${i+1}/${finalCount}: ✅`)
            } catch (e) {
                results.push({
                    attempt: i + 1,
                    success: false,
                    error: e.message
                })
                console.log(`[testfunc] ${i+1}/${finalCount}: ❌ ${e.message}`)
            }

            if (i < finalCount - 1) await delay(1500)
        }

        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        const successCount = results.filter(r => r.success).length
        const failedCount = results.filter(r => !r.success).length

        // ─── RESPON ────────────────────────────────────────────
        await m.react(successCount > 0 ? '✅' : '❌')

        let report = `🧪 *HASIL TESTFUNC*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📌 *Target* : ${phone}\n` +
            `📊 *Count* : ${finalCount}x\n` +
            `✅ *Success* : ${successCount}\n` +
            `❌ *Failed* : ${failedCount}\n` +
            `⏱️ *Time* : ${elapsed}s\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n`

        // Detail per attempt
        report += `*DETAIL:*\n`
        results.forEach(r => {
            const icon = r.success ? '✅' : '❌'
            if (r.success) {
                report += `${icon} Attempt ${r.attempt}: SUCCESS\n`
            } else {
                report += `${icon} Attempt ${r.attempt}: ${r.error?.slice(0, 80)}\n`
            }
        })

        return m.reply(report)

    } catch (error) {
        console.error('[testfunc]', error.message)
        await m.react('❌')
        return m.reply(`❌ Error: ${error.message.slice(0, 200)}`)
    }
}

export { pluginConfig as config, handler }