import { getAssetBuffer } from "../../src/lib/ourin-asset-manager.js";
import fs from "fs";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
const pluginConfig = {
  name: "setmenu",
  alias: ["menuvariant", "menustyle"],
  category: "owner",
  description: "Mengatur variant tampilan menu",
  usage: ".setmenu <v1-v16>",
  example: ".setmenu v8",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const VARIANTS = {
  v1: {
    id: 1,
    name: "TAMPILAN GIF",
    desc: "Video GIF saja",
    emoji: "🔥",
  },
  v2: {
    id: 2,
    name: "TAMPILAN DOUBLE",
    desc: "Dark premium GIF + thumbnail",
    emoji: "⚡",
  },
  v3: {
    id: 3,
    name: "NEW MENU V3",
    desc: "Memakai 2 gif dan 1 thumbnail.",
    emoji: "🪽",
  },
  v4: {
    id: 4,
    name: "NEW MENU V4",
    desc: "memakai 1 video gif keren",
    emoji: "💀",
  },
};

async function handler(m, { sock, db }) {
  const args = m.args || [];
  const variant = args[0]?.toLowerCase();
  if (variant) {
    const selected = VARIANTS[variant];
    if (!selected) {
      await m.reply(`❌ *VARIANT TIDAK VALID*\n\nGunakan: *v1* s/d *v7*`);
      return;
    }
    db.setting("menuVariant", selected.id);
    await db.save();
    await m.reply(
      `✅ *MENU VARIANT DIUBAH*\n\n` +
      `${selected.emoji} *V${selected.id} — ${selected.name}*\n` +
      `_${selected.desc}_`,
    );
    return;
  }

  const current = db.setting("menuVariant") || config.ui?.menuVariant || 2;

  const rows = [];
  for (const [key, val] of Object.entries(VARIANTS)) {
    const mark = val.id === current ? " ✓" : "";
    rows.push({
      title: `${val.emoji} ${key.toUpperCase()}${mark} — ${val.name}`,
      description: val.desc,
      id: `${m.prefix}setmenu ${key}`,
    });
  }
  const buttons = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "🎨 Pilih Variant Menu",
        sections: [{ title: "Daftar Variant Menu", rows }],
      }),
    },
  ];

  const bodyText =
    `🎨🖼️ *MENU VARIANT*\n\n` +
    `Atur tampilan menu utama bot ketika user mengetik perintah menu 📋✨\n` +
    `Variant aktif saat ini: *V${current} — ${VARIANTS[`v${current}`]?.name || "Unknown"}* 🎯\n\n` +
    `> Pilih variant menu dari tombol di bawah 👇`;

  await sock.sendButton(
    m.chat,
    getAssetBuffer("ourin"),
    bodyText,
    m,
    { buttons },
  );
}

export { pluginConfig as config, handler };
