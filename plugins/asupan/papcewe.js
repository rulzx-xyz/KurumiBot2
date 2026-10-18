import {
  generateWAMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
} from "ourin";
import te from "../../src/lib/ourin-error.js";
import axios from "axios";

const pluginConfig = {
  name: "papcewe",
  alias: ["pap", "papcewe", "papayang"],
  category: "asupan",
  description: "Minta pap cewe cantik (Papayang)",
  usage: ".papcewe",
  example: ".papcewe",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  await m.react("🕕");

  try {
    const apiUrl = "https://api.kyzzz.xyz/api/image/papayang?apikey=kyzz4365513552";
    
    // Ambil data dari API pake axios (sama kayak plugin asupan lu)
    let imageUrl = apiUrl;
    try {
        const { data } = await axios.get(apiUrl, { timeout: 15000 });
        if (data) {
            if (typeof data === 'string' && data.startsWith('http')) imageUrl = data;
            else if (data.url) imageUrl = data.url;
            else if (data.result) imageUrl = typeof data.result === 'string' ? data.result : (data.result.url || data.result.link);
        }
    } catch (e) {
        // Kalau error parse JSON, asumsikan API mengembalikan buffer gambar langsung (imageUrl tetap apiUrl)
    }

    const mediaMessage = await prepareWAMessageMedia({
      image: { url: imageUrl }
    }, { upload: sock.waUploadToServer });

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {},
          interactiveMessage: {
            header: {
              title: "",
              subtitle: "",
              hasMediaAttachment: true,
              imageMessage: mediaMessage.imageMessage
            },
            footer: {
              text: "KurumiMD"
            },
            body: {
              text: `📸 *PAP CEWE*`
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "🔁 Next",
                    id: `${m.prefix}papcewe`
                  })
                }
              ]
            }
          }
        }
      }
    }, { quoted: m, userJid: sock.user.jid });

    await sock.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id,
    });

    await m.react("✅");

  } catch (error) {
    console.error("[PAP CEWE Error]", error.message);
    await m.react("❌");
    m.reply("😔 Gagal memuat PAP. API mungkin sedang bermasalah.");
  }
}

export { pluginConfig as config, handler };