import fs from "fs";
import path from "path";

const pluginConfig = {
  name: "newplugin",
  alias: ["pluginbaru", "recentplugin", "updateplugin", "logplugin"],
  category: "owner",
  description: "Menganalisis dan melihat daftar plugin yang baru ditambahkan atau diupdate",
  usage: ".newplugin [jumlah_hari]",
  example: ".newplugin 1", // Cek plugin yang diubah 1 hari terakhir
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// Fungsi helper untuk format tanggal biar estetik
function formatDate(dateString) {
  const date = new Date(dateString);
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function handler(m, { sock, args }) {
  if (typeof m.react === 'function') await m.react('🔍');

  // Ambil input hari dari user (default: 1 hari terakhir)
  const days = parseInt(args[0]) || 1;
  const timeLimit = Date.now() - (days * 24 * 60 * 60 * 1000);

  const pluginsDir = path.join(process.cwd(), "plugins");
  
  if (!fs.existsSync(pluginsDir)) {
      return m.reply("❌ Folder `plugins` tidak ditemukan di sistem.");
  }

  const updatedPlugins = [];

  try {
    // 1. SCAN FOLDER PLUGIN
    const categories = fs.readdirSync(pluginsDir).filter((f) => {
      return fs.statSync(path.join(pluginsDir, f)).isDirectory();
    });

    for (const category of categories) {
      const categoryPath = path.join(pluginsDir, category);
      const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const stat = fs.statSync(filePath);

        // Jika waktu modifikasi (mtime) melewati batas waktu yang ditentukan
        if (stat.mtimeMs >= timeLimit) {
            
          // Logika sederhana mendeteksi "Baru Ditambahkan" vs "Diupdate"
          // Jika waktu buat dan modifikasi bedanya sangat tipis (kurang dari 2 detik), berarti file baru dibuat.
          const isNew = Math.abs(stat.birthtimeMs - stat.mtimeMs) < 2000;

          updatedPlugins.push({
            name: file,
            category: category,
            time: stat.mtimeMs,
            dateObj: stat.mtime,
            status: isNew ? '✨ Baru' : '🔄 Update'
          });
        }
      }
    }

    // 2. SORTING DARI YANG PALING BARU DIUBAH
    updatedPlugins.sort((a, b) => b.time - a.time);

    // 3. RENDER TAMPILAN KHAS KURUMI
    if (updatedPlugins.length === 0) {
        if (typeof m.react === 'function') await m.react('🥀');
        return m.reply(`🕰️ _Ara ara~_ Tidak ada pergerakan waktu di folder plugin dalam *${days} hari* terakhir, Master.`);
    }

    let replyText = `╭── ⟡ 🕰️ *Log Modifikasi Plugin* ⟡ ──\n│\n`;
    replyText += `│ _"Ara ara~ Kurumi telah memeriksa garis_\n`;
    replyText += `│ _waktu sistem. Ini adalah plugin yang_\n`;
    replyText += `│ _Master sentuh dalam *${days} hari* terakhir:"_\n│\n`;

    // Mengelompokkan berdasarkan kategori biar rapi
    let currentCategory = '';
    
    updatedPlugins.forEach((p, index) => {
        if (currentCategory !== p.category) {
            replyText += `│ 📂 *${p.category.toUpperCase()}*\n`;
            currentCategory = p.category;
        }
        
        // Simbol ujung (kalo terakhir pakai ╰, kalo belum pakai ├)
        const isLastInCategory = (index === updatedPlugins.length - 1) || (updatedPlugins[index + 1].category !== currentCategory);
        const branch = isLastInCategory ? '╰┈➤' : '├─➤';
        
        const timeStr = formatDate(p.dateObj);
        replyText += `│ ${branch} [${p.status}] \`${p.name}\`\n`;
        replyText += `│       ⏰ ${timeStr}\n`;
        
        if (isLastInCategory && index !== updatedPlugins.length - 1) {
            replyText += `│\n`;
        }
    });

    replyText += `│\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    if (typeof m.react === 'function') await m.react('✅');
    await m.reply(replyText);

  } catch (error) {
    console.error('NewPlugin Error:', error);
    if (typeof m.react === 'function') await m.react('❌');
    m.reply(`🥀 *Gagal membaca garis waktu:*\n> ${error.message}`);
  }
}

export { pluginConfig as config, handler };