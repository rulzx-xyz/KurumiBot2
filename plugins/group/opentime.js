import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database', 'opentime.json')
let intervalDimulai = false
let sockTersimpan = null

function loadDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
    } catch {
        return {}
    }
}

function saveDB(data) {
    try {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error('OpenTime saveDB error:', e)
    }
}

function waktuSekarangWIB() {
    const now = new Date()
    const jam = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(now)
    const tanggal = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
    return { jam, tanggal }
}

function parseJam(input) {
    const match = String(input || '').trim().match(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/)
    if (!match) return null
    return `${match[1].padStart(2, '0')}:${match[2]}`
}

async function jalankanPengecekan() {
    if (!sockTersimpan) return
    const data = loadDB()
    const { jam, tanggal } = waktuSekarangWIB()

    for (const [groupId, jadwal] of Object.entries(data)) {
        if (!jadwal?.waktu || jadwal.waktu !== jam) continue
        if (jadwal.terakhirDijalankan === tanggal) continue // sudah jalan hari ini

        try {
            await sockTersimpan.groupSettingUpdate(groupId, 'not_announcement')
            await sockTersimpan.sendMessage(groupId, {
                text:
                    `🕰️ *Kurumi Tokisaki*\n\n` +
                    `_"Ara ara~ Waktunya sudah tiba. Kurumi membuka gerbang untuk kalian semua."_\n\n` +
                    `Grup ini sekarang *terbuka* — silakan mengobrol sepuasnya, ${'my dear'} 🖤`
            })
            jadwal.terakhirDijalankan = tanggal
            saveDB(data)
        } catch (e) {
            console.error('OpenTime auto-open error:', groupId, e.message)
        }
    }
}

function pastikanIntervalJalan(sock) {
    sockTersimpan = sock
    if (intervalDimulai) return
    intervalDimulai = true
    setInterval(jalankanPengecekan, 60 * 1000)
}

const pluginConfig = {
    name: 'opentime',
    alias: ['bukajam', 'jadwalbuka'],
    category: 'group',
    description: 'Jadwalin grup kebuka otomatis tiap hari di jam tertentu (tema Kurumi Tokisaki)',
    usage: '.opentime <HH:mm> / .opentime off',
    example: '.opentime 08:00',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
}

async function handler(m, { sock, args }) {
    try {
        pastikanIntervalJalan(sock)

        const input = (args[0] || '').trim().toLowerCase()

        if (input === 'off' || input === 'nonaktif' || input === 'batal') {
            const data = loadDB()
            if (data[m.chat]) {
                delete data[m.chat]
                saveDB(data)
            }
            await m.reply(
                `🕰️ *Kurumi Tokisaki*\n\n` +
                `_"Kufufu~ Baiklah, Kurumi hentikan putaran jarum jam ini. Jadwal buka otomatis sudah dimatikan."_`
            )
            return
        }

        const waktu = parseJam(input)
        if (!waktu) {
            await m.reply(
                `⚠️ *ᴠᴀʟɪᴅᴀsɪ ɢᴀɢᴀʟ*\n\n` +
                `_"Ara ara~ format waktunya salah, sayang."_\n\n` +
                `> Format: \`${m.prefix}opentime HH:mm\`\n` +
                `> Contoh: \`${m.prefix}opentime 08:00\`\n` +
                `> Matiin jadwal: \`${m.prefix}opentime off\``
            )
            return
        }

        const data = loadDB()
        data[m.chat] = { waktu, terakhirDijalankan: null }
        saveDB(data)

        await m.reply(
            `🕰️ *Kurumi Tokisaki*\n\n` +
            `_"Ara ara~ sudah Kurumi catat baik-baik. Setiap hari jam *${waktu}* WIB, gerbang waktu grup ini akan terbuka untuk kalian."_\n\n` +
            `> Jadwal buka: *${waktu}* WIB (tiap hari)\n` +
            `> Matiin jadwal: \`${m.prefix}opentime off\``
        )
    } catch (error) {
        await m.reply(
            `❌ *ᴇʀʀᴏʀ*\n\n` +
            `> Gagal mengatur jadwal buka grup.\n` +
            `> _${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }