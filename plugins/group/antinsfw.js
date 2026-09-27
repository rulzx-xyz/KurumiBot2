import { getDatabase } from '../../src/lib/ourin-database.js'
import te from '../../src/lib/ourin-error.js'

const pluginConfig = {
    name: 'antinsfw',
    alias: ['antinude', 'antiporn'],
    category: 'group',
    description: 'Filter gambar/stiker NSFW (Porn/Hentai) menggunakan AI otomatis',
    usage: '.antinsfw on/off',
    example: '.antinsfw on',
    isOwner: false,
    isAdmin: true,
    isBotAdmin: true, // Bot wajib jadi admin biar bisa ngehapus pesannya
    isGroup: true,
    isPremium: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

// Helper untuk ngecek gambar ke API NSFW
async function nsfwCheck(buffer) {
    try {
        // Pakai fitur bawaan Node.js 18+ biar hemat RAM & gak butuh axios
        const blob = new Blob([buffer], { type: 'image/jpeg' })
        const form = new FormData()
        form.append('image', blob, 'image.jpg')

        const response = await fetch('https://nsfw-categorize.it/api/upload', {
            method: 'POST',
            body: form
        })
        const data = await response.json()

        if (data.status !== 'OK') throw data.reason || 'Gagal terhubung ke API NSFW'
        return data.data
    } catch (error) {
        throw error
    }
}

// Handler untuk nyalain/matiin fitur
async function handler(m, { args }) {
    try {
        const db = getDatabase()
        const groupData = db.getGroup(m.chat) || {}
        const action = (args[0] || '').toLowerCase()

        if (action === 'on') {
            if (groupData.antinsfw) return m.reply('🛡️ _"Ara ara~ Filter Anti-NSFW sudah aktif di grup ini kok."_')
            db.setGroup(m.chat, { ...groupData, antinsfw: true })
            return m.reply('🛡️ *Anti-NSFW AKTIF!*\n\n_"Kufufu~ Kurumi akan mengawasi setiap gambar yang masuk. Jangan macam-macam ya."_')
        } 
        
        if (action === 'off') {
            if (!groupData.antinsfw) return m.reply('⚠️ Anti-NSFW memang sedang tidak aktif.')
            db.setGroup(m.chat, { ...groupData, antinsfw: false })
            return m.reply('🥀 *Anti-NSFW NONAKTIF!*\n\n_"Pengawasan gambar telah dihentikan."_')
        }

        m.reply(`⚠️ Format salah!\nGunakan: *${m.prefix}${m.command} on* atau *${m.prefix}${m.command} off*`)
    } catch (error) {
        console.error('[antinsfw handler]', error)
        await m.reply(te(m.prefix, m.command, m.pushName))
    }
}

// Razia gambar/stiker di background
async function before(m, { sock, isBotAdmin }) {
    try {
        if (!m.isGroup || m.key.fromMe || !isBotAdmin) return 

        const db = getDatabase()
        const groupData = db.getGroup(m.chat) || {}
        
        if (!groupData.antinsfw) return 

        // Biarin command lewat (gak usah dicek)
        if (m.text && m.text.toLowerCase().startsWith(m.prefix + 'antinsfw')) return

        // Deteksi apakah pesan ini gambar atau stiker
        const isMedia = m.isImage || m.isSticker || m.message?.imageMessage || m.message?.stickerMessage
        if (!isMedia) return

        let buffer = await m.download().catch(() => null)
        if (!buffer || buffer.length < 100) return // Abaikan kalau gagal download

        // Proses pengecekan AI
        const res = await nsfwCheck(buffer).catch(() => null)
        if (!res) return // Abaikan kalau API lagi down biar gak spam error

        let klasifikasi = (res.classification || '').toLowerCase()
        let confidence = res.confidence || 0

        if (!klasifikasi || confidence < 50) return

        let isNSFW = false
        // Logika tingkat sensitivitas (sesuai request aslinya)
        if (klasifikasi === 'porn' || klasifikasi === 'hentai') {
            if (confidence >= 70) isNSFW = true
        } else if (klasifikasi === 'nsfw' || klasifikasi === 'sexy') {
            if (confidence >= 90) isNSFW = true
        }

        if (isNSFW) {
            // Hapus pesannya seketika
            await sock.sendMessage(m.chat, { delete: m.key })

            // Tegur pelakunya
            await sock.sendMessage(m.chat, {
                text: `🚫 *NSFW TERDETEKSI!*\n\n_"Ara ara~ @${m.sender.split('@')[0]} ketahuan mengirim konten tidak pantas. Pesan telah Kurumi lenyapkan."_\n\n📊 *Klasifikasi:* ${klasifikasi.toUpperCase()} (${Math.round(confidence)}%)`,
                mentions: [m.sender]
            })
        }

    } catch (error) {
        console.error('[antinsfw before]', error)
    }
}

export { pluginConfig as config, handler, before }