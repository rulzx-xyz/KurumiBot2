import { createCanvas, loadImage } from '@napi-rs/canvas'

const BACKGROUND_URL = 'https://raw.githubusercontent.com/himanackerman/Image/refs/heads/main/anu/10a1fe0d21270e01da6efa113c26203b.jpg'

// Fungsi untuk menghapus background menggunakan API Pixelcut
async function removeBgNet(buffer) {
    // Note: Node.js 22 sudah support native Blob, FormData, dan fetch
    const blob = new Blob([buffer], { type: 'image/png' })
    const form = new FormData()
    form.append('image', blob, 'image.png')
    form.append('format', 'png')
    form.append('model', 'v1')

    const res = await fetch('https://api2.pixelcut.app/image/matte/v1', {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'x-client-version': 'web:pixa.com:4a5b0af2'
        },
        body: form
    })

    if (!res.ok) throw new Error(`Status ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
}

const pluginConfig = {
    name: "meledak",
    alias: ["ledakan", "bom", "meledak"],
    category: "maker",
    description: "Membuat editan gambar/stiker meledak (otomatis hapus background)",
    usage: ".meledak [reply gambar/stiker]",
    example: ".meledak",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5, // Dikasih cooldown dikit karena render canvas lumayan berat
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ''
    const isMedia = /image|sticker/.test(mime)

    if (!isMedia) {
        return m.reply(`❌ *Cara Penggunaan:*\nKirim atau reply gambar/stiker dengan *${m.prefix + m.command}*`)
    }

    await m.react('🕒')

    let mediaBuffer
    try {
        mediaBuffer = await q.download()
    } catch (_) {}

    if (!mediaBuffer) {
        return m.reply('❌ Gagal mengunduh gambar/stiker. Pastikan kamu mereply medianya dengan benar.')
    }

    let transparentBuffer
    try {
        transparentBuffer = await removeBgNet(mediaBuffer)
    } catch (err) {
        console.error('[MELEDAK] Hapus BG gagal:', err)
        // Fallback pakai gambar asli kalau gagal hapus BG
        transparentBuffer = mediaBuffer 
    }

    try {
        let targetImg = await loadImage(transparentBuffer)
        let bgImg = await loadImage(BACKGROUND_URL)

        const canvasWidth = bgImg.width
        const canvasHeight = bgImg.height

        const canvas = createCanvas(canvasWidth, canvasHeight)
        const ctx = canvas.getContext('2d')

        // 1. Render Background
        ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight)

        // 2. Hitung skala biar gambar user proporsional dan muat
        let scale
        const isPortrait = targetImg.height > targetImg.width

        if (isPortrait) {
            scale = canvasHeight / targetImg.height
        } else {
            scale = (canvasWidth * 0.75) / targetImg.width
        }

        let fgWidth = targetImg.width * scale
        let fgHeight = targetImg.height * scale

        if (fgWidth > canvasWidth * 0.85) {
            scale = (canvasWidth * 0.85) / targetImg.width
            fgWidth = targetImg.width * scale
            fgHeight = targetImg.height * scale
        }

        // Posisi di kanan bawah (menyesuaikan kode asli)
        let fgX = canvasWidth - fgWidth
        let fgY = canvasHeight - fgHeight

        // 3. Render Gambar User
        ctx.drawImage(targetImg, fgX, fgY, fgWidth, fgHeight)

        const buffer = canvas.toBuffer('image/png')

        // Kirim hasil
        await sock.sendMessage(m.chat, { 
            image: buffer, 
            caption: '💥 *B O O M !*' 
        }, { quoted: m })
        
        await m.react('💥')
        
    } catch (e) {
        console.error('[MELEDAK] Canvas Error:', e)
        return m.reply('❌ Gagal merender gambar canvas.')
    }
}

export { pluginConfig as config, handler }