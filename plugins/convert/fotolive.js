import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import { prepareWAMessageMedia, generateWAMessageFromContent } from 'ourin'

const pluginConfig = {
    name: 'fotolive',
    alias: ['livephoto', 'livepic'],
    category: 'convert',
    description: 'Ubah video jadi Live Photo interaktif (Tahan gambar untuk bergerak ala iOS, Max 5 Detik)',
    usage: '.fotolive (reply video)',
    example: '.fotolive',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    if (!m.quoted) {
        return m.reply('⚠️ _"Ara ara~ mana video yang mau Kurumi ubah jadi Live Photo?"_\n\nReply pesan videonya kak~')
    }

    const msg = m.quoted.message
    const isVideo = msg?.videoMessage || msg?.ptvMessage || msg?.viewOnceMessage?.message?.videoMessage || m.quoted.isVideo
    
    if (!isVideo) {
        return m.reply('⚠️ Balas/reply video yang valid untuk dijadikan Live Photo ya kak~')
    }

    m.react('⏳')

    const tmpDir = path.join(os.tmpdir(), 'kurumibot-fotolive')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const ts = Date.now()
    const tmpVideoIn = path.join(tmpDir, `lv_in_${ts}.mp4`)
    const tmpVideoOut = path.join(tmpDir, `lv_out_${ts}.mp4`)
    const tmpThumb = path.join(tmpDir, `lv_thumb_${ts}.jpg`)

    try {
        const videoBuffer = await m.quoted.download().catch(() => null)
        if (!videoBuffer || videoBuffer.length === 0) {
            throw new Error('Gagal mendownload video dari WhatsApp kak~')
        }
        
        fs.writeFileSync(tmpVideoIn, videoBuffer)

        // ✂️ PROSES 1: Potong video jadi 5 detik max
        await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', [
                '-i', tmpVideoIn,
                '-t', '5', // Kunci mentok 5 detik
                '-c:v', 'libx264',
                '-preset', 'superfast', // Biar convert-nya ngebut
                '-c:a', 'aac', 
                '-y', tmpVideoOut
            ])
            ff.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg potong video gagal (Code: ${code})`)))
            ff.on('error', err => reject(err))
        })

        // 📸 PROSES 2: Ambil frame pertama buat Thumbnail (dari video yang udah dipotong)
        await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', [
                '-i', tmpVideoOut,
                '-vframes', '1',  
                '-q:v', '2',      
                '-y', tmpThumb
            ])
            ff.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg gagal ambil thumbnail (Code: ${code})`)))
            ff.on('error', err => reject(err))
        })

        const finalVideoBuffer = fs.readFileSync(tmpVideoOut)
        const thumbBuffer = fs.readFileSync(tmpThumb)

        // Siapkan media di server WhatsApp
        const flImageMedia = await prepareWAMessageMedia(
            { image: thumbBuffer },
            { upload: sock.waUploadToServer }
        )
        const flVideoMedia = await prepareWAMessageMedia(
            { video: finalVideoBuffer },
            { upload: sock.waUploadToServer }
        )

        // Rakit Pesan Foto (Induk)
        const flPhotoMsg = generateWAMessageFromContent(
            m.chat,
            {
                imageMessage: {
                    ...flImageMedia.imageMessage,
                    contextInfo: { pairedMediaType: 5, statusSourceType: 0 }
                }
            },
            { quoted: m }
        )
        
        // Eksekusi kirim Foto Induk
        await sock.relayMessage(m.chat, flPhotoMsg.message, { messageId: flPhotoMsg.key.id })

        // Rakit dan kirim Pesan Video (Anak / Pasangan) tersembunyi
        await sock.relayMessage(
            m.chat,
            {
                videoMessage: {
                    ...flVideoMedia.videoMessage,
                    contextInfo: { pairedMediaType: 6, statusSourceType: 0 }
                },
                messageContextInfo: {
                    messageAssociation: { associationType: 12, parentMessageKey: flPhotoMsg.key }
                }
            },
            {}
        )

        m.react('✅')

    } catch (error) {
        console.error('[fotolive error]', error)
        m.react('❌')
        m.reply(`❌ Gagal membuat foto live-nya kak~ coba lagi nanti ya 🌸\n\n\`\`\`${error.message}\`\`\``)
    } finally {
        // Hapus sampah
        try { if (fs.existsSync(tmpVideoIn)) fs.unlinkSync(tmpVideoIn) } catch (_) {}
        try { if (fs.existsSync(tmpVideoOut)) fs.unlinkSync(tmpVideoOut) } catch (_) {}
        try { if (fs.existsSync(tmpThumb)) fs.unlinkSync(tmpThumb) } catch (_) {}
    }
}

export { pluginConfig as config, handler }