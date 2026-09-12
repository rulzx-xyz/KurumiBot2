function formatTanggal(unixSeconds) {
    if (!unixSeconds) return '-'
    const d = new Date(unixSeconds * 1000)
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(d) + ' WIB'
}

function nomorDari(jid) {
    return String(jid || '').split('@')[0].split(':')[0]
}

function esc(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderStatusGrupCard({ nama, deskripsi, isOpen, totalMember, totalAdmin, dibuat, pemilik }) {
    return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin:0; background:transparent; font-family:'Segoe UI',Roboto,Arial,sans-serif; color:#f2e9e4; display:flex; justify-content:center; padding:10px; }
.wrap { width:100%; max-width:400px; }
.card { background:linear-gradient(160deg,#0b0f24 0%,#10162e 100%); border:1px solid #232b52; border-radius:20px; padding:22px; }
.header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px; gap:10px; }
.title { font-size:17px; font-weight:800; color:#fff; line-height:1.3; }
.badge { flex-shrink:0; font-size:10px; font-weight:700; padding:4px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
.badge-open { background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid rgba(74,222,128,0.3); }
.badge-closed { background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(248,113,113,0.3); }
.desc { font-size:11.5px; color:#8b93c4; margin:6px 0 16px; line-height:1.4; }
.stats { display:flex; gap:12px; margin-bottom:16px; }
.stat-box { flex:1; background:#1a2247; border:1px solid #2a3466; border-radius:14px; padding:14px 0; text-align:center; }
.stat-value { font-size:24px; font-weight:800; color:#fbbf24; }
.stat-label { font-size:10px; color:#8b93c4; text-transform:uppercase; letter-spacing:1px; margin-top:4px; }
.info-row { display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:12px; }
.info-row:last-child { border-bottom:none; }
.info-label { color:#8b93c4; }
.info-value { color:#fff; font-weight:600; font-family:monospace; text-align:right; }
.footer { text-align:center; font-size:10px; color:#4a5488; margin-top:14px; letter-spacing:0.5px; text-transform:uppercase; }
</style>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="title">📋 ${esc(nama)}</div>
      <div class="badge ${isOpen ? 'badge-open' : 'badge-closed'}">${isOpen ? 'TERBUKA' : 'TERTUTUP'}</div>
    </div>
    ${deskripsi ? `<div class="desc">${esc(deskripsi)}</div>` : ''}

    <div class="stats">
      <div class="stat-box">
        <div class="stat-value">${totalMember}</div>
        <div class="stat-label">Member</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${totalAdmin}</div>
        <div class="stat-label">Admin</div>
      </div>
    </div>

    <div class="info-row">
      <span class="info-label">Status Chat</span>
      <span class="info-value">${isOpen ? 'Semua bisa chat' : 'Hanya admin'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Dibuat</span>
      <span class="info-value">${dibuat}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Pemilik</span>
      <span class="info-value">${pemilik}</span>
    </div>

    <div class="footer">KurumiBot • Status Grup</div>
  </div>
</div>`
}

const pluginConfig = {
    name: 'statusgb',
    alias: ['groupstatus', 'infogrup', 'gbstatus'],
    category: 'group',
    description: 'Cek status grup: open/closed, jumlah member, admin, tanggal dibuat',
    usage: '.statusgb',
    example: '.statusgb',
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

        const totalMember = meta.participants?.length || 0
        const totalAdmin = meta.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0
        const isOpen = !meta.announce

        const htmlPayload = renderStatusGrupCard({
            nama: meta.subject || 'Grup Ini',
            deskripsi: meta.desc || '',
            isOpen,
            totalMember,
            totalAdmin,
            dibuat: formatTanggal(meta.creation),
            pemilik: meta.owner ? nomorDari(meta.owner) : 'Tidak diketahui'
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
                        submessages: [{ messageType: 2, messageText: `Status Grup - ${meta.subject || ''}` }],
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
        console.error('StatusGB Plugin Error:', error)
        await m.reply('❌ *GAGAL*\n\n> ' + error.message)
    }
}

export { pluginConfig as config, handler }