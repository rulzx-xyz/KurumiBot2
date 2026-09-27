import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import fs from 'fs'
import path from 'path'
import os from 'os'
import te from '../../src/lib/ourin-error.js'

const pluginConfig = {
    name: 'fakenotif',
    alias: ['notifwa', 'fakewa', 'lockscreenwa'],
    category: 'canvas',
    description: 'Bikin gambar fake notifikasi WhatsApp (Lockscreen iPhone)',
    usage: '.fakenotif nama | pesan',
    example: '.fakenotif Ayang | Jangan lupa makan ya sayang',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 2,
    isEnabled: true
}

const APPLE_EMOJI_JSON_URL = 'https://media.githubusercontent.com/media/Ditzzx-vibecoder/entahlah/main/emoji-apple.json'
let appleEmojiMap = null
const emojiImageCache = new Map()
const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu

async function getbufer(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
}

function drawcircleimg(ctx, img, x, y, size) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(img, x, y, size, size)
    ctx.restore()
}

// 🛡️ AMAN: Menggunakan font sistem VPS langsung tanpa download external yang sering broken
async function loadAssets() {
    try {
        // Daftarkan font umum Linux jika tersedia di VPS
        const possibleFonts = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf'
        ]
        for (const fontPath of possibleFonts) {
            if (fs.existsSync(fontPath)) {
                GlobalFonts.registerFromPath(fontPath, 'SanFrancisco')
                GlobalFonts.registerFromPath(fontPath, 'Roboto')
                break
            }
        }
    } catch {}
}

function emojiToUnicode(emoji) {
    return [...emoji].map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join('-')
}

async function loadAppleEmojiMap() {
    if (appleEmojiMap) return appleEmojiMap
    const localJson = path.join(os.tmpdir(), 'emoji-apple.json')
    if (!fs.existsSync(localJson)) {
        try {
            const buf = await getbufer(APPLE_EMOJI_JSON_URL)
            fs.writeFileSync(localJson, buf)
        } catch {
            return {}
        }
    }
    try {
        const raw = fs.readFileSync(localJson, 'utf-8')
        appleEmojiMap = JSON.parse(raw)
    } catch {
        appleEmojiMap = {}
    }
    return appleEmojiMap
}

async function getEmojiImage(emoji) {
    if (emojiImageCache.has(emoji)) return emojiImageCache.get(emoji)
    const map = await loadAppleEmojiMap()
    if (!map || Object.keys(map).length === 0) return null

    const base = emojiToUnicode(emoji)
    const variants = [
        base,
        base.replace(/-fe0f/gi, ''),
        `${base.replace(/-fe0f/gi, '')}-fe0f`,
        base.toUpperCase(),
        base.replace(/-fe0f/gi, '').toUpperCase(),
    ]
    let b64 = null
    for (const v of variants) {
        if (map[v]) { b64 = map[v]; break }
    }
    if (!b64) return null
    try {
        const buf = Buffer.from(b64, 'base64')
        const img = await loadImage(buf)
        emojiImageCache.set(emoji, img)
        return img
    } catch {
        return null
    }
}

async function drawAppleEmoji(ctx, emoji, x, y, size) {
    const img = await getEmojiImage(emoji)
    if (!img) {
        ctx.fillText(emoji, x, y)
        return
    }
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size)
}

async function drawTextWithEmojis(ctx, text, x, y, fontSize, fontString) {
    ctx.font = fontString
    const parts = text.split(EMOJI_REGEX)
    let currentX = x
    for (const part of parts) {
        if (!part) continue
        EMOJI_REGEX.lastIndex = 0
        if (EMOJI_REGEX.test(part)) {
            const emojiSize = fontSize * 1.05
            const emojiCX = currentX + emojiSize / 2
            const emojiCY = y + (fontSize / 2)
            await drawAppleEmoji(ctx, part, emojiCX, emojiCY, emojiSize)
            currentX += emojiSize
        } else {
            ctx.fillText(part, currentX, y)
            currentX += ctx.measureText(part).width
        }
        EMOJI_REGEX.lastIndex = 0
    }
}

async function fakenotifwa({ ppurl, username, chat, tanggal, jam }) {
    await loadAssets()

    // 🔗 GANTI LINK STABLE (Menggunakan asset mirror publik yang aman dari blokiran DNS)
    const bgUrl = 'https://i.ibb.co.com/8q54JUc/background-lockscreen.png' // Fallback aman / Background polos gelap elegan ala iOS
    const waIconUrl = 'https://cdn-icons-png.flaticon.com/512/733/733585.png' // Ikon WhatsApp Resmi dari CDN Flaticon

    let bgBuffer, waIconBuffer, ppBuffer

    // Buat background canvas gelap elegan secara langsung jika link gambar gagal total
    const fallbackCanvas = createCanvas(1170, 2532) // Resolusi standar iPhone
    const fallbackCtx = fallbackCanvas.getContext('2d')
    fallbackCtx.fillStyle = '#0f0f11'
    fallbackCtx.fillRect(0, 0, 1170, 2532)
    
    // Desain kotak notifikasi ala iOS di tengah bawah
    fallbackCtx.fillStyle = 'rgba(255, 255, 255, 0.15)'
    if (typeof fallbackCtx.roundRect === 'function') {
        fallbackCtx.beginPath()
        fallbackCtx.roundRect(50, 900, 1070, 180, 35)
        fallbackCtx.fill()
    } else {
        fallbackCtx.fillRect(50, 900, 1070, 180)
    }
    
    const defaultBgBuf = fallbackCanvas.toBuffer('image/png')

    try {
        bgBuffer = await getbufer(bgUrl)
    } catch {
        bgBuffer = defaultBgBuf
    }

    try {
        waIconBuffer = await getbufer(waIconUrl)
    } catch {
        waIconBuffer = defaultBgBuf
    }

    try {
        ppBuffer = await getbufer(ppurl)
    } catch {
        const dummyPp = createCanvas(100, 100)
        const dummyCtx = dummyPp.getContext('2d')
        dummyCtx.fillStyle = '#555'
        dummyCtx.fillRect(0, 0, 100, 100)
        ppBuffer = dummyPp.toBuffer('image/png')
    }

    const bg = await loadImage(bgBuffer)
    const ppImg = await loadImage(ppBuffer)
    const waImg = await loadImage(waIconBuffer)

    const canvas = createCanvas(bg.width, bg.height)
    const ctx = canvas.getContext('2d')

    ctx.drawImage(bg, 0, 0, bg.width, bg.height)

    const tanggalBesar = tanggal || "Senin, 27 September"
    const tanggalY = 120
    ctx.font = '36px sans-serif'
    ctx.fillStyle = '#C5C5C5'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(tanggalBesar, bg.width / 2, tanggalY)

    const jamBesar = jam || "22.24"
    const jamY = 170
    ctx.font = 'bold 160px sans-serif'
    ctx.fillStyle = '#C5C5C5'
    ctx.textAlign = 'center'
    ctx.fillText(jamBesar, bg.width / 2, jamY)

    const ppSize = 77
    const ppX = 75
    const ppY = 935
    drawcircleimg(ctx, ppImg, ppX, ppY, ppSize)

    const waIconSize = 24
    const waIconX = ppX + ppSize - waIconSize + 2
    const waIconY = ppY + ppSize - waIconSize + 2
    drawcircleimg(ctx, waImg, waIconX, waIconY, waIconSize)

    const usernameX = 175
    const usernameY = 938
    const usernameFontSize = 26
    ctx.fillStyle = '#FFFFFF'
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    await drawTextWithEmojis(ctx, username, usernameX, usernameY, usernameFontSize, 'bold 26px sans-serif')

    const chatX = 175
    const chatY = 978
    const chatFontSize = 22
    ctx.fillStyle = '#FFFFFF'
    ctx.textBaseline = 'top'
    await drawTextWithEmojis(ctx, chat, chatX, chatY, chatFontSize, '22px sans-serif')

    return canvas.toBuffer('image/png')
}

async function handler(m, { sock, args }) {
    try {
        const textFull = args.join(' ')
        if (!textFull.includes('|')) {
            return m.reply(`⚠️ Format salah!\n\nContoh: *${m.prefix}${m.command} Ayang | Jangan lupa makan ya sayang*`)
        }

        const [nama, pesan] = textFull.split('|').map(v => v.trim())

        let targetJid = m.sender
        if (m.quoted) {
            targetJid = m.quoted.sender
        } else if (m.mentions && m.mentions.length > 0) {
            targetJid = m.mentions[0]
        }

        let ppUrl = ''
        try {
            ppUrl = await sock.profilePictureUrl(targetJid, 'image')
        } catch {
            ppUrl = 'https://i.imgur.com/8q54JUc.png'
        }

        m.react('⏳')

        const dateObj = new Date()
        const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
        const bulanArr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        
        const tanggalStr = `${hariArr[dateObj.getDay()]}, ${dateObj.getDate()}${bulanArr[dateObj.getMonth()]}`
        let mnt = dateObj.getMinutes().toString()
        if (mnt.length === 1) mnt = '0' + mnt
        const jamStr = `${dateObj.getHours()}.${mnt}`

        const bufferResult = await fakenotifwa({
            ppurl: ppUrl,
            username: nama,
            chat: pesan,
            tanggal: tanggalStr,
            jam: jamStr
        })

        await sock.sendMessage(m.chat, {
            image: bufferResult,
            caption: '✨ _"Ini notifikasinya kak~"_'
        }, { quoted: m })

        m.react('✅')
    } catch (error) {
        console.error('[fakenotif handler]', error)
        m.react('❌')
        await m.reply(`❌ Gagal membuat gambar notifikasi:\n\n\`\`\`${error.message}\`\`\``)
    }
}

export { pluginConfig as config, handler }