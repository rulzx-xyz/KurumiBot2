import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";
import config from "../../config.js"

const pluginConfig = {
    name: "sc",
    alias: ["script"],
    category: "main",
    description: "Link script bot wa terbaru",
    usage: ".sc",
    example: ".sc",
    isPremium: false,
    isOwner: false,
    isBanned: false,
    isAdmin: false,
    cooldown: 10,
    energi: 0,
    isBotAdmin: false,
    isEnabled: true
}

async function handler(m, { sock }) {
    return await sock.sendMessage(m.chat, {
        image: getAssetBuffer("kurumi2"),
        caption: `🎀 Halo kak *${m.pushName}*
        
Untuk asli dari bot ini, kamu bisa dapatkan melalui link, nanti kamu tinggal cari kata kunci *sc*`,
        footer: "💬 Link ini nanti akan mengarahkan kamu ke Channel RulzxXyz*",
        interactiveButtons: [
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: "⏰ Kunjungi Channel RulzxXyz",
                    url: "https://whatsapp.com/channel/0029Vb6XXI13GJP7RMc2ur0S",
                    merchant_url: "https://whatsapp.com/channel/0029Vb6XXI13GJP7RMc2ur0S"
                })
            }
        ]

    }, { quoted: m })
}

export { pluginConfig as config, handler }