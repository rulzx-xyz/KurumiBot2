import fs from 'fs'
import path from 'path'
import { createCanvas } from '@napi-rs/canvas'
import te from "../../src/lib/ourin-error.js"

const DB_DIR = path.join(process.cwd(), 'database')
const DB_PATH = path.join(DB_DIR, 'totalchat.json')

// === Fungsi Database ===
function loadDB() {
    try {
        if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
        if (!fs.existsSync(DB_PATH)) return {}
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
    } catch (e) {
        return {}
    }
}

function saveDB(data) {
    try {
        if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error('TotalChat saveDB error:', e)
    }
}

function tambahHitungan(chat, sender, pushName) {
    if (!chat || !sender) return
    const data = loadDB()

    if (!data[chat]) data[chat] = {}

    if (typeof data[chat][sender] === 'number') {
        data[chat][sender] = { count: data[chat][sender], name: nomorDari(sender) }
    }

    if (!data[chat][sender]) {
        data[chat][sender] = { count: 0, name: pushName || nomorDari(sender) }
    }

    data[chat][sender].count += 1

    if (pushName && pushName !== 'undefined') {
        data[chat][sender].name = pushName
    }

    saveDB(data)
}

function nomorDari(jid) {
    return String(jid || '').split('@')[0].split(':')[0]
}

// Kata-kata "cinta yang sesak" ala Kurumi Tokisaki - banyak biar variasinya
// kerasa, dipilih random tiap kartu di-generate.
const QUOTES_KURUMI = [
    "Waktu terus mengalir,\nnamun kenangan membusuk di dalamnya... 🥀",
    "Bahkan jika waktu diulang,\nakankah keputusasaan ini hilang? 🕰️",
    "Manusia itu rapuh,\nhancur hanya karena detik yang berlalu... 🩸",
    "Mari kita berdansa,\ndi dalam panggung tragedi ini... 🔫",
    "Tak ada yang abadi,\nbahkan nyawa yang kubanggakan ini... ⏳",
    "Cinta adalah peluru,\nyang kutembakkan ke jantungku sendiri... 💔",
    "Kuputar waktu berulang kali,\nhanya demi satu detik bersamamu... ⏰",
    "Rindu ini sesak,\nseperti mawar yang mencekik tenggorokanku... 🥀",
    "Jika mencintaimu adalah dosa,\nbiar Kurumi tanggung sampai habis waktu... ⛓️",
    "Kesepian ini abadi,\nsementara kebersamaan kita cuma sekejap... 🕯️",
    "Setiap detik tanpamu,\nterasa seperti hukuman seribu tahun... 🩸",
    "Kuukir namamu di jarum jam,\nagar waktu tak pernah melupakanmu... 🕰️",
    "Hati yang hancur ini,\nmasih saja berdetak untukmu, bodoh sekali... 💔",
    "Ara ara~ kenapa cinta harus seperti pisau,\nmenikam sambil tersenyum manis? 🔪",
    "Aku rela mengulang waktu berkali-kali,\nasal penderitaan ini cuma milikku sendiri... ⏳",
    "Darah dan air mata,\nharga yang pantas untuk cinta yang mustahil... 🩸",
    "Kenangan tentangmu,\nlebih tajam dari peluru yang kugenggam... 🔫",
    "Malam ini pun,\nKurumi hanya ditemani bayangan rindu... 🌙",
    "Jika cinta ini salah,\nbiarkan waktu yang menghukumku, bukan kamu... 🕰️",
    "Mawar layu ini,\nmasih lebih hidup dari hatiku yang mati karenamu... 🥀",
    "Kufufu~ sesaknya cinta ini,\nlebih berat dari rantai takdir yang kupikul... ⛓️",
    "Seandainya waktu bisa dibeli,\nakan kutukar semuanya untuk satu pelukanmu... ⏳",
    "Kesendirian ini kupilih sendiri,\nkarena mencintaimu dari jauh lebih aman... 🕯️",
    "Setiap jarum jam berdetak,\nmembawa luka yang sama, cinta yang sama... 🕰️",
    "Biar dunia menyebutku monster,\nasal kau tetap jadi satu-satunya kelemahanku... 🔫"
]

// === Fungsi Render Canvas (Tema Kurumi - Napi-RS HD Edition) ===
async function renderCanvasKurumi(namaGrup, ranking, totalPesan) {
    const width = 800
    const rowHeight = 70
    const padding = 50
    const headerHeight = 240
    const height = headerHeight + (ranking.length > 0 ? ranking.length * rowHeight : 100) + padding

    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // 1. Background Merah Gelap Elegan
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#150303')
    gradient.addColorStop(0.5, '#2e0404')
    gradient.addColorStop(1, '#3d0505')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Vignette tipis biar makin dramatis
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height / 4, width / 2, height / 2, height)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, width, height)

    // 2. Header dengan Glow Effect
    ctx.shadowColor = '#ff453a'
    ctx.shadowBlur = 18
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 38px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`🕰️ ⛓️ ${namaGrup} ⛓️ 🥀`, width / 2, 65)
    ctx.shadowBlur = 0

    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = 'italic 15px serif'
    ctx.fillText('— Nightmare Chat Record —', width / 2, 92)

    // 3. KOTAK KIRI (Quotes Sad - Glassmorphism style, hitam transparan)
    ctx.fillStyle = 'rgba(10, 10, 10, 0.68)'
    ctx.beginPath()
    ctx.roundRect(40, 115, 480, 105, 16)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 69, 58, 0.35)'
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.fillStyle = '#ff6b6b'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('💘 BISIKAN HATI YANG SESAK 🥀', 40 + 240, 140)

    const randomQuote = QUOTES_KURUMI[Math.floor(Math.random() * QUOTES_KURUMI.length)]
    const lines = randomQuote.split('\n')

    ctx.fillStyle = '#e5d5d5'
    ctx.font = 'italic 19px serif'
    ctx.textAlign = 'center'
    if (lines.length > 1) {
        ctx.fillText(lines[0], 40 + 240, 172)
        ctx.fillText(lines[1], 40 + 240, 200)
    } else {
        ctx.fillText(randomQuote, 40 + 240, 185)
    }

    // 4. KOTAK KANAN (Total Chat, hitam transparan)
    ctx.fillStyle = 'rgba(10, 10, 10, 0.68)'
    ctx.beginPath()
    ctx.roundRect(540, 115, 220, 105, 16)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)'
    ctx.stroke()

    ctx.fillStyle = '#ff453a'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⏳ TOTAL PESAN ⏳', 540 + 110, 148)

    ctx.shadowColor = '#ffaa00'
    ctx.shadowBlur = 12
    ctx.fillStyle = '#ffaa00'
    ctx.font = 'bold 42px sans-serif'
    ctx.fillText(totalPesan.toString(), 540 + 110, 195)
    ctx.shadowBlur = 0

    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '12px sans-serif'
    ctx.fillText('🩸 jejak waktu tercatat 🩸', 540 + 110, 210)

    // 5. Render Baris Ranking
    let yPos = headerHeight + 20

    if (ranking.length === 0) {
        ctx.fillStyle = '#888888'
        ctx.font = 'italic 24px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('🕯️ Belum ada pesan tercatat di grup ini. 🕯️', width / 2, yPos + 40)
    } else {
        ctx.textAlign = 'left'
        ranking.forEach((r, i) => {
            ctx.fillStyle = 'rgba(8, 8, 8, 0.55)'
            ctx.beginPath()
            ctx.roundRect(40, yPos, width - 80, 52, 12)
            ctx.fill()
            ctx.strokeStyle = 'rgba(255, 69, 58, 0.18)'
            ctx.lineWidth = 1
            ctx.stroke()

            const medali = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i === 3 ? '🔪' : i === 4 ? '🥀' : `⛓️ #${i + 1}`
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 24px sans-serif'
            ctx.fillText(medali, 60, yPos + 36)

            let displayName = r.nama || r.nomor
            if (displayName.length > 15) displayName = displayName.substring(0, 15) + '...'

            ctx.fillStyle = '#f3f4f6'
            ctx.font = 'bold 20px sans-serif'
            ctx.fillText(displayName, 120, yPos + 35)

            const barX = 350
            const barWidth = 300
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
            ctx.beginPath()
            ctx.roundRect(barX, yPos + 19, barWidth, 14, 7)
            ctx.fill()

            const fillWidth = Math.max((r.persen / 100) * barWidth, 10)
            const barGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0)
            barGradient.addColorStop(0, '#ffaa00')
            barGradient.addColorStop(1, '#ff453a')

            ctx.shadowColor = '#ff453a'
            ctx.shadowBlur = 8
            ctx.fillStyle = barGradient
            ctx.beginPath()
            ctx.roundRect(barX, yPos + 19, fillWidth, 14, 7)
            ctx.fill()
            ctx.shadowBlur = 0

            ctx.fillStyle = '#ffaa00'
            ctx.font = 'bold 20px sans-serif'
            ctx.textAlign = 'right'
            ctx.fillText(`${r.jumlah} 💬`, width - 60, yPos + 35)
            ctx.textAlign = 'left'

            yPos += rowHeight
        })
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.font = 'italic 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🕰️ Zafkiel • Kurumi MD 🥀', width / 2, height - 20)

    return await canvas.encode('png')
}

const pluginConfig = {
    name: 'totalchat',
    alias: ['tc', 'ranking', 'leaderboard'],
    category: 'grup',
    description: 'Ranking 5 member paling aktif chat di grup (Kurumi Sad Vibes)',
    usage: '.totalchat',
    example: '.totalchat',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        m.react('🕕')

        const data = loadDB()
        const chatData = data[m.chat] || {}

        let totalPesan = 0
        const listMember = Object.entries(chatData).map(([jid, info]) => {
            const isLegacy = typeof info === 'number'
            const count = isLegacy ? info : (info.count || 0)
            const nama = isLegacy ? nomorDari(jid) : (info.name || nomorDari(jid))
            totalPesan += count
            return { jid, count, nama }
        })

        const urutan = listMember.sort((a, b) => b.count - a.count).slice(0, 5)
        const maxJumlah = urutan[0]?.count || 1

        const ranking = urutan.map(u => ({
            nomor: nomorDari(u.jid),
            nama: u.nama,
            jumlah: u.count,
            persen: Math.round((u.count / maxJumlah) * 100)
        }))

        let namaGrup = 'Grup Ini'
        try {
            const meta = await sock.groupMetadata(m.chat)
            namaGrup = meta?.subject || namaGrup
        } catch { }

        const imageBuffer = await renderCanvasKurumi(namaGrup, ranking, totalPesan)

        m.react('✅')

        await sock.sendMessage(m.chat, {
            image: imageBuffer,
            caption: `🥀 *LEADERBOARD CHAT* 🕰️\n\n📈 *Grup:* ${namaGrup}\n💬 *Total Pesan:* ${totalPesan}\n\n> _"Setiap pesan adalah detik yang takkan pernah kembali..."_ ⏳`
        }, { quoted: m })

    } catch (error) {
        console.error('TotalChat Canvas Error:', error)
        m.react('☢')
        const errDesc = te(m.prefix, m.command, m.pushName) || "❌ Gagal memproses leaderboard.";
        await m.reply(`${errDesc}\n\n\`\`\`${error.message || error}\`\`\``)
    }
}

async function before(m) {
    try {
        if (!String(m.chat || '').endsWith('@g.us')) return
        const pushName = m.pushName || m.name || ''
        tambahHitungan(m.chat, m.sender, pushName)
    } catch (error) {
        console.error('TotalChat before() Error:', error)
    }
}

export { pluginConfig as config, handler, before }