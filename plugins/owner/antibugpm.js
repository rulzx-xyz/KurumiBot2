/**
 * antibug-pm.js — KurumiBot / Ourin (Baileys) plugin
 * Proteksi anti-bug/crash, anti-virtex, anti-delay KHUSUS untuk chat pribadi (PM).
 * Beda dari antibug.js (grup): di PM tidak bisa kick & tidak bisa hapus pesan
 * orang lain (WA hanya izinkan revoke pesan milik sendiri), jadi aksinya
 * warn + block pengirim, dan lapor ke owner.
 * Self-contained — tanpa import lokal custom.
 */

import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database', 'antibug-pm.json')

// ==== Ambang batas deteksi (sama seperti versi grup, silakan tuning) ====
const LIMITS = {
  maxTextLength: 6000,
  maxMentions: 40,
  maxRawMessageBytes: 60000,
  maxQuoteDepth: 6,
  maxNewlines: 300,
  zalgoRatio: 0.35,
}

// Nomor owner: ambil dari env OWNER_NUMBER="628xxx,628yyy" (tanpa @s.whatsapp.net),
// dipakai sebagai fallback kalau framework kalian tidak inject `isOwner` di context.
const OWNER_NUMBERS = (process.env.OWNER_NUMBER || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// ---- Util: JID normalize ----
function normalizeJid(jid = '') {
  if (!jid) return jid
  let j = jid.split(':')[0]
  if (j.endsWith('@lid')) j = j.replace('@lid', '@s.whatsapp.net')
  return j
}

function isOwnerNumber(jid = '') {
  const num = normalizeJid(jid).split('@')[0]
  return OWNER_NUMBERS.includes(num)
}

// ---- DB: state global + whitelist ----
function loadDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
      fs.writeFileSync(DB_PATH, JSON.stringify({ enabled: false, action: 'block', whitelist: [] }, null, 2))
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch {
    return { enabled: false, action: 'block', whitelist: [] }
  }
}

function saveDb(db) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
  } catch (e) {
    console.error('[antibug-pm] gagal simpan db:', e.message)
  }
}

// ---- Util: rasio zalgo/combining mark ----
function zalgoRatio(text = '') {
  if (!text.length) return 0
  const combining = text.match(/[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff]/g)
  return (combining ? combining.length : 0) / text.length
}

// ---- Util: kedalaman nested quoted message ----
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

// ---- Deteksi utama ----
function detectThreat(m) {
  const msg = m.message
  if (!msg) return null

  let rawSize = 0
  try {
    rawSize = Buffer.byteLength(JSON.stringify(msg), 'utf-8')
  } catch {}
  if (rawSize > LIMITS.maxRawMessageBytes) {
    return `payload pesan abnormal (${(rawSize / 1024).toFixed(1)}KB)`
  }

  const depth = quoteDepth(msg)
  if (depth > LIMITS.maxQuoteDepth) {
    return `nested quoted message berlebihan (depth ${depth})`
  }

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

  const mentions =
    msg.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg.contextInfo?.mentionedJid ||
    []
  if (mentions.length > LIMITS.maxMentions) {
    return `mention bombing (${mentions.length} mention)`
  }

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

// ==== before hook — jalan di semua pesan masuk PM ====
export const beforeAntibugPm = async (m, { sock, isGroup, isOwner } = {}) => {
  try {
    if (isGroup || !m.chat) return // khusus PM
    if (m.key?.fromMe) return

    const db = loadDb()
    if (!db.enabled) return

    const senderJid = normalizeJid(m.sender || m.key?.remoteJid)

    // jangan proteksi owner sendiri / nomor yang di-whitelist
    const ownerCheck = isOwner ?? isOwnerNumber(senderJid)
    if (ownerCheck) return
    if (db.whitelist?.includes(senderJid.split('@')[0])) return

    const reason = detectThreat(m)
    if (!reason) return

    // kirim warning ke pengirim (best-effort, mungkin gagal kalau langsung diblock)
    try {
      await sock.sendMessage(senderJid, {
        text: '⚠️ Pesanmu terdeteksi sebagai bug/virtex dan diblokir otomatis oleh sistem.',
      })
    } catch {}

    if (db.action === 'block') {
      try {
        await sock.updateBlockStatus(senderJid, 'block')
      } catch (e) {
        console.error('[antibug-pm] gagal block:', e.message)
      }
    }

    // lapor ke semua owner
    for (const num of OWNER_NUMBERS) {
      try {
        await sock.sendMessage(`${num}@s.whatsapp.net`, {
          text:
            `🛡️ *Antibug PM*\n` +
            `Pengirim: wa.me/${senderJid.split('@')[0]}\n` +
            `Terdeteksi: ${reason}\n` +
            `Aksi: ${db.action === 'block' ? 'diblokir' : 'hanya diperingatkan'}`,
        })
      } catch {}
    }
  } catch (e) {
    console.error('[antibug-pm] before hook error:', e.message)
  }
}

// ==== handler — command toggle (owner only, bisa dari PM) ====
const pluginConfig = {
  name: 'antibugpm',
  alias: ['pmbug', 'antivirtexpm'],
  category: 'owner',
  description: 'Aktifkan/nonaktifkan proteksi anti-bug, anti-virtex, anti-delay khusus chat pribadi (PM)',
  usage: '.antibugpm <on/off/block/warn/status/whitelist add|del <nomor>>',
  example: '.antibugpm on',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

async function handler(m, { sock, args, isOwner }) {
  try {
    // Sementara dibuka untuk siapa saja (testing) — owner-check dimatikan.

    const db = loadDb()
    const opt = (args?.[0] || '').toLowerCase()

    switch (opt) {
      case 'on':
        db.enabled = true
        saveDb(db)
        return await m.reply(`✅ Antibug PM *AKTIF*.\nMode aksi: *${db.action}*\nGanti mode: .antibugpm block / .antibugpm warn`)

      case 'off':
        db.enabled = false
        saveDb(db)
        return await m.reply('⛔ Antibug PM *NONAKTIF*.')

      case 'block':
        db.action = 'block'
        saveDb(db)
        return await m.reply('✅ Mode aksi diubah ke *block* (peringatan + blokir otomatis).')

      case 'warn':
        db.action = 'warn'
        saveDb(db)
        return await m.reply('✅ Mode aksi diubah ke *warn* (hanya peringatan, tanpa blokir).')

      case 'whitelist': {
        const sub = (args?.[1] || '').toLowerCase()
        const num = (args?.[2] || '').replace(/\D/g, '')
        db.whitelist = db.whitelist || []
        if (sub === 'add' && num) {
          if (!db.whitelist.includes(num)) db.whitelist.push(num)
          saveDb(db)
          return await m.reply(`✅ ${num} ditambahkan ke whitelist antibug PM.`)
        }
        if (sub === 'del' && num) {
          db.whitelist = db.whitelist.filter((n) => n !== num)
          saveDb(db)
          return await m.reply(`✅ ${num} dihapus dari whitelist.`)
        }
        return await m.reply(
          `Daftar whitelist:\n${db.whitelist.length ? db.whitelist.join('\n') : '(kosong)'}\n\nPakai: .antibugpm whitelist add/del <nomor>`
        )
      }

      case 'status':
      default:
        return await m.reply(
          `🛡️ *Status Antibug PM*\n` +
            `Status: ${db.enabled ? 'AKTIF ✅' : 'NONAKTIF ⛔'}\n` +
            `Mode aksi: ${db.action}\n` +
            `Whitelist: ${db.whitelist?.length || 0} nomor\n\n` +
            `Penggunaan:\n` +
            `.antibugpm on / off\n` +
            `.antibugpm block / warn\n` +
            `.antibugpm whitelist add|del <nomor>\n` +
            `.antibugpm status`
        )
    }
  } catch (error) {
    console.error('Antibug PM Plugin Error:', error)
    await m.reply('❌ *GAGAL*\n\n> ' + error.message)
  }
}

export { pluginConfig as config, handler, beforeAntibugPm as before }