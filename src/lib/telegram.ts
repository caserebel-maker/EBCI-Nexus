import 'server-only'

/**
 * Telegram Bot helper — Phase 1 (ม๊อด MVP).
 *
 * Sends a one-way message to a single chat (DM with the user who ran
 * /start on our bot). The bot itself is registered via @BotFather and
 * its token lives in `TELEGRAM_BOT_TOKEN` on Vercel.
 *
 * Best-effort by design — every caller wraps `sendTelegram()` in its
 * own try/catch and never fails the parent action. Telegram outage
 * should never block a leave submission.
 *
 * Multiple HR users share the same bot but get their own chat_ids;
 * we store each chat_id on `employees.telegram_chat_id` after the
 * user opts in via `/portal/notifications/telegram`.
 */

const API_BASE = 'https://api.telegram.org/bot'

interface SendTelegramArgs {
    chatId: string
    text: string
    /** Parse mode for rich formatting. Default: HTML.
     *  Use <b>bold</b>, <i>italic</i>, <a href="...">link</a>. */
    parseMode?: 'HTML' | 'MarkdownV2'
    /** Disable link previews so notifications stay compact. Default: true. */
    disablePreview?: boolean
}

interface TelegramSendResult {
    success: boolean
    error?: string
    /** Telegram message_id for audit + future edits. */
    message_id?: number
}

/**
 * Send a single Telegram message. Returns a result object — never
 * throws. Caller logs the `error` field if it cares.
 */
export async function sendTelegram(args: SendTelegramArgs): Promise<TelegramSendResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
        return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }
    }
    if (!args.chatId) {
        return { success: false, error: 'chatId is empty' }
    }
    if (!args.text || !args.text.trim()) {
        return { success: false, error: 'text is empty' }
    }

    try {
        const url = `${API_BASE}${token}/sendMessage`
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                chat_id: args.chatId,
                text: args.text,
                parse_mode: args.parseMode ?? 'HTML',
                disable_web_page_preview: args.disablePreview ?? true,
            }),
            // Don't hold up the parent request — Telegram should respond
            // within a couple seconds on a healthy network.
            signal: AbortSignal.timeout(8000),
        })
        const json = await res.json().catch(() => null) as
            | { ok: boolean; result?: { message_id: number }; description?: string }
            | null

        if (!res.ok || !json?.ok) {
            const errMsg = json?.description ?? `HTTP ${res.status}`
            console.error('[telegram] send failed:', errMsg, 'chatId:', args.chatId)
            return { success: false, error: errMsg }
        }
        return { success: true, message_id: json.result?.message_id }
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[telegram] send threw:', errMsg)
        return { success: false, error: errMsg }
    }
}

/**
 * Resolve the bot's @username so we can build join links like
 * `https://t.me/<username>?start=...`. Returns null on any error.
 * Used by the registration page so the user doesn't have to type the
 * bot name by hand.
 */
export async function getBotUsername(): Promise<string | null> {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return null
    try {
        const res = await fetch(`${API_BASE}${token}/getMe`, {
            signal: AbortSignal.timeout(5000),
        })
        const json = await res.json().catch(() => null) as
            | { ok: boolean; result?: { username?: string } }
            | null
        return json?.result?.username ?? null
    } catch (err) {
        console.error('[telegram] getBotUsername failed:', err)
        return null
    }
}

/**
 * Escape user-supplied text before interpolating into an HTML-formatted
 * Telegram message. Mirrors the email escapeHtml — < > & " ' get
 * escaped. Use this for ALL untrusted input (names, reasons, etc.)
 * before pasting into the template.
 */
export function escapeTelegramHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}
