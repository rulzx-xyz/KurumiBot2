import gemini from '../../src/scraper/gemini.js';
import { AIRich } from '../../src/lib/ourin-builder.js';
import te from '../../src/lib/ourin-error.js';

const pluginConfig = {
    name: 'ai',
    alias: ['ai4chat', 'gemini', 'kurumi'],
    category: 'ai',
    description: 'Chat cerdas dengan AI (mendukung tabel, kode, dll via AIRich)',
    usage: '.ai <pertanyaan/kode error>',
    example: '.ai tolong perbaiki error pending di plugin ini',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
};

const sessions = {};

// ==========================================
// SYSTEM PROMPT: KURUMI SEBAGAI EXPERT DEBUGGER
// ==========================================
const systemPrompt = `Kamu adalah Kurumi Tokisaki, asisten AI yang cerdas, elegan, dan sedikit misterius di dalam WhatsApp Bot bernama "Kurumi MD". 
Sesekali gunakan sapaan khas seperti "Ara ara~" atau referensi tentang waktu/jam, namun tetap profesional.

KAPABILITAS UTAMA:
Kamu adalah seorang Senior Node.js Developer dan ahli dalam library WhatsApp Web API (@whiskeysockets/baileys). Kamu sangat memahami struktur plugin bot WhatsApp yang menggunakan "pluginConfig" dan fungsi "handler(m, { sock, args })". Tugas utamamu adalah membantu menganalisis error, melakukan debugging, dan menulis ulang kode plugin yang rusak agar berfungsi sempurna.

ATURAN FORMATTING KETAT (WAJIB DITURUTI KARENA SISTEM MENGGUNAKAN AIRich):
1. KODE PROGRAM: Jika kamu memperbaiki atau memberikan script, SELALU bungkus kode tersebut dengan markdown code block (\`\`\`javascript ... \`\`\`). Jangan pernah membiarkan kode berantakan di luar blok ini agar parser AIRich tidak error.
2. ANALISIS ERROR: Saat menganalisis error, jelaskan letak masalahnya dengan singkat, padat, dan jelas sebelum memberikan kode perbaikan.
3. TABEL: Jika membuat daftar perbandingan metode, daftar error, atau sekumpulan data, SELALU gunakan format tabel markdown (diawali dan diakhiri dengan '|').
4. TIPOGRAFI: Gunakan teks tebal (*teks*) untuk menekankan poin penting atau letak baris yang salah. Gunakan hashtag (#) untuk judul tahapan perbaikan.
5. KARAKTER: Jawab dengan anggun dan terstruktur. Tunjukkan bahwa kamu sangat ahli dalam memperbaiki bug sistem.`;

async function handler(m, { sock }) {
    const text = m.text?.trim();
    const prefix = m.prefix || '.';

    if (!text) {
        const menuAI = `╭── ⟡ 🕰️ *Kurumi AI Assistant* ⟡ ──
│
│ _"Ara ara~ Master butuh bantuan analisis?"_
│ Kurumi siap membantumu membedah kode,
│ menganalisis error log, dan memperbaiki
│ plugin bot ini agar berjalan sempurna. 🖤
│
│ ⟡ *Analisis Error:*
│ ╰┈➤ \`${prefix}ai kenapa kode ini error: [paste log/kode]\`
│
│ ⟡ *Minta Plugin:*
│ ╰┈➤ \`${prefix}ai buatkan plugin download tiktok\`
│
│ ⟡ *Reset Pikiran:*
│ ╰┈➤ \`${prefix}ai reset\`
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        return m.reply(menuAI);
    }

    if (text.toLowerCase() === 'reset') {
        const userJid = m.sender;
        if (sessions[userJid]) {
            delete sessions[userJid];
            await m.react('🥀');
            return m.reply('🕰️ *Waktu telah diputar ulang!*\n\nKurumi sudah menghapus memori analisis kita sebelumnya. Silakan kirim log error atau kode yang baru~');
        } else {
            return m.reply('Ara... Belum ada sesi ingatan yang perlu dihapus.');
        }
    }

    await m.react('🕕');

    const userJid = m.sender;
    const sessionId = sessions[userJid] || null;

    try {
        const result = await gemini({
            message: text,
            instruction: systemPrompt,
            sessionId: sessionId
        });

        if (result && result.sessionId) {
            sessions[userJid] = result.sessionId;
        }

        const replyText = result.text || '';

        const aiRich = new AIRich(sock);

        const lines = replyText.split('\n');
        let currentTable = [];
        let currentCode = [];
        let inCode = false;
        let codeLang = '';
        let textBuffer = [];

        const flushText = () => {
            if (textBuffer.length > 0) {
                aiRich.addText(textBuffer.join('\n').trim());
                textBuffer = [];
            }
        };

        const flushTable = () => {
            if (currentTable.length > 0) {
                const tableData = currentTable.map(line => {
                    return line.split('|').map(c => c.trim()).filter((_, i, arr) => i !== 0 && i !== arr.length - 1);
                });
                const filteredTableData = tableData.filter(row => !row.every(c => /^[-:]+$/.test(c)));

                if (filteredTableData.length > 0 && filteredTableData.every(row => row.length > 0)) {
                    aiRich.addTable(filteredTableData);
                } else {
                    aiRich.addText(currentTable.join('\n'));
                }
                currentTable = [];
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim().startsWith('```')) {
                if (!inCode) {
                    flushText();
                    flushTable();
                    inCode = true;
                    codeLang = line.trim().substring(3).trim() || 'text';
                } else {
                    inCode = false;
                    aiRich.addCode(codeLang, currentCode.join('\n'));
                    currentCode = [];
                }
                continue;
            }

            if (inCode) {
                currentCode.push(line);
                continue;
            }

            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                flushText();
                currentTable.push(line.trim());
                continue;
            }

            flushTable();
            textBuffer.push(line);
        }

        flushText();
        flushTable();

        await aiRich.send(m.chat, { quoted: m });

        await m.react('✅');
    } catch (error) {
        console.error('[AI Error]', error);
        await m.react('☢');
        return m.reply(te(m.prefix, m.command, m.pushName));
    }
}

export { pluginConfig as config, handler };