/**
 * antibug.js — KurumiBot / Ourin (Baileys) plugin
 * Proteksi grup: anti-bug/crash, anti-virtex, anti-delay.
 * Konvensi Kurumi MD: `before` hook (jalan tiap pesan masuk) + `handler` (command toggle).
 * File ini self-contained — hanya pakai npm/core module, tanpa import lokal custom
 * (sesuai catatan: import lokal relatif gagal resolve di hot-reload `.addplugin`/`.ganticode`).
 */

import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database', 'antibug.json')

// ==== Ambang batas deteksi (silakan tuning) ====
const LIMITS = {
  maxTextLength: 6000,        // teks super panjang → virtex
  maxMentions: 40,            // mention bombing
  maxRawMessageBytes: 60000,  // JSON message abnormal besar → indikasi bug/crash payload
  maxQuoteDepth: 6,           // nested quoted message berlebihan → delay/crash
  maxNewlines: 300,           // spam newline
  zalgoRatio: 0.35,           // rasio combining-mark char terhadap total char
}

// ---- Util: JID normalize (device suffix + @lid vs @s.whatsapp.net) ----
function normalizeJid(jid = '') {
  if (!jid) return jid
  let j = jid.split(':')[0] // buang device suffix (mis. 6281xxx:12@s.whatsapp.net)
  if (j.endsWith('@lid')) j = j.replace('@lid', '@s.whatsapp.net')
  return j
}

// ---- Util: DB sederhana per-grup (on/off + mode aksi) ----
function loadDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
      fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2))
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function saveDb(db) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
  } catch (e) {
    console.error('[antibug] gagal simpan db:', e.message)
  }
}

function getGroupState(db, chatId) {
  return db[chatId] || { enabled: false, action: 'delete' } // action: 'delete' | 'kick'
}

// ---- Util: hitung rasio karakter zalgo/combining mark ----
function zalgoRatio(text = '') {
  if (!text.length) return 0
  const combining = text.match(/[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff]/g)
  return (combining ? combining.length : 0) / text.length
}

// ---- Util: hitung kedalaman nested quoted message ----
function quoteDepth(msg, depth = 0) {
  const ctx =
    msg?.extendedTextMessage?.contextInfo ||
    msg?.contextInfo ||
    msg?.imageMessage?.contextInfo ||
    msg?.videoMessage?.contextInfo
  const quoted = ctx?.quotedMessage
  if (!quoted || depth > 20) return depth
  return quoteDepth(quoted, depth + 1)
}

// ---- Deteksi utama, mengembalikan alasan (string) atau null kalau aman ----
function detectThreat(m) {
  const msg = m.message
  if (!msg) return null

  // 1) Ukuran mentah pesan (indikasi payload bug/crash yang dipaksa besar)
  let rawSize = 0
  try {
    rawSize = Buffer.byteLength(JSON.stringify(msg), 'utf-8')
  } catch {}
  if (rawSize > LIMITS.maxRawMessageBytes) {
    return `payload pesan abnormal (${(rawSize / 1024).toFixed(1)}KB)`
  }

  // 2) Nested quoted message berlebihan
  const depth = quoteDepth(msg)
  if (depth > LIMITS.maxQuoteDepth) {
    return `nested quoted message berlebihan (depth ${depth})`
  }

  // 3) Teks: panjang, newline spam, zalgo
  const text =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    ''
  if (text) {
    if (text.length > LIMITS.maxTextLength) {
      return `teks terlalu panjang (${text.length} char) — indikasi virtex`
    }
    const newlineCount = (text.match(/\n/g) || []).length
    if (newlineCount > LIMITS.maxNewlines) {
      return `spam newline berlebihan (${newlineCount})`
    }
    const zr = zalgoRatio(text)
    if (zr > LIMITS.zalgoRatio && text.length > 50) {
      return `teks zalgo/combining-mark berlebihan (${(zr * 100).toFixed(0)}%)`
    }
  }

  // 4) Mention bombing
  const mentions =
    msg.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg.contextInfo?.mentionedJid ||
    []
  if (mentions.length > LIMITS.maxMentions) {
    return `mention bombing (${mentions.length} mention)`
  }

  // 5) Vector pesan spesial yang sering dipakai bug/crash
  if (msg.contactMessage?.vcard && msg.contactMessage.vcard.length > 5000) {
    return 'vCard contactMessage abnormal besar'
  }
  if (msg.protocolMessage && rawSize > 20000) {
    return 'protocolMessage disalahgunakan (payload besar)'
  }
  if (msg.documentMessage?.fileName && msg.documentMessage.fileName.length > 300) {
    return 'nama file dokumen abnormal panjang'
  }

  return null
}

// ==== before hook — jalan di semua pesan masuk grup ====
export const beforeAntibug = async (m, { sock, isAdmin, isBotAdmin, isGroup } = {}) => {
  try {
    if (!isGroup || !m.chat) return
    const db = loadDb()
    const state = getGroupState(db, m.chat)
    if (!state.enabled) return

    // jangan proses admin/owner sendiri
    if (isAdmin) return

    const reason = detectThreat(m)
    if (!reason) return

    const senderJid = normalizeJid(m.sender || m.key?.participant || m.key?.remoteJid)

    // 1) hapus pesan (butuh bot jadi admin)
    if (isBotAdmin) {
      try {
        await sock.sendMessage(m.chat, { delete: m.key })
      } catch (e) {
        console.error('[antibug] gagal hapus pesan:', e.message)
      }
    }

    // 2) aksi lanjutan sesuai mode
    if (state.action === 'kick' && isBotAdmin) {
      try {
        await sock.groupParticipantsUpdate(m.chat, [senderJid], 'remove')
      } catch (e) {
        console.error('[antibug] gagal kick:', e.message)
      }
    }

    await sock.sendMessage(
      m.chat,
      {
        text:
          `🛡️ *Antibug Protection*\n` +
          `Terdeteksi: ${reason}\n` +
          `Pengirim: @${senderJid.split('@')[0]}\n` +
          `Aksi: ${state.action === 'kick' ? 'pesan dihapus + dikeluarkan' : 'pesan dihapus'}` +
          (isBotAdmin ? '' : '\n⚠️ Bot belum admin, aksi tidak bisa dijalankan penuh.'),
        mentions: [senderJid],
      },
      { quoted: m }
    )
  } catch (e) {
    console.error('[antibug] before hook error:', e.message)
  }
}

// ==== handler — command toggle ====
const pluginConfig = {
  name: 'antibug',
  alias: ['antivirtex', 'anticrash'],
  category: 'grup',
  description: 'Aktifkan/nonaktifkan proteksi anti-bug, anti-virtex, dan anti-delay di grup',
  usage: '.antibug <on/off/kick/delete/status>',
  example: '.antibug on',
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

async function handler(m, { sock, args, isAdmin }) {
  try {
    // Sementara dibuka untuk siapa saja (testing) — admin-check dimatikan.

    const db = loadDb()
    const state = getGroupState(db, m.chat)
    const opt = (args?.[0] || '').toLowerCase()

    switch (opt) {
      case 'on':
        state.enabled = true
        db[m.chat] = state
        saveDb(db)
        return await m.reply(
          `✅ Antibug *AKTIF* di grup ini.\nMode aksi saat ini: *${state.action}*\nGanti mode: .antibug kick / .antibug delete`
        )

      case 'off':
        state.enabled = false
        db[m.chat] = state
        saveDb(db)
        return await m.reply('⛔ Antibug *NONAKTIF* di grup ini.')

      case 'kick':
        state.action = 'kick'
        db[m.chat] = state
        saveDb(db)
        return await m.reply('✅ Mode aksi diubah ke *kick* (hapus pesan + keluarkan pengirim).')

      case 'delete':
        state.action = 'delete'
        db[m.chat] = state
        saveDb(db)
        return await m.reply('✅ Mode aksi diubah ke *delete* (hapus pesan saja).')

      case 'status':
      default:
        return await m.reply(
          `🛡️ *Status Antibug*\n` +
            `Status: ${state.enabled ? 'AKTIF ✅' : 'NONAKTIF ⛔'}\n` +
            `Mode aksi: ${state.action}\n\n` +
            `Penggunaan:\n` +
            `.antibug on — aktifkan\n` +
            `.antibug off — matikan\n` +
            `.antibug kick — hapus pesan + keluarkan pengirim\n` +
            `.antibug delete — hapus pesan saja\n` +
            `.antibug status — cek status`
        )
    }
  } catch (error) {
    console.error('Antibug Plugin Error:', error)
    await m.reply('❌ *GAGAL*\n\n> ' + error.message)
  }
}

export { pluginConfig as config, handler, beforeAntibug as before }