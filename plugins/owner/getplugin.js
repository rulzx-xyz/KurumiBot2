import fs from "fs";
import path from "path";
import config from "../../config.js";
import { AIRich } from "../../src/lib/ourin-builder.js";

const pluginConfig = {
  name: "getplugin",
  alias: ["gp", "getcode", "plugincode", "sourcecode"],
  category: "owner",
  description: "Dapatkan source code plugin",
  usage: ".getplugin <nama plugin>",
  example: ".getplugin menu",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// Ambil token nama dari komentar banner kayak "/// bomb, bom, bombgame ///"
// atau "/// Bomb Game ///" - biasanya di beberapa baris paling atas file.
// Dipecah pakai koma/pipe/slash biar bisa nangkep beberapa nama sekaligus
// dalam satu banner.
function ambilTokenBanner(content) {
  const baris20Awal = content.split("\n").slice(0, 20).join("\n");
  const cocok = baris20Awal.match(/\/{3,}\s*([^/\n]+?)\s*\/{3,}/g);
  if (!cocok) return [];

  const token = [];
  for (const blok of cocok) {
    const isi = blok.replace(/\/{3,}/g, "").trim();
    isi
      .split(/[,|/]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .forEach((s) => token.push(s));
  }
  return token;
}

function searchPlugin(name, pluginsDir) {
  const target = name.toLowerCase();
  const categories = fs.readdirSync(pluginsDir).filter((f) => {
    return fs.statSync(path.join(pluginsDir, f)).isDirectory();
  });

  // 1. Cocokkan nama file persis
  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const baseName = file.replace(".js", "").toLowerCase();
      if (baseName === target) {
        return { path: path.join(categoryPath, file), category, file };
      }
    }
  }

  // 2. Cocokkan lewat array alias: [...] di pluginConfig
  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const aliasMatch = content.match(/alias:\s*\[([^\]]+)\]/);
        if (aliasMatch) {
          const aliases = aliasMatch[1].match(/['"`]([^'"`]+)['"`]/g);
          if (aliases) {
            const cleanAliases = aliases.map((a) =>
              a.replace(/['"`]/g, "").toLowerCase(),
            );
            if (cleanAliases.includes(target)) {
              return { path: filePath, category, file };
            }
          }
        }
      } catch { }
    }
  }

  // 3. Cocokkan lewat komentar banner "/// nama, alias1, alias2 ///" di
  // beberapa baris paling atas file - buat plugin yang nama/alias-nya cuma
  // didokumentasikan di komentar, bukan di array pluginConfig.alias.
  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const token = ambilTokenBanner(content);
        if (token.includes(target) || token.some((t) => t.includes(target) || target.includes(t))) {
          return { path: filePath, category, file };
        }
      } catch { }
    }
  }

  return null;
}

function getSimilarPlugins(name, pluginsDir) {
  const results = [];
  const target = name.toLowerCase();
  const categories = fs.readdirSync(pluginsDir).filter((f) => {
    return fs.statSync(path.join(pluginsDir, f)).isDirectory();
  });

  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const baseName = file.replace(".js", "").toLowerCase();
      let cocok = baseName.includes(target) || target.includes(baseName);

      if (!cocok) {
        try {
          const content = fs.readFileSync(path.join(categoryPath, file), "utf-8");
          const token = ambilTokenBanner(content);
          cocok = token.some((t) => t.includes(target) || target.includes(t));
        } catch { }
      }

      if (cocok) results.push(`${category}/${file}`);
    }
  }

  return results.slice(0, 5);
}

async function handler(m, { sock }) {
  try {
    // Defensif: histori bot ini pernah owner-check crash/gak kebaca bener
    // (m.key.fromMe gak reliable di framework Ourin). Kalau config.isOwner
    // gak ada/bukan function, skip cek-nya daripada bikin plugin ini mati
    // total - lebih baik kebuka daripada nge-crash generic gak jelas.
    if (typeof config.isOwner === "function" && !config.isOwner(m.sender)) {
      return m.reply("🥀 *Ara ara~ Akses Ditolak!*\n\n> Maaf, hanya Master-ku yang boleh melihat rahasia ini.");
    }

    const pluginName = m.args?.[0]?.trim();

    if (!pluginName) {
      return m.reply(
        `🕰️ *ɢᴇᴛ ᴘʟᴜɢɪɴ*\n\n` +
        `> _"Ara ara~ Master ingin melihat isi dari sebuah waktu?"_\n` +
        `> Kurumi akan mengambilkan source code plugin untukmu.\n\n` +
        `╭┈┈⬡「 📜 *ғᴏʀᴍᴀᴛ* 」\n` +
        `┃ .getplugin <nama>\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `*Contoh:*\n` +
        `> .getplugin menu\n` +
        `> .getplugin sticker\n` +
        `> .getplugin game/tebakgambar`,
      );
    }

    const pluginsDir = path.join(process.cwd(), "plugins");

    let pluginInfo = null;

    if (pluginName.includes("/")) {
      const [category, file] = pluginName.split("/");
      const filePath = path.join(
        pluginsDir,
        category,
        file.endsWith(".js") ? file : `${file}.js`,
      );
      if (fs.existsSync(filePath)) {
        pluginInfo = {
          path: filePath,
          category,
          file: file.endsWith(".js") ? file : `${file}.js`,
        };
      }
    } else {
      pluginInfo = searchPlugin(pluginName, pluginsDir);
    }

    if (!pluginInfo) {
      const similar = getSimilarPlugins(pluginName, pluginsDir);
      let text = `🥀 *ᴘʟᴜɢɪɴ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n`;
      text += `> Ara... Plugin \`${pluginName}\` tidak ada dalam garis waktu Kurumi.\n\n`;

      if (similar.length > 0) {
        text += `*Mungkin maksud Master adalah:*\n`;
        similar.forEach((s) => {
          text += `> - \`${s}\`\n`;
        });
      }

      return m.reply(text);
    }

    const code = fs.readFileSync(pluginInfo.path);

    if (code.length > 10000) {
      return await sock.sendMessage(m.chat, {
        document: code, // WAJIB Buffer, bukan string - toString() bikin crash 'stream' in <value>
        fileName: pluginInfo.file,
        fileLength: 999999999,
        caption: `🕰️ Ara ara, Master ${m.pushName}~ Berikut ini adalah gulungan kode dari plugin yang Master minta.\n\nMaster bisa menyimpan dokumen di atas, atau menyalin kodenya lewat tombol di bawah. 🖤\n\n❓ *Kenapa lewat Dokumen?*\nBaris kodenya terlalu panjang, Kurumi khawatir ini akan mengganggu stabilitas sistem jika dipaksa menggunakan teks biasa~`,
        footer: "🍷 Silakan salin kodenya di bawah ini",
        interactiveButtons: [
          {
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
              display_text: '📜 Copy Code nya',
              copy_code: code.toString("utf-8")
            })
          }
        ]
      }, { quoted: m });
    }

    await new AIRich(sock)
      .addText(
        `🕰️ Ara ara, Master ${m.pushName}~ Berikut ini adalah kode rahasia dari plugin yang Master minta 🖤\n\n- 📜 Nama Plugin : ${pluginInfo.file}\n- 🕸️ Kategori : ${pluginInfo.category}\n\n`,
      )
      .addCode("javascript", code.toString("utf-8"))
      .addText("\n\n_Catatan: Jangan lupa disalin kodenya, Master~ 🥀_")
      .send(m.chat);
  } catch (error) {
    console.error('[getplugin] Error:', error.stack || error.message);
    await m.reply(`❌ *GAGAL*\n\n> ${error.message}\n\n_Cek log console buat detail lengkapnya._`);
  }
}

export { pluginConfig as config, handler };