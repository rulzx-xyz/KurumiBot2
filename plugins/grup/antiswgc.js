import fs from 'fs'
import path from 'path'

/**
 * ANTI-SWGC — proteksi grup terhadap Status/SW yang di-"share ke grup" lewat
 * tombol forward-status bawaan WA.
 *
 * Deteksi dibagi 2 tingkat:
 *   TIER "post"    = SW yang beneran NYAMPAH ke chat grup
 *                    (groupStatusMessageV2 / contextInfo.isGroupStatus:true).
 *                    Aksi: HAPUS + TAG + KICK pelaku.
 *   TIER "mention" = SW pribadi yang cuma nge-MENTION grup, gak nyampah ke chat.
 *                    Default DIABAIKAN. Ditindak kalau mode STRICT nyala,
 *                    aksinya cuma HAPUS + peringatan, TIDAK di-kick.
 */

const DB_PATH = path.join(process.cwd(), 'database', 'antiswgc.json')

function loadDB() {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) } catch { return {} }
}
function saveDB(data) {
    try {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
    } catch (e) { console.error('[AntiSWGC] saveDB error:', e.message) }
}

function antiswgcIsActive(groupId) { return !!loadDB()[groupId]?.aktif }
function antiswgcSet(groupId, aktif) {
    const data = loadDB()
    data[groupId] = { ...(data[groupId] || {}), aktif }
    saveDB(data)
}
function antiswgcStrictIsActive(groupId) { return !!loadDB()[groupId]?.strict }
function antiswgcStrictSet(groupId, strict) {
    const data = loadDB()
    data[groupId] = { ...(data[groupId] || {}), strict }
    saveDB(data)
}

// Resolusi nomor sederhana (versi penuh LID-aware butuh lidStore kayak di
// bot aslinya - ini fallback: strip device suffix & domain aja).
function resolvePhone(jid) {
    return String(jid || '').split('@')[0].split(':')[0]
}

// ═══════════════════════════════════════════
// TABEL TIPE
// ═══════════════════════════════════════════

const SW_POST_TYPES = new Set(['groupStatusMessageV2', 'groupStatusMessage'])
const SW_MENTION_TYPES = new Set(['groupStatusMentionMessage', 'statusMentionMessage', 'groupMentionedMessage'])

const SKIP_KEYS = new Set([
    'quotedMessage',
    'jpegThumbnail', 'thumbnail', 'thumbnailDirectPath', 'thumbnailSha256', 'thumbnailEncSha256',
    'fileSha256', 'fileEncSha256', 'mediaKey', 'streamingSidecar', 'waveform',
    'senderKeyDistributionMessage', 'messageContextInfo',
])

const MAX_DEPTH = 8

// ═══════════════════════════════════════════
// DETEKSI REKURSIF
// ═══════════════════════════════════════════

function findSwGcType(node, path = 'message', seen = new WeakSet(), depth = 0) {
    if (!node || typeof node !== 'object') return null
    if (Buffer.isBuffer(node) || node instanceof Uint8Array) return null
    if (depth > MAX_DEPTH) return null
    if (seen.has(node)) return null
    seen.add(node)

    let mentionHit = null

    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            const hit = findSwGcType(node[i], `${path}[${i}]`, seen, depth + 1)
            if (hit?.tier === 'post') return hit
            if (hit && !mentionHit) mentionHit = hit
        }
        return mentionHit
    }

    for (const key of Object.keys(node)) {
        if (SKIP_KEYS.has(key)) continue
        const value = node[key]
        const childPath = `${path}.${key}`

        if (SW_POST_TYPES.has(key) && value) {
            return { type: key, path: childPath, tier: 'post', reason: 'tipe pesan status-post' }
        }
        if (key === 'isGroupStatus' && value === true) {
            return { type: 'isGroupStatus', path: childPath, tier: 'post', reason: 'flag contextInfo.isGroupStatus' }
        }
        if (SW_MENTION_TYPES.has(key) && value) {
            if (!mentionHit) mentionHit = { type: key, path: childPath, tier: 'mention', reason: 'tipe pesan status-mention' }
            continue
        }
        if (key === 'groupMentions' && Array.isArray(value) && value.length > 0) {
            if (!mentionHit) mentionHit = { type: 'groupMentions', path: childPath, tier: 'mention', reason: 'contextInfo.groupMentions' }
            continue
        }
        if (value && typeof value === 'object') {
            const hit = findSwGcType(value, childPath, seen, depth + 1)
            if (hit?.tier === 'post') return hit
            if (hit && !mentionHit) mentionHit = hit
        }
    }
    return mentionHit
}

function detectSwGcType(m) {
    if (!m || typeof m !== 'object') return null
    const root = m.message || m
    return findSwGcType(root, 'message', new WeakSet(), 0)
}

// ═══════════════════════════════════════════
// THROTTLE (pakai global.* biar nyimpen walau plugin di-hot-reload)
// ═══════════════════════════════════════════

const KICK_THROTTLE_MS = 60 * 1000
const NOADMIN_THROTTLE_MS = 5 * 60 * 1000
const META_TTL_MS = 30 * 1000
const FLAG_TTL_MS = 5000

if (!global._antiswgcHandled) global._antiswgcHandled = new Map()
if (!global._antiswgcMeta) global._antiswgcMeta = new Map()
if (!global._antiswgcFlag) global._antiswgcFlag = new Map()

function pruneMap(map, ttl, max = 500) {
    if (map.size <= max) return
    const now = Date.now()
    for (const [k, v] of map) {
        const ts = typeof v === 'number' ? v : v?.ts
        if (!ts || now - ts > ttl) map.delete(k)
    }
}

function isActiveCached(groupId) {
    const rec = global._antiswgcFlag.get(groupId)
    if (rec && Date.now() - rec.ts < FLAG_TTL_MS) return rec.on
    const on = antiswgcIsActive(groupId)
    global._antiswgcFlag.set(groupId, { ts: Date.now(), on })
    pruneMap(global._antiswgcFlag, FLAG_TTL_MS, 200)
    return on
}
function invalidateFlag(groupId) { global._antiswgcFlag.delete(groupId) }

function throttleKey(groupId, phone) { return `${groupId}:${phone}` }
function recentlyHandled(groupId, phone) {
    const t = global._antiswgcHandled.get(throttleKey(groupId, phone))
    return t && (Date.now() - t) < KICK_THROTTLE_MS
}
function markHandled(groupId, phone) {
    global._antiswgcHandled.set(throttleKey(groupId, phone), Date.now())
    pruneMap(global._antiswgcHandled, KICK_THROTTLE_MS)
}

// ═══════════════════════════════════════════
// HELPER AKSI
// ═══════════════════════════════════════════

function buildDeleteKey(m) {
    const k = m.key || {}
    return {
        remoteJid: m.chat,
        fromMe: false,
        id: k.id,
        participant: k.participant || m.sender,
    }
}

async function deleteSwMessage(sock, m) {
    const attempts = [
        { label: 'key-built', key: buildDeleteKey(m) },
        { label: 'key-raw', key: m.key },
    ]
    let lastErr = null
    for (const attempt of attempts) {
        if (!attempt.key?.id) continue
        try {
            await sock.sendMessage(m.chat, { delete: attempt.key })
            return true
        } catch (e) {
            lastErr = e
            console.error(`[AntiSWGC] Hapus SW gagal (${attempt.label}): ${e.message}`)
        }
    }
    if (lastErr) console.error('[AntiSWGC] Semua percobaan hapus gagal - bot admin?')
    return false
}

async function getMeta(sock, groupId) {
    const cached = global._antiswgcMeta.get(groupId)
    if (cached && Date.now() - cached.ts < META_TTL_MS) return cached.meta
    try {
        const meta = await sock.groupMetadata(groupId)
        global._antiswgcMeta.set(groupId, { ts: Date.now(), meta })
        pruneMap(global._antiswgcMeta, META_TTL_MS, 100)
        return meta
    } catch { return null }
}

async function getRoles(sock, m) {
    const meta = await getMeta(sock, m.chat)
    if (!meta) return { senderAdmin: false, botAdmin: false }

    const parts = meta.participants || []
    const isAdminRow = (p) => p?.admin === 'admin' || p?.admin === 'superadmin'

    const senderPhone = resolvePhone(m.sender)
    const senderRow = parts.find(x => x.id === m.sender || resolvePhone(x.id) === senderPhone)

    const botPhone = resolvePhone(sock.user?.id || '')
    const botLid = resolvePhone(sock.user?.lid || '')
    const botRow = parts.find(x => {
        const idBare = resolvePhone(x.id)
        return (botPhone && idBare === botPhone) || (botLid && idBare === botLid)
    })

    return { senderAdmin: !!(senderRow && isAdminRow(senderRow)), botAdmin: !!(botRow && isAdminRow(botRow)) }
}

async function warnNotAdmin(sock, groupId, detail) {
    const key = `noadmin:${groupId}`
    const last = global._antiswgcHandled.get(key)
    if (last && Date.now() - last < NOADMIN_THROTTLE_MS) return
    global._antiswgcHandled.set(key, Date.now())
    try {
        await sock.sendMessage(groupId, {
            text: `⚠️ *AntiSWGC* mendeteksi ${detail}, tapi *bot bukan admin* jadi tidak bisa menghapus/kick.\n\nJadikan bot admin dulu.`,
        })
    } catch { }
}

// ═══════════════════════════════════════════
// PROTEKSI UTAMA
// ═══════════════════════════════════════════

async function checkAntiSwgc(sock, m) {
    if (!m?.isGroup || m.key?.fromMe) return false
    if (!isActiveCached(m.chat)) return false

    const hit = detectSwGcType(m)
    if (!hit) return false

    const strict = antiswgcStrictIsActive(m.chat)
    if (hit.tier === 'mention' && !strict) return false

    const { senderAdmin, botAdmin } = await getRoles(sock, m)
    if (senderAdmin) return false

    const target = m.sender
    const phone = resolvePhone(target)

    if (!botAdmin) {
        await warnNotAdmin(sock, m.chat, `Status/SW dari @${phone} (${hit.type})`)
        return false
    }

    console.log(`[ANTISWGC] ${hit.tier.toUpperCase()} | ${phone} | ${hit.type} @ ${hit.path}`)

    await deleteSwMessage(sock, m)

    if (recentlyHandled(m.chat, phone)) return true
    markHandled(m.chat, phone)

    if (hit.tier === 'mention') {
        try {
            await sock.sendMessage(m.chat, {
                text: `⚠️ *AntiSWGC (strict)* — @${phone} jangan nge-tag/mention grup ini di Status/SW. Pesannya dihapus.`,
                mentions: [target],
            })
        } catch (e) { console.error('[AntiSWGC] Gagal kirim notif mention:', e.message) }
        return true
    }

    try {
        await sock.sendMessage(m.chat, {
            text: `🚫 *DILARANG SWGC* — @${phone} dilarang post Status/SW ke grup ini. Kamu di-kick otomatis.`,
            mentions: [target],
        })
    } catch (e) { console.error('[AntiSWGC] Gagal kirim notif:', e.message) }

    const botPhone = resolvePhone(sock.user?.id || '')
    if (phone === botPhone) return true

    try {
        await sock.groupParticipantsUpdate(m.chat, [target], 'remove')
    } catch (e) { console.error('[AntiSWGC] Gagal kick pelaku (bot admin?):', e.message) }

    return true
}

// ═══════════════════════════════════════════
// PLUGIN KURUMI MD
// ═══════════════════════════════════════════

const pluginConfig = {
    name: 'antiswgc',
    alias: ['antiswgroup', 'antiswmentiongc', 'antiswtaggc'],
    category: 'group',
    description: 'Proteksi grup: hapus + kick pelaku yang post Status/SW ke grup (deteksi rekursif, tahan bungkus viewOnce/ephemeral)',
    usage: '.antiswgc on/off | .antiswgc strict on/off',
    example: '.antiswgc on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true,
    // Dicek manual di dalam handler (biar owner bisa bypass tanpa jadi admin
    // grup dulu) - sama kayak maksud aslinya.
    isAdmin: false,
    isBotAdmin: false,
}

async function cekAdminAtauOwner(sock, m) {
    if (m.isOwner) return true
    try {
        const meta = m.groupMetadata || await sock.groupMetadata(m.chat)
        const row = meta.participants?.find(p => p.id === m.sender)
        return row?.admin === 'admin' || row?.admin === 'superadmin'
    } catch {
        return false
    }
}

async function handler(m, { sock, args }) {
    try {
        const groupId = m.chat
        const boleh = await cekAdminAtauOwner(sock, m)
        if (!boleh) {
            await m.reply('❌ Kamu harus menjadi Admin grup untuk mengatur antiswgc!')
            return
        }

        const action = (args[0] || '').toLowerCase()

        if (!action) {
            const status = antiswgcIsActive(groupId) ? '✅ Aktif' : '❌ Nonaktif'
            const strict = antiswgcStrictIsActive(groupId) ? '✅ Aktif' : '❌ Nonaktif'
            await m.reply(
                `📡 *AntiSW GC*\n\n` +
                `> Status: ${status}\n` +
                `> Mode Strict (hapus SW-mention juga): ${strict}\n\n` +
                `Penggunaan:\n` +
                `> \`${m.prefix}antiswgc on\` / \`off\`\n` +
                `> \`${m.prefix}antiswgc strict on\` / \`off\`\n\n` +
                `_Tier "post" (SW yang di-share langsung ke grup) selalu dihapus+kick kalau aktif.\n` +
                `Tier "mention" (SW pribadi yang cuma nyebut grup) cuma dihapus+tegur, dan HANYA kalau mode strict nyala._`
            )
            return
        }

        if (action === 'strict') {
            const sub = (args[1] || '').toLowerCase()
            if (!['on', 'off'].includes(sub)) {
                await m.reply(`Format: \`${m.prefix}antiswgc strict on/off\``)
                return
            }
            antiswgcStrictSet(groupId, sub === 'on')
            invalidateFlag(groupId)
            await m.reply(`✅ Mode strict AntiSWGC: *${sub === 'on' ? 'AKTIF' : 'NONAKTIF'}*`)
            return
        }

        if (!['on', 'off'].includes(action)) {
            await m.reply(`Format: \`${m.prefix}antiswgc on/off\` atau \`${m.prefix}antiswgc strict on/off\``)
            return
        }

        antiswgcSet(groupId, action === 'on')
        invalidateFlag(groupId)
        await m.reply(
            action === 'on'
                ? '✅ *AntiSWGC diaktifkan.*\n> SW yang di-share langsung ke grup bakal dihapus + pelakunya di-kick.'
                : '❌ *AntiSWGC dinonaktifkan.*'
        )
    } catch (error) {
        console.error('[antiswgc]', error)
        await m.reply('❌ *GAGAL*\n\n> ' + error.message)
    }
}

async function before(m, { sock }) {
    try {
        await checkAntiSwgc(sock, m)
    } catch (error) {
        console.error('[antiswgc] before() error:', error.message)
    }
}

export { pluginConfig as config, handler, before }