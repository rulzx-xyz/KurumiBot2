import fs from "fs";
import axios from "axios";
import path from "path";
import { queueFFmpeg } from "./../../src/lib/ourin-ffmpeg.js";
import { f } from "../../src/lib/ourin-http.js";
import te from "../../src/lib/ourin-error.js";

const pluginConfig = {
  name: "pindl",
  alias: ["pinterestdl", "pindownload", "pintdl"],
  category: "download",
  description: "Download gambar/video dari Pinterest",
  usage: ".pindl <url>",
  example: ".pindl https://pin.it/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  // Ambil URL dari argumen pertama atau cari link di text pesan
  const text = args.length > 0 ? args[0] : (m.text ? m.text.replace(/^[^\s]+\s*/, '').trim() : '');
  
  if (!text || (!text.includes("pinterest") && !text.includes("pin.it"))) {
    return m.reply(
      `📌 *ᴘɪɴᴛᴇʀᴇsᴛ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
        `> Download gambar/video dari Pinterest\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `> \`${m.prefix}pindl https://pin.it/xxx\`\n` +
        `> \`${m.prefix}pindl https://pinterest.com/pin/xxx\``,
    );
  }

  m.react("🕕");

  try {
    let mediaList = [];
    let success = false;

    // Daftar API Cadangan (Multi-API Anti Down)
    const apis = [
      `https://api.vhtear.com/pinterestdl?link=${encodeURIComponent(text)}`,
      `https://apiii-xrina.vercel.app/download/pindl?url=${encodeURIComponent(text)}`,
      `https://itzpire.com/download/pinterest?url=${encodeURIComponent(text)}`
    ];

    let data = null;

    for (const endpoint of apis) {
      try {
        const res = await axios.get(endpoint, { timeout: 10000 });
        const resData = res.data;
        
        // Handle struktur data dari berbagai API
        if (resData && (resData.status || resData.result || resData.data)) {
          const result = resData.result || resData.data || resData;
          
          // Normalisasi hasil media
          let vid = result.videos?.[0]?.url || result.video || result.download || (result.type === 'video' ? result.url : null);
          let img = result.images?.[result.images.length - 1]?.url || result.image || result.url;

          if (vid) {
            mediaList.push({ type: 'video', url: vid });
            success = true;
            break;
          } else if (img) {
            mediaList.push({ type: 'image', url: img });
            success = true;
            break;
          }
        }
      } catch (err) {
        continue; // Lanjut coba API berikutnya kalau gagal
      }
    }

    if (!success || mediaList.length === 0) {
      throw new Error("Gagal mengambil data dari semua server API Pinterest.");
    }

    for (const media of mediaList) {
      if (media.type === "video") {
        let masterUrl = media.url;
        const tempDir = path.join(process.cwd(), "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        const timestamp = Date.now();
        const videoTemp = path.join(tempDir, `${timestamp}_v.mp4`);
        const outputFile = path.join(tempDir, `${timestamp}_final.mp4`);

        try {
            // Download video langsung pakai axios buffer ke file output
            const videoBuffer = await axios.get(masterUrl, { 
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.pinterest.com/'
                }
            });
            
            fs.writeFileSync(outputFile, Buffer.from(videoBuffer.data));

            await sock.sendMedia(m.chat, fs.readFileSync(outputFile), null, m, {
                type: "video",
                contextInfo: { forwardingScore: 99, isForwarded: true }
            });

        } catch (err) {
            console.error("[PinDL Video Error]:", err.message);
            throw new Error("Gagal mendownload file video Pinterest.");
        } finally {
            if (fs.existsSync(videoTemp)) fs.unlinkSync(videoTemp);
            if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        }
      } else if (media.type === "image") {
        if (media.url.includes("gif")) {
          const tempPath = path.join(process.cwd(), "temp");
          if (!fs.existsSync(tempPath))
            fs.mkdirSync(tempPath, { recursive: true });
          const id = Date.now();
          const gifPath = path.join(tempPath, `pin-${id}.gif`);
          const mp4Path = path.join(tempPath, `pin-${id}.mp4`);
          try {
            const raw = await f(media.url, "buffer");
            if (!raw) throw new Error("Gagal download GIF");
            fs.writeFileSync(gifPath, raw);
            await queueFFmpeg(
              `ffmpeg -y -ignore_loop 0 -i "${gifPath}" -t 30 -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -movflags faststart -preset ultrafast -an "${mp4Path}"`,
            );
            if (!fs.existsSync(mp4Path)) throw new Error("Gagal convert GIF");
            await sock.sendMedia(m.chat, fs.readFileSync(mp4Path), null, m, {
              type: "video",
              gifPlayback: true,
              contextInfo: {
                forwardingScore: 99,
                isForwarded: true,
              },
            });
          } catch (gifErr) {
            console.error("[PinDL] GIF convert error:", gifErr.message);
            await sock.sendMedia(m.chat, media.url, null, m, {
              type: "image",
              contextInfo: { forwardingScore: 99, isForwarded: true },
            });
          } finally {
            if (fs.existsSync(gifPath)) fs.unlinkSync(gifPath);
            if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
          }
        } else {
          await sock.sendMedia(m.chat, media.url, null, m, {
            type: "image",
            contextInfo: {
              forwardingScore: 99,
              isForwarded: true,
            },
          });
        }
      }
    }
    m.react("✅");
  } catch (error) {
    console.error("[PinDL] Error:", error);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };