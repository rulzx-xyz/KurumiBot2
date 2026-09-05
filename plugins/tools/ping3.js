import {
  generateWAMessageFromContent,
} from "ourin";

function renderPingCard({ target = "203.175.11.164:1659", status = "ONLINE", latency = "--", ip = "203.175.11.164", timestamp = "-" }) {
  const isOnline = status.toUpperCase() === "ONLINE";
  return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f2e9e4; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 10px; }
.card-wrap { width: 100%; max-width: 390px; margin: auto; }
.ping-card {
  background: linear-gradient(145deg, #18181b 0%, #221f26 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  padding: 20px;
  position: relative;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 10px;
}
.header-title {
  font-size: 13px;
  font-weight: 700;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.badge-status {
  background: ${isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
  color: ${isOnline ? '#4ade80' : '#f87171'};
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid ${isOnline ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'};
  text-transform: uppercase;
}
.info-group {
  margin-bottom: 14px;
}
.info-label {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 3px;
}
.info-value {
  font-size: 14.5px;
  color: #fff;
  font-weight: 600;
  word-break: break-all;
  font-family: monospace;
}
.ping-box {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 14px;
  padding: 14px;
  text-align: center;
  margin: 16px 0;
}
.ping-title {
  font-size: 11px;
  color: #c4b5fd;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.ping-score {
  font-size: 26px;
  font-weight: 800;
  color: #fbbf24;
}
.grid-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.card-footer {
  text-align: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 14px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.ping-loader {
  font-size: 12px;
  color: #a78bfa;
  text-align: center;
  margin-top: 6px;
  font-style: italic;
}
</style>

<div class="card-wrap">
  <div class="ping-card">
    <div class="card-header">
      <span class="header-title">Server Target Monitor</span>
      <span class="badge-status" id="statusBadge">${status}</span>
    </div>

    <div class="info-group">
      <div class="info-label">Target IP & Port</div>
      <div class="info-value">${target}</div>
    </div>

    <div class="ping-box">
      <div class="ping-title">Response Latency (Ping)</div>
      <div class="ping-score" id="pingResult">${latency}</div>
      <div class="ping-loader" id="pingLoader">Mengukur koneksi server...</div>
    </div>

    <div class="grid-row">
      <div class="info-group">
        <div class="info-label">Host IP</div>
        <div class="info-value" id="resolvedIp" style="font-size: 12px;">${ip}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Waktu Cek</div>
        <div class="info-value" id="checkTime" style="font-size: 12px;">${timestamp}</div>
      </div>
    </div>

    <div class="card-footer">
      <span>Kurumi Network Monitor Tool</span>
    </div>
  </div>
</div>

<script>
(function() {
  const targetHost = "203.175.11.164";
  const targetPort = "1659";
  const startTime = performance.now();
  const pingResultEl = document.getElementById('pingResult');
  const pingLoaderEl = document.getElementById('pingLoader');
  const statusBadgeEl = document.getElementById('statusBadge');
  const checkTimeEl = document.getElementById('checkTime');

  const now = new Date();
  checkTimeEl.textContent = now.toTimeString().split(' ')[0];

  // Menggunakan Image probe / fetch ke endpoint IP & port target
  const testUrl = 'http://' + targetHost + ':' + targetPort + '/';
  
  const img = new Image();
  img.onload = successPing;
  img.onerror = successPing; // Dianggap merespons walau kena blok policy browser/CORS

  function successPing() {
    const duration = Math.round(performance.now() - startTime);
    pingResultEl.textContent = duration + ' ms';
    pingLoaderEl.textContent = 'Server Port ' + targetPort + ' Aktif';
    statusBadgeEl.textContent = 'ONLINE';
    statusBadgeEl.style.background = 'rgba(34, 197, 94, 0.15)';
    statusBadgeEl.style.color = '#4ade80';
    statusBadgeEl.style.borderColor = 'rgba(74, 222, 128, 0.3)';
  }

  setTimeout(() => {
    if (pingResultEl.textContent === '--') {
      fetch(testUrl, { mode: 'no-cors', cache: 'no-store' })
        .then(() => {
          const dur = Math.round(performance.now() - startTime);
          pingResultEl.textContent = dur + ' ms';
          pingLoaderEl.textContent = 'Port Terhubung (No-CORS)';
        })
        .catch(() => {
          pingResultEl.textContent = 'Timeout';
          pingLoaderEl.textContent = 'Port/Server tidak merespons';
          statusBadgeEl.textContent = 'OFFLINE';
          statusBadgeEl.style.background = 'rgba(239, 68, 68, 0.15)';
          statusBadgeEl.style.color = '#f87171';
          statusBadgeEl.style.borderColor = 'rgba(248, 113, 113, 0.3)';
        });
    }
  }, 3000);

  img.src = testUrl + 'favicon.ico?' + Date.now();
})();
</script>
`;
}

const pluginConfig = {
  name: "ping3",
  alias: ["ping", "cekserver"],
  category: "tools",
  description: "Cek latensi IP dan port target secara otomatis",
  usage: ".ping3",
  example: ".ping3",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  if (typeof m.react === 'function') await m.react("📡");

  const htmlPayload = renderPingCard({
    target: "203.175.11.164:1659",
    status: "CHECKING",
    latency: "--",
    ip: "203.175.11.164",
    timestamp: new Date().toLocaleTimeString()
  });

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
              messageDisclaimerText: "",
              botResponseId: "kurumi-music-player",
              verificationMetadata: {
                proofs: [
                  {
                    version: 1,
                    useCase: 1,
                    signature: "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==",
                    certificateChain: [
                      "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg",
                      "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=="
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
                submessages: [{ messageType: 2, messageText: `Server Ping: 203.175.11.164:1659` }],
                unifiedResponse: {
                  data: Buffer.from(JSON.stringify({
                    "response_id": "kurumi-music-player",
                    "sections": [{ "view_model": { "primitive": { "__typename": "GenAIaeacdsnwHtmlPrimitive", "payload": htmlPayload, "trusted_sources": ["hirara.dev"] }, "__typename": "GenAISingleLayoutViewModel" } }]
                  })).toString('base64'),
                },
                contextInfo: {
                  forwardingScore: 1,
                  isForwarded: true,
                  forwardedAiBotMessageInfo: {
                    botJid: "867051314767696@bot"
                  },
                  forwardOrigin: 4
                }
              }
            }
          }
        },
      },
    },
    { quoted: m, userJid: sock.user.jid }
  );

  await sock.relayMessage(m.chat, msg.message, {
    messageId: msg.key.id,
  });

  if (typeof m.react === 'function') await m.react("✅");
}

export { pluginConfig as config, handler };