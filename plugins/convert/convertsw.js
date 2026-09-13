import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const execFileAsync = promisify(execFile)

let sedangProses = false

const pluginConfig = {
    name: 'convertsw',
    alias: ['convertsw'],
    category: 'convert',
    description: 'Convert video untuk status WhatsApp (Max 60 detik, aspect ratio asli, Progress Bar)',
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

const KATA_BERKELAS = [
    "Kualitas bukanlah sebuah tindakan, melainkan sebuah kebiasaan.",
    "Karya yang hebat tidak dihasilkan oleh kekuatan, melainkan ketekunan.",
    "Hal-hal besar tidak pernah datang dari zona nyaman.",
    "Bukan tentang seberapa cepat, tapi seberapa konsisten.",
    "Detail kecil membedakan yang biasa dengan yang luar biasa.",
    "Kesabaran itu pahit, tetapi buahnya manis.",
    "Waktu adalah modal paling berharga bagi mereka yang mengerti.",
    "Kesempurnaan tidak bisa dicapai, namun dalam mengejarnya kita menangkap keunggulan."
]

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
        const duration = parseFloat(stdout.trim())
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

function targetDimensi(width, height) {
    const maxSide = 1920
    let targetW = width
    let targetH = height

    if (width >= height) {
        if (width > maxSide) {
            targetW = maxSide
            targetH = Math.round((height * maxSide) / width)
        } else if (width < 1280) {
            targetW = 1280
            targetH = Math.round((height * 1280) / width)
        }
    } else {
        if (height > maxSide) {
            targetH = maxSide
            targetW = Math.round((width * maxSide) / height)
        } else if (height < 1280) {
            targetH = 1280
            targetW = Math.round((width * 1280) / height)
        }
    }

    targetW = targetW % 2 !== 0 ? targetW + 1 : targetW
    targetH = targetH % 2 !== 0 ? targetH + 1 : targetH

    const orientasi = targetH > targetW ? 'portrait' : targetH === targetW ? 'square' : 'landscape'
    return { w: targetW, h: targetH, orientasi }
}

async function tungguFileSiap(filePath, percobaan = 5, jedaMs = 250) {
    for (let i = 0; i < percobaan; i++) {
        try {
            const stat = fs.statSync(filePath)
            if (stat.size > 1000) return true
        } catch { }
        await new Promise(r => setTimeout(r, jedaMs))
    }
    return fs.existsSync(filePath)
}

function buatProgressBar(persen) {
    const totalKotak = 12
    const terisi = Math.round((persen / 100) * totalKotak)
    const kosong = totalKotak - terisi
    const isi = '█'.repeat(terisi)
    const blm = '░'.repeat(kosong)
    return `[${isi}${blm}]`
}

async function reencodeVideoWithProgress(inputPath, outputPath, fps, targetW, targetH, totalDurationSec, onProgress) {
    const scaleFilter = `scale=w=${targetW}:h=${targetH}`

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

    let sukses = false
    try {
        await jalankanFfmpegProses([
            '-i', inputPath,
            '-t', '60',
            '-threads', '0',
            '-vf', `${scaleFilter},minterpolate=fps=${fps}:mi_mode=blend`,
            '-preset', 'veryfast',
            '-crf', '19',
            ...argsBersama
        ], totalDurationSec, onProgress)
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) sukses = true
    } catch (e) {
        console.error('[convertsw] minterpolate gagal, mencoba fallback:', e.message)
    }

    if (!sukses) {
        await jalankanFfmpegProses([
            '-i', inputPath,
            '-t', '60',
            '-threads', '0',
            '-vf', `${scaleFilter},fps=${fps}`,
            '-preset', 'ultrafast',
            '-crf', '20',
            ...argsBersama
        ], totalDurationSec, onProgress)
    }

    return sukses ? 'halus' : 'fallback'
}

function jalankanFfmpegProses(args, totalDurationSec, onProgress) {
    return new Promise((resolve, reject) => {
        const ff = spawn('ffmpeg', args)
        let stderrData = ''

        ff.stderr.on('data', (chunk) => {
            const text = chunk.toString()
            stderrData += text

            const match = text.match(/time=(\d{2}):(\d{2}):([\d.]+)/)
            if (match && totalDurationSec > 0) {
                const jam = parseInt(match[1])
                const mnt = parseInt(match[2])
                const dtk = parseFloat(match[3])
                const detikBerjalan = (jam * 3600) + (mnt * 60) + dtk
                
                let persen = Math.round((detikBerjalan / Math.min(totalDurationSec, 60)) * 100)
                if (persen > 99) persen = 99
                onProgress(persen)
            }
        })

        ff.on('close', (code) => {
            if (code === 0) resolve(true)
            else {
                const err = new Error(`FFmpeg exited with code ${code}`)
                err.stderr = stderrData
                reject(err)
            }
        })
        ff.on('error', (err) => reject(err))
    })
}

async function handler(m, { sock, args }) {
    if (!m.isGroup) {
        return m.reply('Perintah ini hanya bisa dijalankan di dalam grup.')
    }

    if (sedangProses) {
        return m.reply('⏳ Masih ada video lain yang sedang diproses. Mohon tunggu sebentar.')
    }

    if (!m.quoted) {
        return m.reply(
            `*STATUS WA CONVERTER*\n\n` +
            `Reply video atau dokumen MP4 lalu ketik:\n` +
            `\`${m.prefix}convertsw <60/90/120>\`\n\n` +
            `• Default FPS: ${FPS_DEFAULT}fps\n` +
            `• Fitur: Motion Smoothing + Aspect Ratio Asli Terjaga\n` +
            `• Durasi Max: 60 Detik`
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

    const tmpDir = path.join(os.tmpdir(), 'kurumibot-convertsw')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const ts = Date.now()
    const inPath = path.join(tmpDir, `csw_in_${ts}.mp4`)
    const outPath = path.join(tmpDir, `csw_out_${ts}.mp4`)

    let msgProgress = await sock.sendMessage(m.chat, {
        text: `⏳ *[SYSTEM]* : Mempersiapkan konversi...\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `⏳ ${buatProgressBar(0)} 0%\n` +
              `🎯 Status: Mengunduh Media...`
    }, { quoted: m }).catch(() => null)

    try {
        const successDownload = await downloadMediaToDisk(m, mediaType, inPath)
        if (!successDownload || !fs.existsSync(inPath)) {
            m.react('❌')
            if (msgProgress?.key) await sock.sendMessage(m.chat, { delete: msgProgress.key }).catch(() => {})
            return m.reply('Gagal mengunduh file media.')
        }

        const inStats = fs.statSync(inPath)
        if (inStats.size > 250 * 1024 * 1024) {
            m.react('❌')
            if (fs.existsSync(inPath)) fs.unlinkSync(inPath)
            if (msgProgress?.key) await sock.sendMessage(m.chat, { delete: msgProgress.key }).catch(() => {})
            return m.reply('Ukuran file terlalu besar. Batas maksimal adalah 250 MB.')
        }

        const inputSize = formatSize(inStats.size)

        if (!(await tungguFileSiap(inPath))) {
            throw new Error('File input hilang sebelum sempat diproses.')
        }

        const totalDurationSec = await getVideoDuration(inPath)
        const { width, height } = await getVideoDimensions(inPath)
        const { w: targetW, h: targetH, orientasi } = targetDimensi(width, height)

        if (msgProgress?.key) {
            await sock.sendMessage(m.chat, {
                text: `⚙️ *[SYSTEM]* : Memulai Render Video\n` +
                      `━━━━━━━━━━━━━━━━━━━\n` +
                      `⏳ ${buatProgressBar(5)} 5%\n` +
                      `🎯 Target: ${targetW}x${targetH} (${orientasi}) • ${fps}fps`,
                edit: msgProgress.key
            }).catch(() => {})
        }

        let lastUpdatedPercent = 5
        const metode = await reencodeVideoWithProgress(inPath, outPath, fps, targetW, targetH, totalDurationSec, async (persen) => {
            if (persen >= lastUpdatedPercent + 15 || persen === 99) {
                lastUpdatedPercent = persen
                if (msgProgress?.key) {
                    await sock.sendMessage(m.chat, {
                        text: `⚙️ *[SYSTEM]* : Memproses Konversi...\n` +
                              `━━━━━━━━━━━━━━━━━━━\n` +
                              `⏳ ${buatProgressBar(persen)} ${persen}%\n` +
                              `🎯 Resolusi: ${targetW}x${targetH} (${orientasi})`,
                        edit: msgProgress.key
                    }).catch(() => {})
                }
            }
        })

        if (!fs.existsSync(outPath)) throw new Error('Gagal merender video')

        if (msgProgress?.key) {
            await sock.sendMessage(m.chat, {
                text: `✨ *[SYSTEM]* : Render Selesai!\n` +
                      `━━━━━━━━━━━━━━━━━━━\n` +
                      `⏳ ${buatProgressBar(100)} 100%\n` +
                      `🎯 Mengirim video ke chat...`,
                edit: msgProgress.key
            }).catch(() => {})
        }

        const videoDuration = await getVideoDuration(outPath)
        const outStats = fs.statSync(outPath)
        const outputSize = formatSize(outStats.size)
        const randomQuotes = KATA_BERKELAS[Math.floor(Math.random() * KATA_BERKELAS.length)]

        if (msgProgress?.key) {
            await sock.sendMessage(m.chat, { delete: msgProgress.key }).catch(() => {})
        }

        await sock.sendMessage(
            m.chat,
            {
                video: { url: outPath },
                mimetype: 'video/mp4',
                fileName: `status_${ts}.mp4`,
                caption:
                    `*STATUS CONVERTER SUCCESS*\n\n` +
                    `• Resolusi   : ${targetW}x${targetH} (${orientasi}, HD)\n` +
                    `• Frame Rate : ${fps}fps ${metode === 'halus' ? '(Motion Smoothing)' : '(Fallback Mode)'}\n` +
                    `• Input Size : ${inputSize}\n` +
                    `• Output Size: ${outputSize}\n` +
                    `• Durasi     : ${videoDuration > 0 ? `${Math.round(videoDuration)} Detik` : '60 Detik'}\n\n` +
                    `_"${randomQuotes}"_`,
                gifPlayback: false,
                ptv: false
            },
            { quoted: m }
        )

        m.react('✅')

    } catch (error) {
        console.error('[convertsw]', error.message)
        m.react('❌')
        if (msgProgress?.key) {
            await sock.sendMessage(m.chat, { delete: msgProgress.key }).catch(() => {})
        }
        const detail = (error.stderr && error.stderr.trim())
            ? error.stderr.trim().slice(-600)
            : (error.message || 'Unknown error').slice(-600)
        await m.reply(`❌ *[ERROR]* Terjadi kesalahan saat memproses video:\n\`\`\`${detail}\`\`\``)
    } finally {
        sedangProses = false
        if (fs.existsSync(inPath)) fs.unlinkSync(inPath)
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
    }
}

export { pluginConfig as config, handler }