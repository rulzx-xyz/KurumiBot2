import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const execFileAsync = promisify(execFile)

// Lock sederhana - cegah 2 proses convertsw jalan bersamaan (rebutan CPU/RAM
// bisa bikin file kehapus/gagal baca di tengah proses, kayak yang kejadian).
let sedangProses = false

const pluginConfig = {
    name: 'convertsw',
    alias: ['convertsw'],
    category: 'convert',
    description: 'Convert video untuk status WhatsApp (Max 60 detik, 1080p, pilih 60/90/120fps)',
    usage: '.convertsw <60/90/120> (reply video / dokumen mp4)',
    example: '.convertsw 120',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 15,
    energi: 3,
    isEnabled: true
}

const FPS_PILIHAN = [60, 90, 120]
const FPS_DEFAULT = 60

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

async function getVideoDimensions(filePath) {
    try {
        const { stdout } = await execFileAsync('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height',
            '-of', 'csv=s=x:p=0',
            filePath
        ])
        const [w, h] = stdout.trim().split('x').map(Number)
        if (!w || !h) return { width: 1920, height: 1080 }
        return { width: w, height: h }
    } catch {
        return { width: 1920, height: 1080 }
    }
}

// Sesuaikan target 1080p berdasarkan orientasi video asli, biar gak
// nambahin bar hitam gede kayak video portrait dipaksa ke frame landscape.
function targetDimensi(width, height) {
    if (height > width) return { w: 1080, h: 1920 } // portrait
    if (height === width) return { w: 1080, h: 1080 } // square
    return { w: 1920, h: 1080 } // landscape
}

// Scale paksa ke 1920x1080 (pad hitam kalau aspect ratio beda, biar gak gepeng/distorsi)
function tunggu(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// Pengaman: pastikan file beneran siap dibaca (bukan cuma existsSync yang
// bisa true tapi write belum kelar/buffer belum keflush) sebelum ffmpeg
// dipanggil - ini yang bikin "No such file or directory" kejadian kemarin.
async function tungguFileSiap(filePath, percobaan = 5, jedaMs = 250) {
    for (let i = 0; i < percobaan; i++) {
        try {
            const stat = fs.statSync(filePath)
            if (stat.size > 1000) return true
        } catch { }
        await tunggu(jedaMs)
    }
    return fs.existsSync(filePath)
}

async function reencodeVideo(inputPath, outputPath, fps, targetW, targetH) {
    const scaleFilter = `scale=w=${targetW}:h=${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black`

    const argsBersama = [
        '-c:v', 'libx264',
        '-sn',
        '-profile:v', 'high',
        '-level', '5.1',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '48000',
        '-ac', '2',
        '-movflags', '+faststart',
        '-avoid_negative_ts', 'make_zero',
        '-y', outputPath
    ]

    // Percobaan 1: motion interpolation mode "blend" (jauh lebih ringan
    // dari "mci" full motion-compensation) - tetap lebih halus dari
    // duplikasi frame biasa, tapi gak seberat sebelumnya.
    try {
        await execFileAsync('ffmpeg', [
            '-i', inputPath,
            '-t', '60',
            '-threads', '0',
            '-vf', `${scaleFilter},minterpolate=fps=${fps}:mi_mode=blend`,
            '-preset', 'veryfast',
            '-crf', '19',
            ...argsBersama
        ], { timeout: 180000 }) // 3 menit
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) return 'halus'
    } catch (e) {
        console.error('[convertsw] minterpolate gagal, fallback ke cara cepat:', e.message)
    }

    // Fallback: kalau minterpolate gagal/timeout, tetap kasih hasil HD
    // (CRF rendah) walau geraknya duplikat frame, bukan interpolasi asli.
    await execFileAsync('ffmpeg', [
        '-i', inputPath,
        '-t', '60',
        '-threads', '0',
        '-vf', `${scaleFilter},fps=${fps}`,
        '-preset', 'ultrafast',
        '-crf', '20',
        ...argsBersama
    ], { timeout: 90000 })

    return 'fallback'
}

async function handler(m, { sock, args }) {
    if (!m.isGroup) {
        return m.reply('Perintah ini hanya bisa dijalankan di dalam grup.')
    }

    if (sedangProses) {
        return m.reply('⏳ Masih ada video lain yang sedang diproses. Tunggu sampai selesai dulu ya, baru coba lagi.')
    }

    if (!m.quoted) {
        return m.reply(
            `*CONVERT VIDEO STATUS WA*\n\n` +
            `Reply video atau dokumen MP4 lalu ketik:\n` +
            `\`${m.prefix}convertsw <60/90/120>\`\n\n` +
            `Contoh: \`${m.prefix}convertsw 90\`\n` +
            `(kalau gak diisi, default ${FPS_DEFAULT}fps)\n\n` +
            `• Output dipaksa: 1080p\n` +
            `• Batas Durasi: Max 60 Detik\n` +
            `• Batas File: 250 MB\n\n` +
            `_Prioritas kualitas (motion smoothing + HD) - proses bisa makan waktu beberapa menit._`
        )
    }

    const fpsInput = parseInt(args[0])
    const fps = FPS_PILIHAN.includes(fpsInput) ? fpsInput : FPS_DEFAULT

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
    sedangProses = true

    // Pakai OS temp dir (bukan folder tmp/ milik project) - biar gak
    // kesentuh proses cleanup lain di kode utama bot yang mungkin
    // membersihkan tmp/ secara berkala dan bikin file hilang di tengah proses.
    const tmpDir = path.join(os.tmpdir(), 'kurumibot-convertsw')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const ts = Date.now()
    const inPath = path.join(tmpDir, `csw_in_${ts}.mp4`)
    const outPath = path.join(tmpDir, `csw_out_${ts}.mp4`)

    try {
        await m.reply(`Sedang memproses video (HD, motion smoothing)... bisa makan waktu beberapa menit ⏳`)

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

        if (!(await tungguFileSiap(inPath))) {
            throw new Error('File input hilang sebelum sempat diproses (kemungkinan resource VPS penuh).')
        }

        const { width, height } = await getVideoDimensions(inPath)
        const { w: targetW, h: targetH } = targetDimensi(width, height)

        const metode = await reencodeVideo(inPath, outPath, fps, targetW, targetH)
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
                    `• Resolusi   : ${targetW}x${targetH} (dipaksa, ${targetW > targetH ? 'landscape' : targetW === targetH ? 'square' : 'portrait'}, HD)\n` +
                    `• Frame Rate : ${fps}fps ${metode === 'halus' ? '(motion smoothing asli)' : '(fallback, tetap HD)'}\n` +
                    `• Input Size : ${inputSize}\n` +
                    `• Output Size: ${outputSize}\n` +
                    `• Durasi     : ${videoDuration > 0 ? `${videoDuration} Detik` : '60 Detik'}\n\n` +
                    `_Catatan: WhatsApp bisa aja kompres ulang video ini saat di-upload ke status._`,
                gifPlayback: false,
                ptv: false
            },
            { quoted: m }
        )

        m.react('✅')

    } catch (error) {
        console.error('[convertsw]', error.message)
        m.react('❌')
        // error.message dari execFile cuma nunjukin command line yang gagal
        // (bisa kepotong sebelum sempat kelihatan alasannya) - stderr asli
        // dari ffmpeg ada di error.stderr, ambil baris-baris terakhirnya
        // karena pesan error ffmpeg biasanya muncul di akhir output.
        const detail = (error.stderr && error.stderr.trim())
            ? error.stderr.trim().slice(-600)
            : (error.message || 'Unknown error').slice(-600)
        await m.reply(`Terjadi kesalahan saat memproses video:\n\`\`\`${detail}\`\`\``)
    } finally {
        sedangProses = false
        if (fs.existsSync(inPath)) fs.unlinkSync(inPath)
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
    }
}

export { pluginConfig as config, handler }