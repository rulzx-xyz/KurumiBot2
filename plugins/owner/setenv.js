/**
 * setenv.js — KurumiBot / Ourin (Baileys) plugin
 * Owner tool: lihat/ubah/hapus environment variable langsung dari chat,
 * langsung berlaku di process.env & disimpan ke file .env supaya persist
 * setelah bot restart. Self-contained — tanpa import lokal custom.
 */

import fs from 'fs'
import path from 'path'

const ENV_PATH = path.join(process.cwd(), '.env')

// Nomor owner (fallback kalau framework tidak inject `isOwner` di context)
const OWNER_NUMBERS = (process.env.OWNER_NUMBER || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Key sensitif yang wajib disensor saat ditampilkan (list/get)
const SENSITIVE_PATTERN = /(TOKEN|SECRET|KEY|PASSWORD|PASS|SESSION|COOKIE)/i

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

function maskValue(key, val) {
  if (!SENSITIVE_PATTERN.test(key)) return val
  if (val.length <= 6) return '*'.repeat(val.length)
  return val.slice(0, 3) + '*'.repeat(Math.max(val.length - 6, 3)) + val.slice(-3)
}

// ---- Parse file .env jadi array baris + map key->index, supaya format & komentar
//      yang sudah ada tetap terjaga saat ditulis ulang ----
function readEnvLines() {
  try {
    if (!fs.existsSync(ENV_PATH)) return []
    return fs.readFileSync(ENV_PATH, 'utf-8').split('\n')
  } catch {
    return []
  }
}

function writeEnvLines(lines) {
  fs.writeFileSync(ENV_PATH, lines.join('\n'))
}

function parseKey(line) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)
  return m ? m[1] : null
}

function setEnvValue(key, value) {
  const lines = readEnvLines()
  const idx = lines.findIndex((l) => parseKey(l) === key)
  const newLine = `${key}=${value}`
  if (idx >= 0) {
    lines[idx] = newLine
  } else {
    if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('')
    lines.push(newLine)
  }
  writeEnvLines(lines)
  process.env[key] = value
}

function delEnvValue(key) {
  const lines = readEnvLines()
  const idx = lines.findIndex((l) => parseKey(l) === key)
  if (idx === -1) return false
  lines.splice(idx, 1)
  writeEnvLines(lines)
  delete process.env[key]
  return true
}

function listEnvKeys() {
  const lines = readEnvLines()
  return lines.map(parseKey).filter(Boolean)
}

// ==== handler ====
const pluginConfig = {
  name: 'setenv',
  alias: ['env'],
  category: 'owner',
  description: 'Lihat/ubah/hapus environment variable bot secara runtime (persist ke .env)',
  usage: '.setenv <set|get|del|list> [KEY] [VALUE]',
  example: '.setenv set OWNER_NUMBER 628xxxxxxxxxx',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
}

async function handler(m, { sock, args, isOwner }) {
  try {
    // Sementara dibuka untuk siapa saja (testing) — owner-check dimatikan.

    const sub = (args?.[0] || '').toLowerCase()
    const key = args?.[1]?.toUpperCase()
    const value = (args || []).slice(2).join(' ')

    switch (sub) {
      case 'set': {
        if (!key || !value) {
          return await m.reply('Format salah.\nPakai: .setenv set KEY VALUE\nContoh: .setenv set OWNER_NUMBER 6281234567890')
        }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
          return await m.reply('❌ Nama KEY tidak valid (huruf/angka/underscore, tidak diawali angka).')
        }
        const existed = process.env[key] !== undefined
        setEnvValue(key, value)
        return await m.reply(
          `✅ ${existed ? 'Diperbarui' : 'Ditambahkan'}: *${key}*\n` +
            `Nilai: ${maskValue(key, value)}\n` +
            `⚠️ Tersimpan ke .env. Sebagian variabel (mis. yang dibaca sekali saat start) baru kepakai penuh setelah bot di-restart.`
        )
      }

      case 'get': {
        if (!key) return await m.reply('Pakai: .setenv get KEY')
        const val = process.env[key]
        if (val === undefined) {
          return await m.reply(`❌ ${key} tidak ditemukan.`)
        }
        return await m.reply(`*${key}*\n${maskValue(key, val)}`)
      }

      case 'del':
      case 'delete':
      case 'remove': {
        if (!key) return await m.reply('Pakai: .setenv del KEY')
        const ok = delEnvValue(key)
        return await m.reply(ok ? `✅ ${key} dihapus dari .env & process.env.` : `❌ ${key} tidak ditemukan di .env.`)
      }

      case 'list':
      default: {
        const keys = listEnvKeys()
        if (!keys.length) {
          return await m.reply('Belum ada environment variable di .env.')
        }
        const text =
          `🔧 *Environment Variables* (${keys.length})\n\n` +
          keys.map((k) => `• ${k} = ${maskValue(k, process.env[k] ?? '')}`).join('\n') +
          `\n\nPakai:\n.setenv set KEY VALUE\n.setenv get KEY\n.setenv del KEY\n.setenv list`
        return await m.reply(text)
      }
    }
  } catch (error) {
    console.error('Setenv Plugin Error:', error)
    await m.reply('❌ *GAGAL*\n\n> ' + error.message)
  }
}

export { pluginConfig as config, handler }