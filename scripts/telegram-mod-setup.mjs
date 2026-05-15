#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
const MOD_CODE = '153-59'

function loadEnvFile(file) {
    const full = path.join(ROOT, file)
    if (!fs.existsSync(full)) return
    for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx === -1) continue
        const key = trimmed.slice(0, idx).trim()
        let value = trimmed.slice(idx + 1).trim()
        if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = value
    }
}

function args() {
    const out = {
        list: false,
        chatId: '',
        latestPrivate: false,
        update: false,
        test: false,
        json: false,
    }
    for (let i = 2; i < process.argv.length; i += 1) {
        const arg = process.argv[i]
        if (arg === '--list') out.list = true
        else if (arg === '--latest-private') out.latestPrivate = true
        else if (arg === '--update') out.update = true
        else if (arg === '--test') out.test = true
        else if (arg === '--json') out.json = true
        else if (arg === '--chat-id') out.chatId = process.argv[++i] ?? ''
    }
    return out
}

async function telegram(method, body) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN')
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : '{}',
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
        throw new Error(json?.description ?? `Telegram ${method} failed: HTTP ${res.status}`)
    }
    return json.result
}

async function listUpdates() {
    const updates = await telegram('getUpdates', {})
    return (updates ?? []).map(update => {
        const msg = update.message ?? update.edited_message ?? update.channel_post ?? null
        const chat = msg?.chat ?? null
        const from = msg?.from ?? null
        return {
            update_id: update.update_id,
            chat_id: chat?.id ? String(chat.id) : null,
            chat_type: chat?.type ?? null,
            chat_title: chat?.title ?? null,
            from_username: from?.username ?? null,
            from_name: [from?.first_name, from?.last_name].filter(Boolean).join(' ') || null,
            text: msg?.text ?? null,
            date: msg?.date ? new Date(msg.date * 1000).toISOString() : null,
        }
    })
}

function latestPrivateChatId(updates) {
    const privateUpdates = updates
        .filter(update => update.chat_type === 'private' && update.chat_id)
        .sort((a, b) => (b.update_id ?? 0) - (a.update_id ?? 0))
    return privateUpdates[0]?.chat_id ?? null
}

async function updateModChatId(chatId) {
    loadEnvFile('.env.local')
    loadEnvFile('.env')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRole) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    const supabase = createClient(supabaseUrl, serviceRole, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase
        .from('employees')
        .update({
            telegram_chat_id: chatId,
            telegram_registered_at: new Date().toISOString(),
        })
        .eq('employee_code', MOD_CODE)
        .select('employee_code, first_name_th, last_name_th, nickname, telegram_chat_id, telegram_registered_at')
        .single()
    if (error) throw error
    return data
}

async function sendTest(chatId) {
    return telegram('sendMessage', {
        chat_id: chatId,
        text: [
            '<b>EBCI Nexus Telegram test</b>',
            'มดเชื่อม Telegram สำเร็จแล้ว',
            'หลังจากนี้ใบลา/WFH ใหม่จะมี bell 🔔 และ Telegram message',
        ].join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    })
}

async function main() {
    loadEnvFile('.env.local')
    loadEnvFile('.env')
    const options = args()

    const me = await telegram('getMe')
    const updates = await listUpdates()
    const selectedChatId = options.chatId || (options.latestPrivate ? latestPrivateChatId(updates) : '')
    const result = { bot: me, updates, selectedChatId, updatedEmployee: null, testMessage: null }

    if (options.update) {
        if (!selectedChatId) throw new Error('No chat id selected. Use --chat-id <id> or --latest-private after มด sends /start.')
        result.updatedEmployee = await updateModChatId(selectedChatId)
    }

    if (options.test) {
        if (!selectedChatId) throw new Error('No chat id selected for test. Use --chat-id <id> or --latest-private.')
        result.testMessage = await sendTest(selectedChatId)
    }

    if (options.json) {
        console.log(JSON.stringify(result, null, 2))
        return
    }

    console.log(`Bot: @${me.username} (${me.first_name})`)
    console.log(`Updates: ${updates.length}`)
    for (const update of updates.slice(-10)) {
        console.log(`- ${update.update_id} chat=${update.chat_id} type=${update.chat_type} from=${update.from_username ?? update.from_name ?? '-'} text=${JSON.stringify(update.text)}`)
    }
    if (selectedChatId) console.log(`Selected chat_id: ${selectedChatId}`)
    if (result.updatedEmployee) console.log(`Updated ${MOD_CODE}: telegram_chat_id=${result.updatedEmployee.telegram_chat_id}`)
    if (result.testMessage) console.log(`Test message sent: ${result.testMessage.message_id}`)
}

main().catch(error => {
    console.error(error.message || error)
    process.exit(1)
})
