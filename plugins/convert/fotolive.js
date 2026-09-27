import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'

const pluginConfig = {
    name: 'fotolive',
    alias: ['livephoto', 'ptv', 'videonote'],
    category: 'convert',
    description: 'Ubah foto atau video jadi Live Photo (Video bulat WA mentok 3 detik)',
    usage: '.fotolive (reply foto/video)',
    example: '.fotolive',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

function getMediaType(m) {
    if (!m.quoted) return null
    const msg = m.quoted.message
    if (!msg) return null

    if (msg.imageMessage || m.quoted.isImage) return 'image'
    if (
        msg.videoMessage || 
        msg.viewOnceMessage?.message?.videoMessage || 
        msg.viewOnceMessageV2?.message?.videoMessage ||
        m.quoted.isVideo
    ) return 'video'
    
    return null
}

async function handler(m, { sock }) {
    if (!m.quoted) {
        return m.reply('⚠️ _"Ara ara~ mana foto atau video yang mau Kurumi ubah jadi Live Photo?"_\n\nReply pesan gambarnya kak~')
    }

    const mediaType = getMediaType(m)
    if (!mediaType) {
        return m.reply('⚠️ Format tidak didukung. Harap reply foto atau video saja.')
    }

    m.react('⏳')

    // Siapin folder temporary
    const tmpDir = path.join(os.tmpdir(), 'kurumibot-fotolive')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const ts = Date.now()
    const ext = mediaType === 'image' ? '.jpg' : '.mp4'
    const inPath = path.join(tmpDir, `live_in_${ts}${ext}`)
    const outPath = path.join(tmpDir, `live_out_${ts}.mp4`)

    try {
        // Download Media (Pakai m.quoted.download bawaan biar simpel)
        const buffer = await m.quoted.download()
        if (!buffer || buffer.length < 100) throw new Error('Gagal mengunduh media dari pesan.')
        fs.writeFileSync(inPath, buffer)

        // Filter FFmpeg: Crop ke rasio 1:1 (kotak) dan scale ke resolusi standar ptv (512x512)
        const cropFilter = "crop=w='min(iw,ih)':h='min(iw,ih)',scale=512:512"

        // Eksekusi FFmpeg
        await new Promise((resolve, reject) => {
            let args = []

            if (mediaType === 'image') {
                // Mode Foto: Looping foto selama 3 detik
                args = [
                    '-loop', '1',
                    '-i', inPath,
                    '-t', '3', 
                    '-vf', cropFilter,
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-y', outPath
                ]
            } else {
                // Mode Video: Potong 3 detik awal aja, audionya ikut
                args = [
                    '-i', inPath,
                    '-t', '3', 
                    '-vf', cropFilter,
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    '-y', outPath
                ]
            }

            const ff = spawn('ffmpeg', args)
            ff.on('close', (code) => {
                if (code === 0) resolve()
                else reject(new Error(`FFmpeg exited with code ${code}`))
            })
            ff.on('error', (err) => reject(err))
        })

        if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
            throw new Error('Hasil render FFmpeg kosong.')
        }

        // Kirim sebagai Video Note (PTV)
        await sock.sendMessage(m.chat, {
            video: { url: outPath },
            ptv: true, // 🔥 INI KUNCI UTAMA BIAR JADI VIDEO BULAT
            mimetype: 'video/mp4'
        }, { quoted: m })

        m.react('✅')

    } catch (error) {
        console.error('[fotolive error]', error)
        m.react('❌')
        await m.reply('❌ Gagal memproses Live Photo. Pastikan ukuran file tidak kebesaran.')
    } finally {
        // Garbage Collector: Hapus file temporary biar RAM & Storage VPS lu gak numpuk
        if (fs.existsSync(inPath)) fs.unlinkSync(inPath)
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
    }
}

export { pluginConfig as config, handler }