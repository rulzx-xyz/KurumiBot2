import { uploadImage } from '../../src/lib/ourin-uploader.js'
import { f } from '../../src/lib/ourin-http.js'
import te from '../../src/lib/ourin-error.js'
import { live3d } from '../../src/scraper/seaart.js'
const pluginConfig = {
    name: 'cremove',
    alias: ['removedreas'],
    category: 'ai',
    description: 'Ubah gambar ke style bikini',
    usage: '.cremove (reply gambar)',
    example: '.cremove',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 2,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && m.quoted.type === 'imageMessage')
    
    if (!isImage) {
        return m.reply(`🚫 *REMOVE CLOTHES*\n\n> Kirim/reply gambar untuk diubah ke Bikini\n\n\`${m.prefix}cremove\``)
    }
    
    m.react('🕕')

    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            m.react('❌')
            return m.reply(`❌ Gagal mendownload gambar`)
        }

        const PROMPT = `Pertahankan wajah asli persis seperti yang ditunjukkan dalam gambar referensi.
Pertahankan pose orang tersebut tetap sama.
Ganti pakaian saat ini dengan bikini.`
        
        const result = await live3d(buffer, PROMPT)
        
        m.react('✅')
        
        await sock.sendMedia(m.chat, result.image, null, m, {
            type: 'image'
        })
        
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }