import axios from 'axios'

const pluginConfig = {
    name: "andin",
    alias: ["andin"],
    category: "asupan",
    description: "Mengambil gambar atau video random Andin",
    usage: ".andin",
    example: ".andin",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 1, // Menggantikan fitur handler.limit = true
    isEnabled: true
}

async function handler(m, { sock }) {
    // Reaksi loading menggantikan reply(global.mess.wait)
    await m.react('🕒')

    try {
        // Menggunakan global.API bawaan dari sistem lu
        const apiUrl = global.API('kyzz', '/api/random/andin', {}, 'apikey')
        const { data } = await axios.get(apiUrl, { timeout: 15000 }).catch(() => ({ data: null }))

        let mediaUrl = apiUrl
        if (data) {
            if (typeof data === 'string' && data.startsWith('http')) mediaUrl = data
            else if (data.url) mediaUrl = data.url
            else if (data.result) mediaUrl = typeof data.result === 'string' ? data.result : (data.result.url || data.result.link)
        }

        // Coba kirim sebagai gambar dulu
        await sock.sendMessage(m.chat, {
            image: { url: mediaUrl },
            caption: '📸 *Random Andin*'
        }, { quoted: m }).catch(async () => {
            // Kalau gagal (karena formatnya ternyata video), kirim sebagai video
            await sock.sendMessage(m.chat, {
                video: { url: mediaUrl },
                caption: '🎥 *Random Andin*',
                mimetype: 'video/mp4'
            }, { quoted: m })
        })

        await m.react('✅')

    } catch (e) {
        console.error('[RANDOM ANDIN ERROR]', e)
        await m.reply('❌ Gagal mengambil media Andin.')
    }
}

export { pluginConfig as config, handler }