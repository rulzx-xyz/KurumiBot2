import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'
import te from '../../src/lib/ourin-error.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const execFileAsync = promisify(execFile)

const pluginConfig = {
    name: 'convertsw',
    alias: ['convertsw'],
    category: 'convert',
    description: 'Convert video untuk status WhatsApp (Max 60 detik, Smooth)',
    usage: '.convertsw (reply video / dokumen mp4)',
    example: '.convertsw',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 15, 
    energi: 3,
    isEnabled: true
}

function getMediaType(m) {
    if (!m.quoted) return null
    const msg = m.quoted.message
    if (!msg) return null

    if (  
        msg.videoMessage ||  
        msg.viewOnceMessage?.message?.videoMessage ||  
        msg.viewOnceMessageV2?.message?.videoMessage ||  
        msg.ephemeralMessage?.message?.videoMessage ||  
        m.quoted.isVideo  
    ) return 'video'  

    const doc = msg.documentMessage  
    if (doc) {  
        const mime = (doc.mimetype || '').toLowerCase()  
        const name = (doc.fileName || '').toLowerCase()  
        if (  
            mime.startsWith('video/') ||  
            mime === 'application/mp4' ||  
            name.endsWith('.mp4') ||  
            name.endsWith('.mkv') ||  
            name.endsWith('.mov')  
        ) return 'document'  
    }  

    return null
}

async function downloadMediaToDisk(m, mediaType, destPath) {
    const msg = m.quoted.message
    if (!msg) return false

    let content = null, type = null
    if (mediaType === 'document' && msg.documentMessage) {
        content = msg.documentMessage
        type = 'document'
    } else if (msg.videoMessage) {
        content = msg.videoMessage
        type = 'video'
    } else if (msg.viewOnceMessage?.message?.videoMessage) {
        content = msg.viewOnceMessage.message.videoMessage
        type = 'video'
    } else if (msg.viewOnceMessageV2?.message?.videoMessage) {
        content = msg.viewOnceMessageV2.message.videoMessage
        type = 'video'
    } else if (msg.ephemeralMessage?.message?.videoMessage) {
        content = msg.ephemeralMessage.message.videoMessage
        type = 'video'
    }

    if (content) {
        try {
            const { downloadContentFromMessage } = await import('@whiskeysockets/baileys')
            const stream = await downloadContentFromMessage(content, type)
            const writeStream = fs.createWriteStream(destPath)
            await new Promise((resolve, reject) => {
                stream.pipe(writeStream)
                writeStream.on('finish', resolve)
                writeStream.on('error', reject)
                stream.on('error', reject)
            })
            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) return true
        } catch {}

        try {
            const { downloadContentFromMessage } = await import('ourin')
            const stream = await downloadContentFromMessage(content, type)
            const writeStream = fs.createWriteStream(destPath)
            await new Promise((resolve, reject) => {
                stream.pipe(writeStream)
                writeStream.on('finish', resolve)
                writeStream.on('error', reject)
                stream.on('error', reject)
            })
            if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) return true
        } catch {}
    }

    try {
        const buf = await m.quoted.download()
        if (buf && buf.length > 1000) {
            fs.writeFileSync(destPath, buf)
            return true
        }
    } catch {}

    return false
}

function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / 1024).toFixed(1)} KB`
}

async function getVideoDuration(filePath) {
    try {
        const { stdout } = await execFileAsync('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            filePath
        ])
        const duration = Math.round(parseFloat(stdout.trim()))
        return isNaN(duration) ? 0 : duration
    } catch {
        return 0
    }
}

async function reencodeVideo(inputPath, outputPath) {
    // Mode Bulletproof: Parameter paling aman, anti-crash untuk Termux dan WhatsApp
    await execFileAsync('ffmpeg', [  
        '-i', inputPath,  
        '-t', '60',              
        '-threads', '0',         
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', // Otomatis genap, aman untuk vertikal/horizontal
        '-r', '30',
        '-c:v', 'libx264',  
        '-crf', '22',            // Balance optimal kualitas & ukuran
        '-preset', 'ultrafast',  // Render super cepat anti timeout
        '-sn',                  
        '-profile:v', 'baseline', // Paling kompatibel untuk status WA
        '-level', '3.0',  
        '-pix_fmt', 'yuv420p',  
        '-c:a', 'aac',  
        '-b:a', '128k',  
        '-ar', '44100',  
        '-ac', '2',  
        '-movflags', '+faststart',  
        '-avoid_negative_ts', 'make_zero',  
        '-y', outputPath  
    ], { timeout: 120000 })
}

async function handler(m, { sock }) {
    if (!m.isGroup) {
        return m.reply('Perintah ini hanya bisa dijalankan di dalam grup.')
    }

    if (!m.quoted) {  
        return m.reply(  
            `*CONVERT VIDEO STATUS WA*\n\n` +  
            `Reply video atau dokumen MP4 lalu ketik:\n` +  
            `\`${m.prefix}convertsw\`\n\n` +  
            `• Batas Durasi: Max 60 Detik\n` +  
            `• Batas File: 250 MB`  
        )  
    }  

    const mediaType = getMediaType(m)  
    if (!mediaType) {  
        return m.reply('Format tidak valid. Harap reply video atau dokumen MP4.')
    }  

    try {  
        await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 })
    } catch {  
        return m.reply('FFmpeg tidak terdeteksi di sistem server.')
    }  

    m.react('⏳')  

    const tmpDir = path.join(__dirname, '../../tmp')  
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })  

    const ts = Date.now()  
    const inPath = path.join(tmpDir, `csw_in_${ts}.mp4`)  
    const outPath = path.join(tmpDir, `csw_out_${ts}.mp4`)  

    try {  
        await m.reply('Sedang memproses video...')  

        const successDownload = await downloadMediaToDisk(m, mediaType, inPath)
        if (!successDownload || !fs.existsSync(inPath)) {  
            m.react('❌')  
            return m.reply('Gagal mengunduh file media.')  
        }  

        const inStats = fs.statSync(inPath)
        if (inStats.size > 250 * 1024 * 1024) {  
            m.react('❌')  
            if (fs.existsSync(inPath)) fs.unlinkSync(inPath)
            return m.reply('Ukuran file terlalu besar. Batas maksimal adalah 250 MB.')  
        }  

        const inputSize = formatSize(inStats.size)  

        await reencodeVideo(inPath, outPath)  
        if (!fs.existsSync(outPath)) throw new Error('Gagal merender video')  

        const videoDuration = await getVideoDuration(outPath)
        const outStats = fs.statSync(outPath)
        const outputSize = formatSize(outStats.size)  

        await sock.sendMessage(  
            m.chat,  
            {  
                video: { url: outPath },  
                mimetype: 'video/mp4',  
                fileName: `status_${ts}.mp4`,  
                caption:  
                    `*CONVERT SUCCESS*\n\n` +  
                    `• Input Size  : ${inputSize}\n` +  
                    `• Output Size : ${outputSize}\n` +  
                    `• Durasi Video: ${videoDuration > 0 ? `${videoDuration} Detik` : '60 Detik'}\n\n` +  
                    `Video siap dikirim ke status WhatsApp.`,  
                gifPlayback: false,  
                ptv: false  
            },  
            { quoted: m }  
        )  

        m.react('✅')  

    } catch (error) {  
        console.error('[convertsw]', error.message)  
        m.react('❌')  
        await m.reply(`Terjadi kesalahan: ${error.message?.slice(0, 150)}`)  
    } finally {  
        if (fs.existsSync(inPath)) fs.unlinkSync(inPath)  
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath)  
    }
}

export { pluginConfig as config, handler }