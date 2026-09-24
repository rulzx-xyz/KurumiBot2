import config from '../../config.js'
import path from 'path'
import fs from 'fs'
const pluginConfig = {
    name: 'tqto',
    alias: ['thanksto', 'credits', 'kredit'],
    category: 'main',
    description: 'Menampilkan daftar kontributor bot',
    usage: '.tqto',
    example: '.tqto',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const botName = config.bot?.name || 'Ourin-AI'
    const version = config.bot?.version || '1.0.0'
    const developer = config.bot?.developer || 'Lucky Archz'
    
    const credits = [
        { name: 'RulzxXyz', role: 'Dev Akuma', icon: '👨‍💻' },
        { name: 'Jeno', role: 'Partner Support', icon: '👨‍💻' },
        { name: 'ZellApi', role: 'Api support', icon: '👨‍💻' },
        { name: 'ShaqEndpoint', role: 'Endpoint support', icon: '👨‍💻' },
        { name: 'Team W.Ceo', role: 'Spport System', icon: '👨‍💻' },
        { name: 'Team MBG', role: 'Support sistem - fix bug', icon: '👨‍💻' },
        

    ]
    
    const headers = ['No', 'Nama', 'Role / Tier']
    const rows = credits.map((c, i) => [i + 1, c.name, c.role])
    
    await sock.sendTable(m.chat, "OURIN TEAM", headers, rows, m, { 
        headerText: `${config.bot?.name}\n\n- Dibawah ini adalah list orang yang sudah membantu kami dalam pembuatan bot ini dan sudah men support kami\n`, 
        footer: '\n*Terima kasih yak sudah mendukung kami sampai sejauh ini :b*' 
    })
}

export { pluginConfig as config, handler }