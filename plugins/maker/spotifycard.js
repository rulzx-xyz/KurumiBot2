const pluginConfig = {
    name: "spotifycard",
    alias: ["spotifycard", "spoticard"],
    category: "maker",
    description: "Membuat gambar Spotify Card custom (reply foto)",
    usage: ".spotifycard Judul|Artis",
    example: ".spotifycard Swim|Chase Atlantic",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1, 
    isEnabled: true
}

async function handler(m, { sock, args }) {
    const text = args.join(' ')
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mediaType || ''
    
    if (!/image/i.test(mime)) {
        return m.reply(`❌ Reply sebuah foto dengan caption:\n\n*${m.prefix + m.command} Judul Lagu|Nama Artist*`)
    }

    if (!text) {
        return m.reply(`❌ Format salah!\n\nContoh:\n*${m.prefix + m.command} Swim|Chase Atlantic*`)
    }

    const [title, artist] = text.split('|').map(v => v?.trim())

    if (!title || !artist) {
        return m.reply(`❌ Format pemisah salah, pastikan pakai tanda |\n\nContoh:\n*${m.prefix + m.command} Swim|Chase Atlantic*`)
    }

    await m.react('🕒')

    try {
        const cover = await q.download()
        
        if (!cover) {
            await m.react('❌')
            return m.reply('❌ Gagal mengunduh gambar.')
        }

        // DYNAMIC IMPORT: Modul dipanggil hanya pas command diketik biar bot gak nge-lag/pending
        const scraperModule = await import('@zenaveline/scraper')
        const scraper = scraperModule.default || scraperModule

        const buffer = await scraper.spotifycard({
            cover,
            title,
            artist
        })

        await sock.sendMessage(m.chat, { 
            image: buffer, 
            caption: '🎧 *Spotify Card by KurumiMD*' 
        }, { quoted: m })

        await m.react('✅')
    } catch (e) {
        console.error('[SPOTIFY CARD ERROR]', e)
        await m.react('❌')
        m.reply('❌ Gagal membuat Spotify Card. Pastikan module @zenaveline/scraper sudah terinstall di server.')
    }
}

export { pluginConfig as config, handler }