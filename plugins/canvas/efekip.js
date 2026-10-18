import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import te from '../../src/lib/ourin-error.js'

const pluginConfig = {
    name: 'efekip',
    alias: ['iphonefilter', 'iosfilter', 'efekiphone'],
    category: 'canvas',
    description: 'Mengubah foto biasa menjadi tone warna natural ala Kamera iPhone (iOS Look)',
    usage: '.efekip <reply/kirim foto>',
    example: '.efekip',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        // 🛠️ BRUTE FORCE DETEKSI MEDIA (Support Direct Send dengan Caption & Reply)
        const q = m.quoted ? m.quoted : m;
        
        const mime = (q.msg || q).mimetype || m.mimetype || q.message?.imageMessage?.mimetype || "";
        const hasImageMessage = m.message?.imageMessage || q.message?.imageMessage || q.msg?.imageMessage || q.isImage;

        if (!mime.includes("image") && !hasImageMessage) {
            return m.reply('⚠️ _"Ara ara~ mana foto yang mau Kurumi ubah jadi tone iPhone?"_\n\nKirim foto dengan caption *.efekip* atau reply fotonya ya kak~');
        }

        m.react('🕕');

        const tmpDir = path.join(os.tmpdir(), 'kurumibot-efekip');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const ts = Date.now();
        const inPath = path.join(tmpDir, `in_${ts}.jpg`);
        const outPath = path.join(tmpDir, `out_${ts}.jpg`);

        // Paksa download pakai fungsi bawaan quoted atau m
        let media = null;
        if (typeof q.download === 'function') {
            media = await q.download().catch(() => null);
        }
        if (!media && typeof m.download === 'function') {
            media = await m.download().catch(() => null);
        }

        // Kalau masih lolos, sedot paksa pake stream Baileys
        if (!media) {
            const imgMsg = q.message?.imageMessage || m.message?.imageMessage || q.msg;
            if (imgMsg) {
                const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
                const stream = await downloadContentFromMessage(imgMsg, 'image');
                let chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                media = Buffer.concat(chunks);
            }
        }

        if (!media || media.length === 0) {
            throw new Error("Gagal mengunduh media gambar dari pesan.");
        }

        fs.writeFileSync(inPath, media);

        // Render FFmpeg Tone iPhone
        await new Promise((resolve, reject) => {
            let stderrData = '';
            const ff = spawn('ffmpeg', [
                '-i', inPath,
                '-vf', 'eq=contrast=1.12:brightness=0.02:saturation=1.25,unsharp=5:5:0.8:3:3:0.4',
                '-q:v', '2',
                '-y', outPath
            ]);

            ff.stderr.on('data', chunk => { stderrData += chunk.toString() });
            ff.on('close', code => {
                if (code === 0) resolve();
                else reject(new Error(`FFmpeg error (Code: ${code})\n${stderrData.slice(-200)}`));
            });
            ff.on('error', err => reject(err));
        });

        if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
            throw new Error("Hasil render filter kosong.");
        }

        const finalBuffer = fs.readFileSync(outPath);

        m.react('✅');
        await sock.sendMessage(m.chat, {
            image: finalBuffer,
            caption: '📸 *E F E K  I P H O N E*\n\n> _Tone warna berhasil disesuaikan jadi lebih natural dan jernih ala iOS ✨_'
        }, { quoted: m });

        // Cleanup
        if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

    } catch (error) {
        console.error('[efekip error]', error);
        m.react('☢');
        await m.reply(te(m.prefix, m.command, m.pushName) || `❌ Gagal memproses efek foto:\n\n\`\`\`${error.message}\`\`\``);
    }
}

export { pluginConfig as config, handler }