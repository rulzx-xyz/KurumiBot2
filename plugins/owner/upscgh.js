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
        const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

        if (!GITHUB_USERNAME || !GITHUB_TOKEN) {
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply(
                '❌ *Konfigurasi belum lengkap.*\n\n' +
                'Tambahin di file `.env` (bukan di kode plugin):\n' +
                '```\nGITHUB_USERNAME=rulzx-xyz\nGITHUB_TOKEN=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\n```\n' +
                '_Pastikan `.env` ada di `.gitignore` biar token gak ikut ke-commit._'
            );
        }

        // Ambil repo dari origin yang udah ke-setup, gak perlu env terpisah.
        const { stdout: originUrlRaw } = await execAsync('git remote get-url origin');
        const originUrl = originUrlRaw.trim();
        const match = originUrl.match(/github\.com[/:]([^/]+\/[^/]+?)(\.git)?$/);
        if (!match) {
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply(`❌ Gak bisa baca repo dari remote origin: \`${originUrl}\``);
        }
        const repoPath = match[1].replace(/\.git$/, '');

        const commitMsg = args.length > 0
            ? args.join(' ')
            : `Auto Update by Kurumi MD 🕰️ - ${new Date().toLocaleString('id-ID')}`;

        const targetFiles = 'assets case data database plugins src config.js index.js package.json';

        await m.reply(`🕰️ _"Ara ara~ Kurumi sedang mengumpulkan berkas Master..."_\n\n> Menyiapkan pengiriman ke GitHub:\n\`${targetFiles}\``);

        const remoteUrl = `https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${repoPath}.git`;
        await execAsync(`git remote set-url origin ${remoteUrl}`);

        await execAsync(`git add ${targetFiles}`);

        try {
            await execAsync(`git commit -m "${commitMsg}"`);
        } catch (commitErr) {
            const out = commitErr.stdout || '';
            if (out.includes('nothing to commit') || out.includes('nothing added to commit')) {
                await execAsync(`git remote set-url origin https://github.com/${repoPath}.git`).catch(() => {});
                if (typeof m.react === 'function') await m.react('🥀');
                return m.reply('🥀 _"Ara ara... Tidak ada perubahan baru yang ditemukan pada file Master, tidak ada yang perlu di-upload."_');
            }
            throw commitErr;
        }

        const { stdout, stderr } = await execAsync('git push origin main');

        // Bersihin URL biar token gak nyangkut kelamaan di .git/config
        await execAsync(`git remote set-url origin https://github.com/${repoPath}.git`).catch(() => {});

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
            `> _Pastikan GITHUB_USERNAME, GITHUB_TOKEN, GITHUB_REPO sudah diset di .env._\n\n` +
            `*Pesan Error:*\n\`\`\`${error.message}\`\`\``
        );
    }
}

export { pluginConfig as config, handler }