import fs from 'fs'
import path from 'path'

// ====== SESUAIKAN BAGIAN INI SESUAI PLUGIN PROTEKSI KAMU YANG ASLI ======
const SUMBER_SETTINGS = [
    {
        label: 'Anti Link',
        file: path.join(process.cwd(), 'database', 'antilink.json'),
        cekAktif: (data, groupId) => data?.[groupId]?.enabled === true || data?.[groupId] === true
    },
    {
        label: 'Welcome/Goodbye',
        file: path.join(process.cwd(), 'database', 'welcome.json'),
        cekAktif: (data, groupId) => data?.[groupId]?.enabled === true || data?.[groupId] === true
    },
    {
        label: 'Anti SW Grup',
        file: path.join(process.cwd(), 'database', 'antiswgrup.json'),
        cekAktif: (data, groupId) => !!data?.[groupId]
    },
    {
        label: 'Anti Virtex',
        file: path.join(process.cwd(), 'database', 'antivirtex.json'),
        cekAktif: (data, groupId) => data?.[groupId]?.enabled === true || data?.[groupId] === true
    },
    {
        label: 'Anti Bot',
        file: path.join(process.cwd(), 'database', 'antibot.json'),
        cekAktif: (data, groupId) => data?.[groupId]?.enabled === true || data?.[groupId] === true
    }
]
// ==========================================================================

function bacaStatus(sumber, groupId) {
    try {
        if (!fs.existsSync(sumber.file)) return null // file gak ada = fitur belum pernah dipakai/gak diketahui
        const data = JSON.parse(fs.readFileSync(sumber.file, 'utf8'))
        return sumber.cekAktif(data, groupId)
    } catch {
        return null
    }
}

// Status open/closed grup - pakai groupMetadata langsung (sama kayak statusgb.js)
function cekOpenTimeCloseTime(groupId) {
    const hasil = { open: null, close: null }
    try {
        const dataOpen = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database', 'opentime.json'), 'utf8'))
        if (dataOpen?.[groupId]?.waktu) hasil.open = dataOpen[groupId].waktu
    } catch { }
    try {
        const dataClose = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database', 'closetime.json'), 'utf8'))
        if (dataClose?.[groupId]?.waktu) hasil.close = dataClose[groupId].waktu
    } catch { }
    return hasil
}

function esc(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderSettingsCard({ namaGrup, isOpen, jadwal, daftarFitur }) {
    const baris = daftarFitur.map(f => {
        const statusText = f.status === null ? 'Tak Terlihat' : (f.status ? 'Aktif' : 'Nonaktif')
        const dotColor = f.status === null ? '#5a5a5a' : (f.status ? '#d4af37' : '#7a1f1f')
        return `
        <div class="row">
          <div class="dot" style="background:${dotColor}; box-shadow:0 0 6px ${dotColor}88;"></div>
          <div class="rowLabel">${esc(f.label)}</div>
          <div class="rowStatus" style="color:${dotColor}">${statusText}</div>
        </div>`
    }).join('')

    // Ikon jam roman numeral ala mata kiri Kurumi (Zafkiel)
    const clockIcon = `<svg width="34" height="34" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#0a0505" stroke="#d4af37" stroke-width="2.5"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#7a1f1f" stroke-width="1"/>
      <text x="50" y="20" fill="#d4af37" font-size="9" text-anchor="middle" font-family="Georgia,serif">XII</text>
      <text x="82" y="54" fill="#d4af37" font-size="9" text-anchor="middle" font-family="Georgia,serif">III</text>
      <text x="50" y="86" fill="#d4af37" font-size="9" text-anchor="middle" font-family="Georgia,serif">VI</text>
      <text x="18" y="54" fill="#d4af37" font-size="9" text-anchor="middle" font-family="Georgia,serif">IX</text>
      <line x1="50" y1="50" x2="50" y2="26" stroke="#a91b0e" stroke-width="3" stroke-linecap="round"/>
      <line x1="50" y1="50" x2="68" y2="58" stroke="#d4af37" stroke-width="2" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="4" fill="#a91b0e"/>
    </svg>`

    return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin:0; background:transparent; font-family:'Segoe UI',Roboto,Arial,sans-serif; color:#e8dcc8; display:flex; justify-content:center; padding:10px; }
.wrap { width:100%; max-width:400px; }
.card {
  background:radial-gradient(ellipse at top,#1a0505 0%,#0a0505 55%,#000000 100%);
  border:1px solid #7a1f1f;
  outline:1px solid rgba(212,175,55,0.35);
  outline-offset:-5px;
  border-radius:18px;
  padding:22px;
  position:relative;
}
.header { display:flex; align-items:center; gap:10px; margin-bottom:2px; }
.title { font-family:Georgia,'Times New Roman',serif; font-size:18px; font-weight:700; color:#e8dcc8; letter-spacing:0.5px; }
.title .accent { color:#d4af37; }
.subtitle { font-size:11px; color:#8a7050; margin:2px 0 4px 44px; font-style:italic; }
.quote { font-size:10.5px; color:#a08060; margin:10px 0 16px; font-style:italic; border-left:2px solid #7a1f1f; padding-left:10px; line-height:1.4; }
.section-label { font-size:10px; color:#d4af37; text-transform:uppercase; letter-spacing:2px; font-weight:700; margin:16px 0 8px; text-align:center; }
.section-label::before, .section-label::after { content:'✦'; margin:0 8px; color:#7a1f1f; }
.row { display:flex; align-items:center; gap:10px; padding:8px 2px; border-bottom:1px solid rgba(212,175,55,0.12); }
.row:last-child { border-bottom:none; }
.dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.rowLabel { flex:1; font-size:12.5px; color:#d8c8a8; }
.rowStatus { font-size:10.5px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; }
.scheduleBox {
  background:linear-gradient(135deg,#1a0808 0%,#100505 100%);
  border:1px solid #4a1414;
  border-radius:12px; padding:12px 14px; margin-bottom:4px;
}
.scheduleRow { display:flex; justify-content:space-between; font-size:11.5px; padding:4px 0; }
.scheduleLabel { color:#8a7050; }
.scheduleValue { color:#d4af37; font-weight:700; }
.footer { text-align:center; font-size:9.5px; color:#6b4a3a; margin-top:16px; letter-spacing:1px; text-transform:uppercase; font-style:italic; }
</style>
<div class="wrap">
  <div class="card">
    <div class="header">
      ${clockIcon}
      <div class="title">Kurumi's <span class="accent">Clockwork</span></div>
    </div>
    <div class="subtitle">${esc(namaGrup)}</div>
    <div class="quote">"Ara ara~ mari Kurumi periksa catatan waktu grup ini, satu per satu."</div>

    <div class="scheduleBox">
      <div class="scheduleRow"><span class="scheduleLabel">Status Sekarang</span><span class="scheduleValue">${isOpen ? 'TERBUKA' : 'TERTUTUP'}</span></div>
      <div class="scheduleRow"><span class="scheduleLabel">Gerbang Terbuka</span><span class="scheduleValue">${jadwal.open || 'Belum diukir'}</span></div>
      <div class="scheduleRow"><span class="scheduleLabel">Gerbang Tertutup</span><span class="scheduleValue">${jadwal.close || 'Belum diukir'}</span></div>
    </div>

    <div class="section-label">Penjaga Grup</div>
    ${baris}

    <div class="footer">Kufufu~ • Kurumi Tokisaki • Nightmare</div>
  </div>
</div>`
}

const pluginConfig = {
    name: 'settingsgb',
    alias: ['settinggb', 'dashboardgb', 'cekproteksi'],
    category: 'group',
    description: 'Dashboard status semua fitur proteksi grup dalam 1 kartu (antilink, welcome, dll)',
    usage: '.settingsgb',
    example: '.settingsgb',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        const meta = m.groupMetadata || await sock.groupMetadata(m.chat)
        const isOpen = !meta.announce
        const jadwal = cekOpenTimeCloseTime(m.chat)

        const daftarFitur = SUMBER_SETTINGS.map(sumber => ({
            label: sumber.label,
            status: bacaStatus(sumber, m.chat)
        }))

        const htmlPayload = renderSettingsCard({
            namaGrup: meta.subject || 'Grup Ini',
            isOpen,
            jadwal,
            daftarFitur
        })

        const msgContent = {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    messageDisclaimerText: '',
                    botResponseId: 'kurumi-music-player',
                    verificationMetadata: {
                        proofs: [
                            {
                                version: 1,
                                useCase: 1,
                                signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
                                certificateChain: [
                                    'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg',
                                    'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=='
                                ]
                            }
                        ]
                    }
                }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [{ messageType: 2, messageText: `Settings Dashboard - ${meta.subject || ''}` }],
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify({
                                response_id: 'kurumi-music-player',
                                sections: [{
                                    view_model: {
                                        primitive: {
                                            __typename: 'GenAIaeacdsnwHtmlPrimitive',
                                            payload: htmlPayload,
                                            trusted_sources: ['hirara.dev']
                                        },
                                        __typename: 'GenAISingleLayoutViewModel'
                                    }
                                }]
                            })).toString('base64')
                        },
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                            forwardOrigin: 4
                        }
                    }
                }
            }
        }

        await sock.relayMessage(m.chat, msgContent, {})
    } catch (error) {
        console.error('SettingsGB Plugin Error:', error)
        await m.reply('❌ *GAGAL*\n\n> ' + error.message)
    }
}

export { pluginConfig as config, handler }