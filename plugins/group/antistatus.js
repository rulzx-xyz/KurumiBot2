import { getContentType } from "ourin"

const pluginConfig = {
  name: "antistatus",
  alias: ["anticall", "antistory"],
  category: "group",
  description: "Auto hapus jika ada yang mengirim status/story ke dalam grup",
  usage: ".antistatus on / off",
  example: ".antistatus on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
}

// Handler untuk mengaktifkan/menonaktifkan fitur via perintah chat
async function handler(m, { sock, args, db }) {
  if (!m.isOwner && !m.isAdmin) {
    return m.reply("❌ Perintah ini khusus untuk Admin Grup atau Owner!");
  }

  const action = args[0]?.toLowerCase();
  if (!action || !["on", "off"].includes(action)) {
    return m.reply(`*PILIHAN STATUS ANTISTATUS*\n\nCara pakai:\n- \`${m.prefix}antistatus on\` (Aktifkan)\n- \`${m.prefix}antistatus off\` (Matikan)`);
  }

  if (!db.data) db.data = {};
  if (!db.data.chats) db.data.chats = {};
  if (!db.data.chats[m.chat]) db.data.chats[m.chat] = {};

  db.data.chats[m.chat].antistatus = action === "on";

  await m.reply(`✅ Berhasil ${action === "on" ? "mengaktifkan" : "menonaktifkan"} fitur *Anti-Status* di grup ini.`);
}

// Event Listener (Dijalankan otomatis di background saat ada pesan masuk)
async function before(m, { sock, db }) {
  if (!m.isGroup) return;

  const chatData = db?.data?.chats?.[m.chat];
  if (!chatData || !chatData.antistatus) return;

  try {
    const type = getContentType(m.message);
    
    // Deteksi menyeluruh: mencakup protocol message, broadcast, dan story yang di-share ke grup
    const isStatusMessage = 
      type === "protocolMessage" || 
      m.chat.endsWith("@broadcast") || 
      m.message?.protocolMessage?.type === 0 ||
      type === "reactionMessage" && m.chat.includes("@g.us") ||
      JSON.stringify(m.message).includes("status@broadcast") ||
      JSON.stringify(m.message).includes("imageMessage") && m.quoted?.remoteJid?.includes("@broadcast") ||
      // Mendeteksi pesan story/status yang dibagikan ke dalam chat grup
      (m.message?.extendedTextMessage?.contextInfo?.remoteJid?.includes("@broadcast")) ||
      (m.message?.imageMessage?.contextInfo?.quotedMessage) ||
      (m.message?.videoMessage?.contextInfo?.quotedMessage);

    // Deteksi tambahan khusus story grup (mengandung referensi broadcast status)
    const isGroupStory = m.message?.groupStatusMessage || m.message?.reactionMessage || JSON.stringify(m).includes("broadcast");

    if (isStatusMessage || isGroupStory) {
      await sock.sendMessage(m.chat, {
        delete: {
          remoteJid: m.chat,
          fromMe: false,
          id: m.key.id,
          participant: m.sender
        }
      });

      await sock.sendMessage(m.chat, {
        text: `⚠️ *@${m.sender.split("@")[0]}* Dilarang mengirim atau membagikan status/story ke dalam grup ini!`,
        mentions: [m.sender]
      });
    }
  } catch (err) {
    console.error("[Anti-Status Error]:", err);
  }
}

export default {
  config: pluginConfig,
  handler,
  before
};