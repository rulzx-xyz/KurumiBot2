import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const pluginConfig = {
    name: 'upscgh',
    alias: ['updategithub', 'pushgh', 'backupgh'],
    category: 'owner',
    description: 'Upload dan update file/folder spesifik bot ke GitHub',
    usage: '.upscgh [pesan commit]',
    example: '.upscgh update fitur AI baru',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 3,
    isEnabled: true
};

async function handler(m, { sock, args }) {
    if (typeof m.react === 'function') await m.react('⏳');

    try {
        // Pesan commit dinamis (bisa custom atau default)
        const commitMsg = args.length > 0 
            ? args.join(' ') 
            : `Auto Update by Kurumi MD 🕰️ - ${new Date().toLocaleString('id-ID')}`;

        // Daftar folder dan file spesifik sesuai gambar/request Master
        const targetFiles = 'assets case data database plugins src config.js index.js package.json';

        await m.reply(`🕰️ _"Ara ara~ Kurumi sedang mengumpulkan berkas Master..."_\n\n> Menyiapkan pengiriman ke GitHub:\n\`${targetFiles}\``);

        // 1. Eksekusi Git Add (Hanya file/folder yang ditentukan)
        await execAsync(`git add ${targetFiles}`);

        // 2. Eksekusi Git Commit
        try {
            await execAsync(`git commit -m "${commitMsg}"`);
        } catch (commitErr) {
            // Kalau tidak ada file yang berubah, git commit bakal nge-throw error
            if (commitErr.stdout && commitErr.stdout.includes('nothing to commit')) {
                if (typeof m.react === 'function') await m.react('🥀');
                return m.reply('🥀 _"Ara ara... Tidak ada perubahan baru yang ditemukan pada file Master, tidak ada yang perlu di-upload."_');
            }
            throw commitErr; // Lempar error lain jika bukan karena "nothing to commit"
        }

        // 3. Eksekusi Git Push (Asumsi branch utamanya 'main')
        const { stdout, stderr } = await execAsync('git push origin main');

        if (typeof m.react === 'function') await m.react('🖤');
        
        await m.reply(
            `🖤 *PENGIRIMAN KE GITHUB BERHASIL!*\n\n` +
            `*Catatan Commit:*\n> ${commitMsg}\n\n` +
            `*Log Sistem:*\n\`\`\`${stdout || stderr || 'Push sukses.'}\`\`\``
        );

    } catch (error) {
        console.error('GitHub Push Error:', error);
        if (typeof m.react === 'function') await m.react('❌');
        
        await m.reply(
            `❌ *GAGAL MENGIRIM KE GITHUB*\n\n` +
            `> _Pastikan Master sudah mengatur akses (Token) Git di VPS._\n\n` +
            `*Pesan Error:*\n\`\`\`${error.message}\`\`\``
        );
    }
}

export { pluginConfig as config, handler }