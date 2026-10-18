const pluginConfig = {
    name: "cekfunction",
    alias: ["cekfunc", "cekjs", "ceksyntax"],
    category: "tools",
    description: "Mengecek validitas syntax kode JavaScript (Reply kode)",
    usage: ".cekfunction [reply kode JS]",
    example: ".cekfunction",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 1, 
    isEnabled: true
}

async function handler(m, { sock }) {
    // KurumiMD handler format
    const q = m.quoted ? m.quoted : null
    
    if (!q) {
        return m.reply("❌ Reply function atau kode JavaScript yang ingin dicek.")
    }

    // Ambil teks dari pesan yang di-reply
    const text = q.text || q.caption || q.body || q.message?.conversation || q.message?.extendedTextMessage?.text
    
    if (!text) {
        return m.reply("❌ Pesan yang direply tidak berisi kode teks.")
    }

    await m.react("🕒")

    // Dynamic import module acorn untuk menghindari pending load di awal
    let acorn
    try {
        const acornModule = await import("acorn")
        acorn = acornModule.default || acornModule
    } catch (e) {
        await m.react("❌")
        return m.reply("❌ Module acorn belum terinstall di server.\n\nSilakan jalankan di terminal:\n`npm install acorn`")
    }

    try {
        // Parsing kode dengan Acorn
        acorn.parse(text, {
            ecmaVersion: "latest",
            sourceType: "module",
            locations: true
        })

        // Jika berhasil tanpa lempar error
        const successMsg = `🔎 Mengecek syntax function...\n\n✅ *SYNTAX VALID*\nTidak ditemukan error dalam kode tersebut.\n\n© KurumiMD`
        
        await sock.sendMessage(m.chat, { text: successMsg }, { quoted: m })
        await m.react("✅")

    } catch (err) {
        // Logika penangkapan baris error
        const lines = text.split("\n")
        const line = err.loc?.line || 0
        const column = err.loc?.column || 0

        const start = Math.max(0, line - 3)
        const end = Math.min(lines.length, line + 2)

        const snippet = lines
            .slice(start, end)
            .map((l, i) => {
                const num = start + i + 1
                return num === line
                    ? `👉 ${num} | ${l}`
                    : `   ${num} | ${l}`
            })
            .join("\n")

        const errorMsg = `❌ *ERROR TERDETEKSI*\n\n${err.message}\nLine ${line}:${column}\n\n📌 *CUPLIKAN KODE:*\n\`\`\`javascript\n${snippet}\n\`\`\`\n\n© KurumiMD`

        await sock.sendMessage(m.chat, { text: errorMsg }, { quoted: m })
        await m.react("❌")
    }
}

export { pluginConfig as config, handler }