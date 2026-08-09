import { getCaseCount, getCasesByCategory } from '../../case/ourin.js'
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from 'ourin'
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'
import _sharp from 'sharp'
import config from "../../config.js";
import {
  formatUptime,
  getTimeGreeting,
} from "../../src/lib/ourin-formatter.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/ourin-plugins.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import fs from "fs";
import path from "path";

function getSharp() {
  return _sharp;
}
import axios from "axios";
const pluginConfig = {
  name: "menu",
  alias: ["help", "bantuan", "commands", "m"],
  category: "main",
  description: "Menampilkan menu utama bot",
  usage: ".menu",
  example: ".menu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};
const CATEGORY_EMOJIS = {
  owner: "👑",
  main: "🏠",
  utility: "🔧",
  fun: "🎮",
  group: "👥",
  download: "📥",
  search: "🔍",
  tools: "🛠️",
  sticker: "🖼️",
  ai: "🤖",
  game: "🎯",
  media: "🎬",
  info: "ℹ️",
  religi: "☪️",
  panel: "🖥️",
  user: "📊",
  linode: "☁️",
  random: "🎲",
  canvas: "🎨",
  vps: "🌊",
};
function toSmallCaps(text) {
  const smallCaps = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ꜰ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => smallCaps[c] || c)
    .join("");
}
const toMonoUpperBold = (text) => {
  const chars = {
    A: "𝗔",
    B: "𝗕",
    C: "𝗖",
    D: "𝗗",
    E: "𝗘",
    F: "𝗙",
    G: "𝗚",
    H: "𝗛",
    I: "𝗜",
    J: "𝗝",
    K: "𝗞",
    L: "𝗟",
    M: "𝗠",
    N: "𝗡",
    O: "𝗢",
    P: "𝗣",
    Q: "𝗤",
    R: "𝗥",
    S: "𝗦",
    T: "𝗧",
    U: "𝗨",
    V: "𝗩",
    W: "𝗪",
    X: "𝗫",
    Y: "𝗬",
    Z: "𝗭",
  };
  return text
    .toUpperCase()
    .split("")
    .map((c) => chars[c] || c)
    .join("");
};
function getSortedCategories(m, botMode) {
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const categoryOrder = [
    "owner",
    "main",
    "utility",
    "tools",
    "fun",
    "game",
    "download",
    "search",
    "sticker",
    "media",
    "ai",
    "group",
    "religi",
    "info",
    "cek",
    "economy",
    "user",
    "canvas",
    "random",
    "premium",
    "ephoto",
    "jpm",
    "pushkontak",
    "panel",
    "store",
  ];
  let modeAllowedMap = {
    md: null,
    cpanel: ["main", "group", "sticker", "owner", "tools", "panel"],
    store: ["main", "group", "sticker", "owner", "store"],
    pushkontak: ["main", "group", "sticker", "owner", "pushkontak"],
  };
  let modeExcludeMap = {
    md: ["panel", "pushkontak", "store"],
    cpanel: null,
    store: null,
    pushkontak: null,
  };
  const allowedCats = modeAllowedMap[botMode];
  const excludeCats = modeExcludeMap[botMode] || [];
  const sortedCats = [...categories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
  const result = [];
  let totalCmds = 0;
  for (const cat of sortedCats) {
    if (cat === "owner" && !m.isOwner) continue;
    if (allowedCats && !allowedCats.includes(cat.toLowerCase())) continue;
    if (excludeCats && excludeCats.includes(cat.toLowerCase())) continue;
    const cmds = commandsByCategory[cat] || [];
    if (cmds.length === 0) continue;
    const emoji = CATEGORY_EMOJIS[cat] || "📁";
    result.push({ cat, cmds, emoji });
  }
  for (const cat of categories) {
    totalCmds += (commandsByCategory[cat] || []).length;
  }
  return { sorted: result, totalCmds, commandsByCategory };
}
async function formatTime(date) {
  const timeHelper = await import("../../src/lib/ourin-time.js");
  return timeHelper.formatTime("HH:mm");
}
async function formatDateShort(date) {
  const timeHelper = await import("../../src/lib/ourin-time.js");
  return timeHelper.formatFull("dddd, DD MMMM YYYY");
}
async function buildMenuText(m, botConfig, db, uptime, botMode = "md") {
  const prefix = botConfig.command?.prefix || ".";
  const user = db.getUser(m.sender);
  const timeHelper = await import("../../src/lib/ourin-time.js");
  const timeStr = timeHelper.formatTime("HH:mm");
  const dateStr = timeHelper.formatFull("dddd, DD MMMM YYYY");
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  let totalCommands = 0;
  for (const category of categories) {
    totalCommands += (commandsByCategory[category] || []).length;
  }
  const totalCases = getCaseCount();
  const casesByCategory = getCasesByCategory();
  const totalFeatures = totalCommands + totalCases;
  let userRole = "User",
    roleEmoji = "👤";
  if (m.isOwner) {
    userRole = "Owner";
    roleEmoji = "👑";
  } else if (m.isPremium) {
    userRole = "Premium";
    roleEmoji = "💎";
  }
  const greeting = getTimeGreeting();
  const uptimeFormatted = formatUptime(uptime);
  const totalUsers = db.getUserCount();
  const greetEmoji = greeting.includes("pagi")
    ? "🌅"
    : greeting.includes("siang")
      ? "☀️"
      : greeting.includes("sore")
        ? "🌇"
        : "🌙";
  let txt = `Hai *@${m.pushName || "User"}* 🪸
Aku ${botConfig.bot?.name || "Kurumi-AI"}, bot WhatsApp yang siap bantu kamu.  
Kamu bisa pakai aku buat cari info, ambil data, atau bantu hal-hal sederhana langsung lewat WhatsApp — praktis tanpa ribet.`;
  txt += `\n\n╭─〔 🤖 *ʙᴏᴛ ɪɴꜰᴏ* 〕\n`;
  txt += `*│* 🖐 ɴᴀᴍᴀ     : *${botConfig.bot?.name || "Kurumi-AI"}*\n`;
  txt += `*│* 🔑 ᴠᴇʀsɪ    : *v${botConfig.bot?.version || "1.2.0"}*\n`;
  txt += `*│* ⚙️ ᴍᴏᴅᴇ     : *${(botConfig.mode || "public").toUpperCase()}*\n`;
  txt += `*│* 🧶 ᴘʀᴇꜰɪx    : *[ ${prefix} ]*\n`;
  txt += `*│* ⏱ ᴜᴘᴛɪᴍᴇ   : *${uptimeFormatted}*\n`;
  txt += `*│* 👥 ᴛᴏᴛᴀʟ    : *${totalUsers} Users*\n`;
  txt += `*│* 🏷 ɢʀᴏᴜᴘ     : *${botMode.toUpperCase()}*\n`;
  txt += `*│* 👑 ᴏᴡɴᴇʀ    : *${botConfig.owner?.name || "Kurumi-AI"}*\n`;
  txt += `╰────────────────⬣\n\n`;
  txt += `╭─〔 👤 *ᴜsᴇʀ ɪɴꜰᴏ* 〕\n`;
  txt += `*│* 🙋 ɴᴀᴍᴀ     : *${m.pushName}*\n`;
  txt += `*│* 🎭 ʀᴏʟᴇ     : *${roleEmoji} ${userRole}*\n`;
  txt += `*│* 🎟 ᴇɴᴇʀɢɪ   : *${m.isOwner || m.isPremium ? "∞ Unlimited" : (user?.energi ?? 25)}*\n`;
  txt += `*│* ⚡ ʟᴇᴠᴇʟ    : *${(Math.floor((user?.exp || 0) / 20000) + 1)}*\n`;
  txt += `*│* ✨ ᴇxᴘ       : *${(user?.exp ?? 0).toLocaleString()}*\n`;
  txt += `*│* 💰 ᴋᴏɪɴ      : *${(user?.koin ?? 0).toLocaleString()}*\n`;
  const rpg = user?.rpg || {};
  if (rpg.health !== undefined) {
    txt += `*│* ❤️ ʜᴘ        : *${rpg.health}/${rpg.maxHealth || rpg.health}*\n`;
    txt += `*│* 🔮 ᴍᴀɴᴀ      : *${rpg.mana}/${rpg.maxMana || rpg.mana}*\n`;
    txt += `*│* 🏃 sᴛᴀᴍɪɴᴀ   : *${rpg.stamina}/${rpg.maxStamina || rpg.stamina}*\n`;
  }
  const inv = user?.inventory || {};
  const invCount = Object.values(inv).reduce(
    (a, b) => a + (typeof b === "number" ? b : 0),
    0,
  );
  if (invCount > 0) txt += `*│* 🎒 ɪɴᴠᴇɴᴛᴏʀʏ : *${invCount} items*\n`;
  txt += `*│* 🕒 ᴡᴀᴋᴛᴜ    : *${timeStr} WIB*\n`;
  txt += `*│* 📅 ᴛᴀɴɢɢᴀʟ  : *${dateStr}*\n`;
  txt += `╰────────────────⬣\n\n`;
  const categoryOrder = [
    "owner",
    "main",
    "utility",
    "tools",
    "fun",
    "game",
    "download",
    "search",
    "sticker",
    "media",
    "ai",
    "group",
    "religi",
    "info",
    "cek",
    "economy",
    "user",
    "canvas",
    "random",
    "premium",
    "ephoto",
    "jpm",
    "pushkontak",
    "panel",
    "store",
  ];
  const sortedCategories = [...categories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
  let modeAllowedMap = {
    md: null,
    store: ["main", "group", "sticker", "owner", "store"],
    pushkontak: ["main", "group", "sticker", "owner", "pushkontak"],
  };
  let modeExcludeMap = {
    md: ["panel", "pushkontak", "store"],
    store: null,
    pushkontak: null,
  };
  try {
    const botmodePlugin = await import("../group/botmode.js");
    if (botmodePlugin && botmodePlugin.MODES) {
      const modes = botmodePlugin.MODES;
      modeAllowedMap = {};
      modeExcludeMap = {};
      for (const [key, val] of Object.entries(modes)) {
        modeAllowedMap[key] = val.allowedCategories;
        modeExcludeMap[key] = val.excludeCategories;
      }
    }
  } catch (e) {}
  const allowedCategories = modeAllowedMap[botMode];
  const excludeCategories = modeExcludeMap[botMode] || [];
  txt += `📂 *ᴅᴀꜰᴛᴀʀ ᴍᴇɴᴜ*\n`;
  for (const category of sortedCategories) {
    if (category === "owner" && !m.isOwner) continue;
    if (
      allowedCategories &&
      !allowedCategories.includes(category.toLowerCase())
    )
      continue;
    if (excludeCategories && excludeCategories.includes(category.toLowerCase()))
      continue;
    const pluginCmds = commandsByCategory[category] || [];
    const caseCmds = casesByCategory[category] || [];
    const totalCmds = pluginCmds.length + caseCmds.length;
    if (totalCmds === 0) continue;
    const emoji = CATEGORY_EMOJIS[category] || "📁";
    const categoryName = toSmallCaps(category);
    txt += `- \`◦\` ${prefix}${toSmallCaps(`menucat ${category}`)} ${emoji}\n`;
  }
  return txt;
}
function getContextInfo(
  botConfig,
  m,
  thumbBuffer,
  renderLargerThumbnail = false,
) {
  const saluranId = botConfig.saluran?.id || "120363208449943317@newsletter";
  const saluranName =
    botConfig.saluran?.name || botConfig.bot?.name || "Kurumi-AI";
  const saluranLink = botConfig.saluran?.link || "";
  const ctx = {
    mentionedJid: [m.sender],
    forwardingScore: 9,
    isForwarded: true,
    externalAdReply: {
      title: botConfig.bot?.name || "Kurumi-AI",
      body: `BOT WHATSAPP MULTI DEVICE`,
      sourceUrl: saluranLink,
      previewType: "VIDEO",
      showAdAttribution: false,
      renderLargerThumbnail,
    },
  };
  if (thumbBuffer) ctx.externalAdReply.thumbnail = thumbBuffer;
  return ctx;
}
function getVerifiedQuoted(botConfig) {
  return {
    key: {
      participant: `0@s.whatsapp.net`,
      remoteJid: `status@broadcast`,
    },
    message: {
      contactMessage: {
        displayName: `🪸 ${botConfig.bot?.name}`,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;ttname,;;;\nFN:ttname\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
        sendEphemeral: true,
      },
    },
  };
}
async function sendFallback(
  m,
  sock,
  text,
  imageBuffer,
  thumbBuffer,
  botConfig,
  errorName,
) {
  if (errorName) console.error(`[Menu Error] ${errorName}`);
  const fallbackMsg = {
    contextInfo: getContextInfo(botConfig, m, thumbBuffer),
  };
  let fallbackText = text;
  if (errorName === "V5") {
    const { sorted } = getSortedCategories(m, "md");
    let catText = `📋 *ᴋᴀᴛᴇɢᴏʀɪ ᴍᴇɴᴜ*\n\n`;
    for (const { cat, cmds, emoji } of sorted)
      catText += `> ${emoji} \`${botConfig.command?.prefix || "."}menucat ${cat}\` - ${toMonoUpperBold(cat)} (${cmds.length})\n`;
    catText += `\n_Ketik perintah kategori untuk melihat command_`;
    fallbackText = text + "\n\n" + catText;
  }
  if (imageBuffer) {
    fallbackMsg.image = imageBuffer;
    fallbackMsg.caption = fallbackText;
  } else {
    fallbackMsg.text = fallbackText;
  }
  await sock.sendMessage(m.chat, fallbackMsg, {
    quoted: getVerifiedQuoted(botConfig),
  });
}
async function handler(m, { sock, config: botConfig, db, uptime }) {
  const savedVariant = db.setting("menuVariant");
  const menuVariant = savedVariant || botConfig.ui?.menuVariant || 2;
  const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
  const botMode = groupData.botMode || "md";
  const text = await buildMenuText(m, botConfig, db, uptime, botMode);
  const imagePath = path.join(process.cwd(), "assets", "images", "kurumi.jpg");
  const thumbPath = path.join(process.cwd(), "assets", "images", "kurumiv2.jpg");
  const videoPath = path.join(process.cwd(), "assets", "video", "kurumi.mp4");
  let imageBuffer = fs.existsSync(imagePath)
    ? fs.readFileSync(imagePath)
    : null;
  let thumbBuffer = fs.existsSync(thumbPath)
    ? fs.readFileSync(thumbPath)
    : null;
  let videoBuffer = fs.existsSync(videoPath)
    ? fs.readFileSync(videoPath)
    : null;
  const prefix = botConfig.command?.prefix || ".";
  const saluranId = botConfig.saluran?.id || "120363208449943317@newsletter";
  const saluranName =
    botConfig.saluran?.name || botConfig.bot?.name || "Kurumi-AI";
  const saluranLink =
    botConfig.saluran?.link ||
    "https://whatsapp.com/channel/0029VbB37bgBfxoAmAlsgE0t";
  const {
    sorted: menuSorted,
    totalCmds,
    commandsByCategory,
  } = getSortedCategories(m, botMode);
  const greeting = getTimeGreeting();
  const uptimeFormatted = formatUptime(uptime);
  try {
    switch (menuVariant) {
      case 1: {
  try {
    const videoPath = path.join(
      process.cwd(),
      "assets",
      "video",
      "kurumi.mp4"
    );

    const videoSource = fs.existsSync(videoPath)
      ? fs.readFileSync(videoPath)
      : videoBuffer;

    if (!videoSource) {
      await m.reply(
        "❌ File video menu tidak ditemukan!\n\n" +
        "Taruh file di:\nassets/video/kurumi.mp4"
      );
      break;
    }

    const userV1 = db.getUser(m.sender) || {};
    const botName = botConfig.bot?.name || config.bot?.name || "Akuma MD";

    // Teks Menu V1
    const bodyV1 = `Hai *@${m.pushName || "User"}*
Selamat datang di *${botName}*.

╭─〔 SYSTEM 〕
│ Status  : Online
│ Mode    : ${(botConfig.mode || config.mode || "public").toUpperCase()}
│ Access  : ${m?.isOwner ? "Owner" : m?.isPremium ? "Premium" : "User"}
╰────────────

╭─〔 BOT 〕
│ Name    : ${botName}
│ Version : v${botConfig.bot?.version || config.bot?.version || "1.0.0"}
│ Prefix  : ${prefix}
│ Uptime  : ${uptimeFormatted}
╰────────────

╭─〔 USER 〕
│ Name   : ${m.pushName || "User"}
│ Role   : ${m?.isOwner ? "Owner" : m?.isPremium ? "Premium" : "User"}
│ Energy : ${m.isOwner || m.isPremium ? "∞ Unlimited" : userV1.energi || 0}
│ Level  : ${userV1.level || Math.floor((userV1.exp || 0) / 20000) + 1}
│ Exp    : ${(userV1.exp || 0).toLocaleString()}
│ Coin   : ${(userV1.koin || 0).toLocaleString()}
╰────────────

_Silakan klik tombol di bawah untuk membuka menu._`.trim();

    // 1. Siapkan Media (Upload Video as GIF)
    const media = await prepareWAMessageMedia(
      {
        video: videoSource,
        gifPlayback: true,
      },
      {
        upload: sock.waUploadToServer,
      }
    );

    // 2. Siapkan List Kategori untuk Tombol [Category]
    const rowsMenu = menuSorted.map(({ cat, cmds, emoji }) => {
      const catName = typeof toMonoUpperBold === "function" ? toMonoUpperBold(cat) : cat.toUpperCase();
      return {
        title: `${emoji} ${catName}`,
        description: `${cmds.length} commands`,
        id: `${prefix}menucat ${cat}`,
      };
    });

    // 3. Rakit Interactive Message (Native Flow)
    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },

            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              header: proto.Message.InteractiveMessage.Header.fromObject({
                title: "KURUMI",
                subtitle: "GIF Menu",
                hasMediaAttachment: true,
                videoMessage: media.videoMessage,
              }),

              body: proto.Message.InteractiveMessage.Body.fromObject({
                text: bodyV1,
              }),

              footer: proto.Message.InteractiveMessage.Footer.fromObject({
                text: `© ${new Date().getFullYear()} ${botName}`,
              }),

              contextInfo: {
                mentionedJid: [m.sender],
                isForwarded: true,
                forwardingScore: 99,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: saluranId,
                  newsletterName: saluranName,
                  serverMessageId: 127,
                },
              },

              nativeFlowMessage:
                proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                  buttons: [
                    // Tombol 1: List Category
                    {
                      name: "single_select",
                      buttonParamsJson: JSON.stringify({
                        title: "Category",
                        sections: [
                          {
                            title: "DAFTAR KATEGORI",
                            highlight_label: "Menu",
                            rows: rowsMenu,
                          },
                        ],
                      }),
                    },
                    // Tombol 2: Quick Reply Owner
                    {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: "Owner",
                        id: `${prefix}owner`,
                      }),
                    }
                  ],
                }),
            }),
          },
        },
      },
      {
        quoted: typeof getVerifiedQuoted === "function" ? getVerifiedQuoted(botConfig) : m,
        userJid: sock.user?.jid || sock.user?.id || m.sender,
      }
    );

    // 4. Kirim Pesan
    await sock.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id,
    });

  } catch (err) {
    console.error("[Menu Error]:", err);
    await sendFallback(m, sock, text, imageBuffer, thumbBuffer, botConfig, "V1");
  }

  break;
}

case 2: {
  try {
    const thumbPathV2 = path.join(
      process.cwd(),
      "assets",
      "image",
      "kurumiv2.jpg"
    );

    const videoPathV2 = path.join(
      process.cwd(),
      "assets",
      "video",
      "kurumiv2.mp4"
    );

    let thumbV2 = fs.existsSync(thumbPathV2)
      ? fs.readFileSync(thumbPathV2)
      : thumbBuffer || imageBuffer;

    if (thumbV2) {
      try {
        thumbV2 = await (await getSharp())(thumbV2)
          .resize(1200, 630, { fit: "cover" })
          .jpeg({ quality: 88 })
          .toBuffer();
      } catch {}
    }

    const videoSourceV2 = fs.existsSync(videoPathV2)
      ? fs.readFileSync(videoPathV2)
      : videoBuffer;

    if (!videoSourceV2) {
      await m.reply(
        "❌ File V2 belum ditemukan!\n\n" +
        "Video: assets/video/Kurumi-v2.mp4\n" +
        "Thumbnail: assets/image/Kurumiv2.jpg"
      );
      break;
    }

    const media2 = await prepareWAMessageMedia(
      {
        video: videoSourceV2,
        gifPlayback: true,
      },
      {
        upload: sock.waUploadToServer,
      }
    );

    const userV2 = db.getUser(m.sender) || {};

    const menuRowsV2 = [
      {
        title: "All Menu",
        description: "Lihat seluruh menu bot",
        id: `${prefix}allmenu`,
      },
      {
        title: "Nomor Owner",
        description: "Hubungi owner Kurumi MD",
        id: `${prefix}owner`,
      },
    ];

    const categoryRowsV2 = menuSorted.map(({ cat, cmds, emoji }) => ({
      title: `${emoji} ${toMonoUpperBold(cat)}`,
      description: `${cmds.length} commands tersedia`,
      id: `${prefix}menucat ${cat}`,
    }));

    const bodyV2 = `
╭─〔 𝐊𝐔𝐑𝐔𝐌𝐈 〕
│ system core · online
╰────────────────

Hai *@${m.pushName || "User"}*,
selamat datang di *${botConfig.bot?.name || config.bot?.name || "Akuma MD"}*.

╭─〔 𝐒𝐘𝐒𝐓𝐄𝐌 〕
│ ◈ Status  : Online
│ ◈ Mode    : ${(botConfig.mode || config.mode || "public").toUpperCase()}
│ ◈ Access  : ${m?.isOwner ? "Owner Access" : m?.isPremium ? "Premium Access" : "User Access"}
│ ◈ Library : ourin-baileys
╰────────────────

╭─〔 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎 〕
│ ◈ Name    : ${botConfig.bot?.name || config.bot?.name || "Kurumi MD"}
│ ◈ Version : v${botConfig.bot?.version || config.bot?.version || "7.8.0"}
│ ◈ Creator : ${botConfig.bot?.developer || config.bot?.developer || botConfig.owner?.name || "RulzXyz"}
│ ◈ Prefix  : [ ${prefix} ]
│ ◈ Uptime  : ${uptimeFormatted}
╰────────────────

╭─〔 𝐔𝐒𝐄Ｒ 𝐈𝐍𝐅𝐎 〕
│ ◈ Name    : ${m.pushName || "User"}
│ ◈ Role    : ${m?.isOwner ? "Owner" : m?.isPremium ? "Premium" : "User"}
│ ◈ Energy  : ${m.isOwner || m.isPremium ? "∞ Unlimited" : userV2.energi || 0}
│ ◈ Level   : ${userV2.level || Math.floor((userV2?.exp || 0) / 20000) + 1}
│ ◈ Exp     : ${(userV2.exp || 0).toLocaleString()}
│ ◈ Coin    : ${(userV2.koin || 0).toLocaleString()}
╰────────────────

⌁ Pilih category melalui tombol di bawah.
`.trim();

    const quotedV2 = {
      key: {
        fromMe: false,
        participant: m.sender,
        remoteJid: "status@broadcast",
      },
      message: {
        videoMessage: {
          caption: `${botConfig.bot?.name || config.bot?.name || "Kurumi MD"} // SYSTEM CORE`,
          seconds: 999999,
          mimetype: "video/mp4",
          jpegThumbnail: thumbV2 || undefined,
          fileLength: "9999999",
        },
      },
    };

    const msg2 = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },

            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              header: proto.Message.InteractiveMessage.Header.fromObject({
                title: "Just Frends Kok Cemburu",
                subtitle: "DARK PREMIUM MENU",
                hasMediaAttachment: true,
                videoMessage: media2.videoMessage,
              }),

              body: proto.Message.InteractiveMessage.Body.fromObject({
                text: bodyV2,
              }),

              footer: proto.Message.InteractiveMessage.Footer.fromObject({
                text: `© ${new Date().getFullYear()} ${
                  botConfig.bot?.name || config.bot?.name || "Akuma MD"
                }`,
              }),

              contextInfo: {
                mentionedJid: [m.sender],
                isForwarded: true,
                forwardingScore: 99,

                externalAdReply: {
                  title: "||||||||||||||||||||||",
                  body: "𝙺𝚞𝚛𝚞𝚖𝚒-𝙰𝚒 𝙼𝚘𝚍𝚎 𝙳𝚊𝚛𝚔",
                  sourceUrl: saluranLink || "https://whatsapp.com",
                  mediaType: 1,
                  showAdAttribution: false,
                  renderLargerThumbnail: true,
                  thumbnail: thumbV2 || undefined,
                },

                forwardedNewsletterMessageInfo: {
                  newsletterJid: saluranId,
                  newsletterName: saluranName,
                  serverMessageId: 127,
                },
              },

              nativeFlowMessage:
                proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                  messageParamsJson: JSON.stringify({}),

                  buttons: [
                    {
                      name: "single_select",
                      buttonParamsJson: JSON.stringify({
                        title: "Open Menu",
                        sections: [
                          {
                            title: "AKSES CEPAT",
                            rows: menuRowsV2,
                          },
                          {
                            title: "CATEGORY MENU",
                            rows: categoryRowsV2,
                          },
                        ],
                      }),
                    },
                  ],
                }),
            }),
          },
        },
      },
      {
        quoted: quotedV2,
        userJid: sock.user?.jid || sock.user?.id || m.sender,
      }
    );

    await sock.relayMessage(m.chat, msg2.message, {
      messageId: msg2.key.id,
    });
  } catch (v2Error) {
    console.error("[Menu V2] Error:", v2Error);

    await sendFallback(
      m,
      sock,
      text,
      imageBuffer,
      thumbBuffer,
      botConfig,
      "V2"
    );
  }

  break;
}
   case 3: {
  try {
    // 1. Siapkan Path File
    const thumbPathV3 = path.join(process.cwd(), "assets", "image", "kurumiv3.jpg"); // Thumbnail Keren
    const videoKurumiPath = path.join(process.cwd(), "assets", "video", "kurumiv3.mp4"); // GIF 1 (Paling Atas)
    const videoIntroPath = path.join(process.cwd(), "assets", "video", "intro.mp4"); // GIF 2 (Paling Bawah)

    // 2. Baca File menjadi Buffer
    let thumbV3 = fs.existsSync(thumbPathV3) ? fs.readFileSync(thumbPathV3) : thumbBuffer || imageBuffer;
    const videoKurumiSource = fs.existsSync(videoKurumiPath) ? fs.readFileSync(videoKurumiPath) : videoBuffer;
    const videoIntroSource = fs.existsSync(videoIntroPath) ? fs.readFileSync(videoIntroPath) : videoBuffer;

    if (!videoKurumiSource || !videoIntroSource) {
      await m.reply(
        "❌ Aset V3 belum lengkap!\n\n" +
        "Pastikan ada file:\n" +
        "1. assets/image/kurumiv3.jpg\n" +
        "2. assets/video/kurumiv3.mp4\n" +
        "3. assets/video/intro.mp4"
      );
      break;
    }

    // Resize Landscape Thumbnail (1200x630)
    if (thumbV3) {
      try {
        thumbV3 = await (await getSharp())(thumbV3)
          .resize(1200, 630, { fit: "cover" })
          .jpeg({ quality: 88 })
          .toBuffer();
      } catch (err) {
        console.error("Sharp resize error:", err);
      }
    }

    await m.react("⏳");

    // 3. UPLOAD MEDIA KE SERVER WA
    const mediaKurumi = await prepareWAMessageMedia(
      { video: videoKurumiSource, gifPlayback: true },
      { upload: sock.waUploadToServer }
    );

    const mediaIntro = await prepareWAMessageMedia(
      { video: videoIntroSource, gifPlayback: true },
      { upload: sock.waUploadToServer }
    );

    const userV3 = db.getUser(m.sender) || {};
    const botName = botConfig.bot?.name || config.bot?.name || "Kurumi MD";

    // ==========================================
    // LANGKAH 1: KIRIM GIF PERTAMA (PALING ATAS)
    // ==========================================
    await sock.sendMessage(m.chat, {
      video: videoKurumiSource,
      gifPlayback: true,
      caption: `❖ ${botName.toUpperCase()} // INTERACTIVE V3`
    }, { quoted: m });


    // ==========================================
    // LANGKAH 2: KIRIM MENU UTAMA DENGAN THUMBNAIL
    // ==========================================
    const bodyV3 = `
╭─〔 𝐔𝐒𝐄𝐑 𝐏𝐑𝐎𝐅𝐈𝐋𝐄 〕
│ ◈ Name   : ${m.pushName || "User"}
│ ◈ Role   : ${m?.isOwner ? "Owner" : m?.isPremium ? "Premium" : "User"}
│ ◈ Energy : ${m.isOwner || m.isPremium ? "∞" : userV3.energi || 0}
│ ◈ Level  : ${userV3.level || Math.floor((userV3?.exp || 0) / 20000) + 1}
│ ◈ Coin   : ${(userV3.koin || 0).toLocaleString()}
╰────────────────
`.trim();

    const categoryRowsV3 = menuSorted.map(({ cat, cmds, emoji }) => ({
      title: `${emoji} ${toMonoUpperBold(cat)}`,
      description: `${cmds.length} commands`,
      id: `${prefix}menucat ${cat}`,
    }));

    const msg3 = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              header: proto.Message.InteractiveMessage.Header.fromObject({
                title: "",
                hasMediaAttachment: true,
                videoMessage: {
                  ...mediaIntro.videoMessage,
                  gifPlayback: true,
                  caption: undefined,
                }
              }),
              body: proto.Message.InteractiveMessage.Body.fromObject({
                text: bodyV3,
              }),
              footer: proto.Message.InteractiveMessage.Footer.fromObject({
                text: `© ${new Date().getFullYear()} ${botName}`,
              }),
              contextInfo: {
                mentionedJid: [m.sender],
                isForwarded: true,
                forwardingScore: 99,
                externalAdReply: {
                  title: "❖ 𝐊𝐔𝐑𝐔𝐌𝐈 𝐏𝐑𝐎𝐉𝐄𝐂𝐓",
                  body: "Interactive V3 Menu",
                  sourceUrl: saluranLink || "https://whatsapp.com",
                  mediaType: 1,
                  showAdAttribution: true,
                  renderLargerThumbnail: true,
                  thumbnail: thumbV3 || undefined,
                },
                forwardedNewsletterMessageInfo: {
                  newsletterJid: saluranId,
                  newsletterName: saluranName,
                  serverMessageId: 127,
                },
              },
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                      title: "Open Category",
                      sections: [
                        {
                          title: "PILIH KATEGORI",
                          rows: categoryRowsV3,
                        },
                      ],
                    }),
                  },
                ],
              }),
            }),
          },
        },
      },
      {
        userJid: sock.user?.jid || sock.user?.id || m.sender,
      }
    );

    // Kirim pesan interaktif utama (di bawahnya nempel GIF intro & thumbnail adReply)
    await sock.relayMessage(m.chat, msg3.message, { messageId: msg3.key.id });
    await m.react("✅");

  } catch (v3Error) {
    console.error("[Menu V3] Error:", v3Error);
    await m.react("❌");
    await sendFallback(m, sock, text, imageBuffer, thumbBuffer, botConfig, "V3");
  }

  break;
}
      case 4: {
        // ==========================================
        // VARIANT 4: CLEAN, ELEGANT, KURUMI MD V4 
        // ==========================================
        try {
          // Pakai aset video bawaan buat header ala Telegram
          const videoPathV4 = path.join(process.cwd(), "assets", "video", "kurumiv4.mp4");
          const videoSourceV4 = fs.existsSync(videoPathV4) ? fs.readFileSync(videoPathV4) : videoBuffer;
          
          if (!videoSourceV4) {
            await m.reply("❌ File video menu tidak ditemukan!\n\nTaruh file di:\nassets/video/kurumi.mp4");
            break;
          }

          const userV4 = db.getUser(m.sender) || {};
          let userRoleV4 = m.isOwner ? "Owner" : (m.isPremium ? "Premium" : "User");

          // Body text yang rapi, clean, no emoji lebay ala Terminal Telegram
          const bodyV4 = `
*K U R U M I   M D*

╭───「 *S Y S T E M* 」
│ ∘ Status  :: Online
│ ∘ Mode    :: ${(botConfig.mode || config.mode || "public").toUpperCase()}
│ ∘ Version :: 7.8.0
│ ∘ Prefix  :: [ ${prefix} ]
│ ∘ Uptime  :: ${uptimeFormatted}
╰───────────────

╭───「 *P R O F I L E* 」
│ ∘ Name    :: ${m.pushName || "User"}
│ ∘ Role    :: ${userRoleV4}
│ ∘ Limit   :: ${m.isOwner || m.isPremium ? "Unlimited" : userV4.energi || 0}
│ ∘ Level   :: ${userV4.level || Math.floor((userV4?.exp || 0) / 20000) + 1}
╰───────────────

_Pilih kategori pada menu di bawah ini._`.trim();

          const mediaV4 = await prepareWAMessageMedia(
            { video: videoSourceV4, gifPlayback: true },
            { upload: sock.waUploadToServer }
          );

          // Siapkan list button bersih tanpa emoji lebay
          const categoryRowsV4 = menuSorted.map(({ cat, cmds }) => ({
            title: `∘ ${cat.toUpperCase()}`,
            description: `${cmds.length} Perintah`,
            id: `${prefix}menucat ${cat}`,
          }));

          const msg4 = generateWAMessageFromContent(
            m.chat,
            {
              viewOnceMessage: {
                message: {
                  messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                  interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                    header: proto.Message.InteractiveMessage.Header.fromObject({
                      title: "KURUMI MD",
                      hasMediaAttachment: true,
                      videoMessage: mediaV4.videoMessage,
                    }),
                    body: proto.Message.InteractiveMessage.Body.fromObject({ text: bodyV4 }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `Kurumi MD V4 - Simple & Elegant` }),
                    contextInfo: {
                      mentionedJid: [m.sender],
                      isForwarded: true,
                      forwardingScore: 99,
                      forwardedNewsletterMessageInfo: { newsletterJid: saluranId, newsletterName: saluranName, serverMessageId: 127 }
                    },
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                      buttons: [
                        // 1. Tombol List Kategori (Yang ditarik ke atas)
                        {
                          name: "single_select",
                          buttonParamsJson: JSON.stringify({
                            title: "❖ PILIH KATEGORI",
                            sections: [{ title: "KATEGORI MENU", rows: categoryRowsV4 }]
                          }),
                        },
                        // 2. Tombol Quick Reply (Langsung eksekusi .allmenu)
                        {
                          name: "quick_reply",
                          buttonParamsJson: JSON.stringify({
                            display_text: "⚡ ALL MENU",
                            id: `${prefix}allmenu`
                          }),
                        },
                        // 3. Tombol Link / URL
                        {
                          name: "cta_url",
                          buttonParamsJson: JSON.stringify({
                            display_text: "🌐 GRUP OFFICIAL",
                            url: "https://chat.whatsapp.com/G69QetFoaIf9OiYm7jwYQF?s=cl&p=a&ilr=1",
                            merchant_url: "https://chat.whatsapp.com/G69QetFoaIf9OiYm7jwYQF?s=cl&p=a&ilr=1"
                          }),
                        },
                        // 4. Tombol Copy
                        {
                          name: "cta_copy",
                          buttonParamsJson: JSON.stringify({
                            display_text: "👑 NOMOR OWNER",
                            copy_code: "62895321048195", 
                            id: "copy_owner_number"
                          }),
                        }
                      ]
                    })
                  })
                }
              }
            },
            { userJid: sock.user?.jid || sock.user?.id || m.sender, quoted: m }
          );

          await sock.relayMessage(m.chat, msg4.message, { messageId: msg4.key.id });
        } catch (errV4) {
          console.error("[Menu V4 Error]:", errV4);
          await sendFallback(m, sock, text, imageBuffer, thumbBuffer, botConfig, "V4");
        }
        break;
      }
      default:
        await m.reply(text);
    }
    const audioEnabled = db.setting("audioMenu") !== false;
    if (audioEnabled) {
      const audioPath = path.join(
        process.cwd(),
        "assets",
        "audio",
        "kurumi.mp3",
      );
      if (fs.existsSync(audioPath)) {
        try {
          await sock.sendMessage(
            m.chat,
            {
              audio: fs.readFileSync(audioPath),
              mimetype: "audio/mpeg",
              contextInfo: getContextInfo(botConfig, m, thumbBuffer),
            },
            { quoted: getVerifiedQuoted(botConfig) },
          );
        } catch (ffmpegErr) {
          await sock.sendMessage(
            m.chat,
            {
              audio: fs.readFileSync(audioPath),
              mimetype: "audio/mpeg",
              contextInfo: getContextInfo(botConfig, m, thumbBuffer),
            },
            { quoted: getVerifiedQuoted(botConfig) },
          );
        }
      }
    }
  } catch (error) {
    console.error("[Menu] Error on command execution:", error.message);
  }
}
export default {
  config: pluginConfig,
  handler,
};
