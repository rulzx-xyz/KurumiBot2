const API = "https://router.ryzumi.net/v1"
const MODEL = "neko/qwen3.8-flash"

const tools = [
    {
        type: "function",
        function: {
            name: "shell",
            description: "Execute a shell command on the local machine.",
            parameters: {
                type: "object",
                properties: {
                    command: { type: "string", description: "Shell command to execute" }
                },
                required: ["command"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "eval_js",
            description: "Evaluate JavaScript code and return the result.",
            parameters: {
                type: "object",
                properties: {
                    code: { type: "string", description: "JavaScript code to evaluate" }
                },
                required: ["code"]
            }
        }
    }
]

async function shell(command) {
    const { exec } = await import("node:child_process")
    const { promisify } = await import("node:util")

    try {
        const { stdout, stderr } = await promisify(exec)(command, {
            shell: "/bin/bash",
            timeout: 120000,
            maxBuffer: 5 * 1024 * 1024
        })

        return [
            stdout && `STDOUT:\n${stdout}`,
            stderr && `STDERR:\n${stderr}`
        ].filter(Boolean).join("\n") || "(no output)"
    } catch (e) {
        return [
            `EXIT CODE: ${e.code ?? "unknown"}`,
            e.stdout && `STDOUT:\n${e.stdout}`,
            e.stderr && `STDERR:\n${e.stderr}`,
            `ERROR: ${e.message}`
        ].filter(Boolean).join("\n")
    }
}

async function evalJs(code) {
    try {
        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor
        const fn = new AsyncFunction(code)
        const result = await fn()

        let out
        if (typeof result === "string") out = result
        else out = JSON.stringify(result, null, 2)

        return out === undefined ? "(no output)" : out
    } catch (e) {
        return `ERROR: ${e.stack || e.message}`
    }
}

async function CallAgent(prompt, callback) {
    const key = "sk-neko-312q3o3h4o2bq3s761633f1i6x5u"

    if (!key) throw new Error("Missing RYZUMI_KEY")

    const messages = [
        {
            role: "system",
            content:
                "You are an autonomous coding/terminal agent. " +
                "You have two tools: shell and eval_js. " +
                "Complete the user's request quickly and directly. " +
                "Use shell only when necessary. " +
                "Do not overthink, over-investigate, or inspect unrelated files. " +
                "Avoid unnecessary commands, tests, experiments, and verification. " +
                "Do not repeat successful actions. " +
                "If the request is clear, act immediately. " +
                "Stop immediately when the task is complete. " +
                "Do not explain what you could do when you can do it. " +
                "Keep all responses extremely concise. " +
                "Final response must be brief and practical, normally 1-5 short lines. " +
                "Never write essays, long summaries, or unnecessary details. " +
                "Only mention important results, changes, errors, or next actions."
        },
        { role: "user", content: prompt }
    ]

    try {
        for (let i = 0; i < 30; i++) {
            const start = Date.now()
            const r = await fetch(API + "/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages,
                    tools,
                    tool_choice: "auto"
                })
            })

            if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`)

            const data = await r.json()
            const msg = data.choices?.[0]?.message

            if (!msg) throw new Error("Invalid model response")

            const thought = msg.reasoning_content || msg.reasoning || msg.thought || msg.thinking

            if (thought) {
                callback({ type: "thought", duration: Date.now() - start })
            }

            messages.push(msg)

            if (!msg.tool_calls?.length) {
                callback({ type: "agent", text: msg.content || "" })
                return
            }

            for (const call of msg.tool_calls) {
                const name = call.function?.name
                const rawArgs = call.function?.arguments || "{}"

                let args
                try {
                    args = JSON.parse(rawArgs)
                } catch {
                    args = {}
                }

                callback({ type: "tool", name, arguments: args })

                let result
                if (name === "shell") {
                    result = await shell(args.command || "")
                } else if (name === "eval_js") {
                    result = await evalJs(args.code || "")
                } else {
                    result = `Unknown tool: ${name}`
                }

                callback({ type: "tool_result", name, text: result })

                messages.push({
                    role: "tool",
                    tool_call_id: call.id,
                    content: result
                })
            }
        }

        callback({ type: "error", text: "Agent reached maximum iterations." })
    } catch (e) {
        callback({ type: "error", text: e.stack || e.message })
    }
}

function ParseToNewString(e, s = {}) {
    s.out ??= ""
    s.ai ??= ""
    s.thinking ??= 0

    const cut = (x, n = 30) => {
        x = String(x ?? "").replace(/\s+/g, " ").trim()
        return x.length > n ? x.slice(0, n) + "..." : x
    }

    if (e.type === "thought") {
        s.thinking = e.duration
    } else if (e.type === "progress") {
        s.out += cut(e.text) + "\n"
    } else if (e.type === "tool") {
        let a = e.arguments
        if (typeof a === "string") try { a = JSON.parse(a) } catch { }
        if (s.thinking) {
            s.out += `_Berpikir selama ${(s.thinking / 1000).toFixed(1)} detik._\n`
            s.thinking = 0
        }
        const label = e.name === "shell" ? a?.command : a?.code
        s.out += `*${cut(label ?? JSON.stringify(a || {}))}*\n`
    } else if (e.type === "tool_result") {
        let x = String(e.text || "")
            .replace(/^STDOUT:\s*/i, "")
            .replace(/^STDERR:\s*/i, "")
            .split(/\r?\n/)
            .find(x => x.trim()) || "(no output)"
        s.out += cut(x) + "\n"
    } else if (e.type === "agent") {
        s.ai = String(e.text || "").trim()
    } else if (e.type === "error") {
        s.out += `[ERROR] ${cut(e.text, 100)}\n`
    }

    if (s.ai.split("\n").length > 33) return s.ai

    let x = (s.out + s.ai).trim().split(/\r?\n/)
    if (x.length > 33) x = ["...", ...x.slice(-32)]

    return x.join("\n")
}

const pluginConfig = {
    name: 'agentai',
    alias: ['agent', 'ai'],
    category: 'owner',
    description: 'Agent AI otonom - bisa jalanin shell command & eval JS buat nyelesain tugas (owner only)',
    usage: '.agentai <perintah>',
    example: '.agentai cek isi file store.js apa ada fungsi save message',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 3,
    isEnabled: true
}

async function handler(m, { sock }) {
    const prompt = m.text
    if (!prompt?.trim()) {
        return m.reply(`Format: *${pluginConfig.usage}*\nContoh: *${pluginConfig.example}*`)
    }

    try {
        const state = {}
        const seme = await m.reply("Memproses...")

        let terakhirKirim = 0
        let sedangKirim = false
        let editTertunda = null

        async function kirimEdit(text) {
            sedangKirim = true
            try {
                await sock.sendMessage(m.chat, { text, edit: seme.key })
            } catch (e) {
                console.error('Agent edit error:', e.message)
            }
            terakhirKirim = Date.now()
            sedangKirim = false
            if (editTertunda !== null) {
                const lanjut = editTertunda
                editTertunda = null
                kirimEdit(lanjut)
            }
        }

        function jadwalkanEdit(text) {
            if (!sedangKirim && Date.now() - terakhirKirim >= 1500) {
                kirimEdit(text)
            } else {
                editTertunda = text // cuma simpen yang terbaru, gak numpuk antrian
            }
        }

        await CallAgent(prompt, e => {
            const text = ParseToNewString(e, state)
            jadwalkanEdit(text)
        })

        if (editTertunda !== null) {
            await kirimEdit(editTertunda)
        }

        const hasilAkhir = state.ai || state.out || '(tidak ada output)'
        await sock.sendMessage(m.chat, { text: `✅ *Selesai*\n\n${hasilAkhir}` }, { quoted: m })
    } catch (error) {
        console.error('Agent Plugin Error:', error)
        await m.reply('❌ *GAGAL*\n\n> ' + error.message)
    }
}

export { pluginConfig as config, handler }