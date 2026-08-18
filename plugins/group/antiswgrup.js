import fs from 'fs'
import path from 'path'

// ==========================================
// 1. SISTEM DATABASE (Biar settingan awet pas restart)
// ==========================================
const DB_PATH = path.join(process.cwd(), 'database', 'antiswgrup.json')

function loadDB() {
    try {
        if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
        if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2))
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    } catch (e) {
        console.error('[antiswgrup] Gagal load DB:', e)
        return {}
    }
}

function saveDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
    } catch (e) {
        console.error('[antiswgrup] Gagal save DB:', e)
    }
}

global.antiSwGc = global.antiSwGc || loadDB()

// ==========================================
// 2. HELPER JID (Buat ngatasin bug @lid vs @s.whatsapp)
// ==========================================
function normalizeJid(jid) {
    if (!jid) return ''
    return jid.split(':')[0].split('@')[0]
}

function sameJid(a, b) {
    if (!a || !b) return false
    return normalizeJid(a) === normalizeJid(b)
}

function findParticipant(participants, jid) {
    return participants.find(p => sameJid(p.id, jid) || (p.jid && sameJid(p.jid, jid)))
}

// ==========================================
// 3. KONFIGURASI PLUGIN
// ==========================================
const pluginConfig = {
    name: 'antiswgrup',
    alias: ['antiswgc', 'antistatusgrup', 'antistatusgc'],
    category: 'group',
    description: 'Hapus otomatis Status Grup (Group Story)',
    usage: '.antiswgrup on/off',
    example: '.antiswgrup on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

// ==========================================
// 4. HANDLER (Buat nyalain/matiin fitur di grup)
// ==========================================
async function handler(m, { sock, args }) {
    try {
        const input = args[0] ? args[0].toLowerCase() : ''
        const chatId = m.chat

        if (input !== 'on' && input !== 'off') {
            return await m.reply(`*Format Salah!*\n\nKetik:\n.antiswgrup on *(untuk menyalakan)*\n.antiswgrup off *(untuk mematikan)*`)
        }

        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null)
        if (!groupMetadata) {
            return await m.reply('❌ *GAGAL*\n\n> Tidak bisa mengambil data grup, coba lagi.')
        }

        const senderId = m.key?.participant || m.sender || m.participant

        // Cek admin dengan toleransi format LID / JID
        let senderP = findParticipant(groupMetadata.participants, senderId)
        
        // Kasih izin kalau yang nyuruh itu Owner Bot
        const botOwner = global.owner || []
        const isOwnerBot = botOwner.some(o => sameJid(o[0], senderId))
        const senderIsAdmin = isOwnerBot || (senderP && (senderP.admin === 'admin' || senderP.admin === 'superadmin'))

        if (!senderIsAdmin) {
            return await m.reply('❌ *GAGAL*\n\n> Hanya admin grup atau owner bot yang boleh mengatur fitur ini.')
        }

        if (input === 'on') {
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
            const botIsAdmin = groupMetadata.participants.some(
                p => (sameJid(p.id, botNumber) || (p.jid && sameJid(p.jid, botNumber))) && (p.admin === 'admin' || p.admin === 'superadmin')
            )
            
            if (!botIsAdmin) {
                return await m.reply('❌ *GAGAL*\n\n> Bot harus dijadikan Admin dulu di grup ini agar bisa menghapus status orang.')
            }

            global.antiSwGc[chatId] = true
            saveDB(global.antiSwGc)
            await m.reply('✅ *Anti-Status Grup AKTIF!*\n\nBot sekarang siaga! Setiap ada member yang nge-post Story/Status ke ikon grup ini, akan langsung ditebas (dihapus).')
        } else {
            global.antiSwGc[chatId] = false
            saveDB(global.antiSwGc)
            await m.reply('❌ *Anti-Status Grup DIMATIKAN.*')
        }
    } catch (error) {
        console.error('AntiSWGrup Handler Error:', error)
        await m.reply('❌ *GAGAL*\n\n> ' + error.message)
    }
}

// ==========================================
// 5. AUTO-DETECT & DELETE (Berjalan di background)
// ==========================================
async function before(m, { sock }) {
    try {
        // Jangan eksekusi kalau status dari bot sendiri
        if (m.key?.fromMe) return;

        const msgObj = m.message || {};
        
        // DETEKSI AKURAT: Apakah ini Status Grup?
        // Ngecek format native bawaan Baileys/WhatsApp buat Group Story
        const isGroupStatus = 
            msgObj.groupStatusMessage || 
            msgObj.groupStatusMessageV2 || 
            msgObj.groupStatusMessageV3 || 
            (msgObj.extendedTextMessage?.contextInfo?.isGroupStatus) ||
            (msgObj.imageMessage?.contextInfo?.isGroupStatus) ||
            (msgObj.videoMessage?.contextInfo?.isGroupStatus) ||
            (msgObj.audioMessage?.contextInfo?.isGroupStatus);

        // Kalau pesan ini terbukti adalah Status Grup (SWGC)
        if (isGroupStatus) {
            // Ambil ID grup targetnya (di Group Story, remoteJid itu ID grupnya atau dari contextInfo)
            let targetGroup = m.chat;
            if (targetGroup === 'status@broadcast') {
                targetGroup = msgObj.groupStatusMessage?.message?.contextInfo?.remoteJid || 
                              msgObj.groupStatusMessageV2?.message?.contextInfo?.remoteJid || 
                              msgObj.extendedTextMessage?.contextInfo?.remoteJid || '';
            }

            // Kalau ID grupnya dapet dan fitur antiswgrup di grup itu AKTIF
            if (targetGroup && global.antiSwGc[targetGroup]) {
                const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'
                const groupMetadata = await sock.groupMetadata(targetGroup).catch(() => null)
                if (!groupMetadata) return;

                // Pastikan bot masih jadi Admin sebelum beraksi
                const isBotAdmin = groupMetadata.participants.some(
                    p => (sameJid(p.id, botNumber) || (p.jid && sameJid(p.jid, botNumber))) && (p.admin === 'admin' || p.admin === 'superadmin')
                )

                if (isBotAdmin) {
                    // TEBAS STATUSNYA SECARA PAKSA!
                    await sock.sendMessage(targetGroup, { delete: m.key }).catch(() => {})
                    
                    // (Opsional) Notif kecil ke terminal
                    console.log(`[ 🛡️ ANTI-SW GRUP ] Menghapus status grup dari ${m.sender || m.key.participant} di ${targetGroup}`);
                }
            }
        }
    } catch (error) {
        // Silent error biar log VPS nggak nyampah
    }
}

export { pluginConfig as config, handler, before }