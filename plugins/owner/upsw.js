const pluginConfig = {
    name: 'upsw',
    alias: ['uploadsw', 'statusbot'],
    category: 'owner',
    description: 'Upload status WA HD ke nomor bot',
    usage: '.upsw <caption atau reply media>',
    example: '.upsw Info mabar ges!',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 2,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        // PERBAIKAN 1: Ekstrak Teks Lebih Akurat
        // Ambil teks murni, hilangkan kata .upsw, lalu ambil sisanya
        let rawText = m.text || m.body || "";
        let text = rawText.replace(/^\.upsw/i, '').trim();

        let q = m.quoted ? m.quoted : m;

        // Jika user cuma reply gambar tanpa ngetik apa-apa, ambil dari caption asli gambar tsb
        if (!text && q.caption) text = q.caption;
        
        // Hapus teks bawaan bot (supaya caption "CLAIM SUCCESS" tidak ikut ke-upload)
        if (text.includes('CLAIM SUCCESS - KURUMI CONVERTSW')) {
            text = ''; 
        }

        let mime = (q.msg || q).mimetype || q.mtype || m.mtype || q.type || '';
        let isVideo = /video/i.test(mime) || /videoMessage/i.test(mime);
        let isImage = /image/i.test(mime) || /imageMessage/i.test(mime);

        if (!isVideo && !isImage) {
            return await m.reply('❌ Balas atau kirim foto/video dengan caption `.upsw teksnya`');
        }

        await m.reply('⏳ Mengunggah media ke Status WhatsApp dengan kualitas HD...');

        let mediaBuffer;
        
        if (typeof q.download === 'function') {
            mediaBuffer = await q.download();
        } 
        else if (typeof sock.downloadMediaMessage === 'function') {
            mediaBuffer = await sock.downloadMediaMessage(q);
        } 
        else {
            const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
            let type = isVideo ? 'video' : 'image';
            const stream = await downloadContentFromMessage(q.msg || q, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaBuffer = buffer;
        }

        if (!mediaBuffer) {
            return await m.reply('❌ Gagal menyedot media dari pesan tersebut.');
        }

        let mediaType = isVideo ? 'video' : 'image';
        
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const senderNumber = m.sender || m.key.remoteJid;
        
        // Daftar nomor yang bisa lihat status (bot dan nomor lu)
        const viewList = [botNumber, senderNumber];

        // PERBAIKAN 2: Mimetype Wajib Diisi Agar WA Tidak Kompres Ulang!
        const statusOptions = {
            [mediaType]: mediaBuffer,
            caption: text,
            mimetype: isVideo ? 'video/mp4' : 'image/jpeg' 
        };

        // Eksekusi upload ke server SW
        await sock.sendMessage('status@broadcast', statusOptions, {
            backgroundColor: '#000000',
            statusJidList: viewList
        });

        // Debugging balasan untuk mastiin caption-nya beneran nyangkut
        await m.reply(`✅ *BERHASIL*\n\nStatus HD sudah di-update!\n📝 *Caption terkirim:* ${text ? text : '_(Tanpa Caption)_'}`);
    } catch (error) {
        console.error('UpSW Plugin Error:', error);
        await m.reply('❌ *GAGAL*\n\n> ' + error.message);
    }
}

export { pluginConfig as config, handler }