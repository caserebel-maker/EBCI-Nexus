import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const SECRET_HEADER = 'x-webhook-secret'
const SIGNATURE_HEADER = 'x-webhook-signature'

interface SystemHealthInput {
    host_key?: string
    host_name?: string
    temperature_c?: number | null
    temperature_source?: string | null
    cpu_load_percent?: number | null
    memory_used_percent?: number | null
    uptime_seconds?: number | null
    hip_running?: boolean | null
    sync_loop_running?: boolean | null
    power_status?: string | null
    raw_data?: Record<string, unknown> | null
    reported_at?: string | null
}

function constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function getSecret(): string {
    return process.env.SYSTEM_HEALTH_WEBHOOK_SECRET
        ?? process.env.CARD_SCAN_WEBHOOK_SECRET
        ?? 'ebci_card_webhook_secret_production_2026'
}

function verifyAuth(req: NextRequest, rawBody: string): { ok: true } | { ok: false; reason: string } {
    const secret = getSecret()
    if (!secret) return { ok: false, reason: 'webhook secret not configured' }

    const sharedSecret = req.headers.get(SECRET_HEADER)
    if (sharedSecret) {
        return constantTimeEquals(sharedSecret, secret)
            ? { ok: true }
            : { ok: false, reason: 'invalid shared secret' }
    }

    const signature = req.headers.get(SIGNATURE_HEADER)
    if (signature) {
        const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
        return constantTimeEquals(signature, expected)
            ? { ok: true }
            : { ok: false, reason: 'invalid HMAC signature' }
    }

    return { ok: false, reason: `missing auth - provide ${SECRET_HEADER} or ${SIGNATURE_HEADER}` }
}

function numberOrNull(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    return value
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text()
    const auth = verifyAuth(req, rawBody)
    if (!auth.ok) {
        console.warn('[webhooks/system-health] auth failed:', auth.reason)
        return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
    }

    let parsed: SystemHealthInput
    try {
        parsed = JSON.parse(rawBody) as SystemHealthInput
    } catch {
        return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const hostKey = (parsed.host_key ?? 'office-hip-sync-pc').trim()
    if (!hostKey) return NextResponse.json({ error: 'missing host_key' }, { status: 400 })

    const reportedAt = parsed.reported_at && !Number.isNaN(new Date(parsed.reported_at).getTime())
        ? parsed.reported_at
        : new Date().toISOString()

    const row = {
        host_key: hostKey,
        host_name: parsed.host_name ?? null,
        temperature_c: numberOrNull(parsed.temperature_c),
        temperature_source: parsed.temperature_source ?? null,
        cpu_load_percent: numberOrNull(parsed.cpu_load_percent),
        memory_used_percent: numberOrNull(parsed.memory_used_percent),
        uptime_seconds: numberOrNull(parsed.uptime_seconds),
        hip_running: typeof parsed.hip_running === 'boolean' ? parsed.hip_running : null,
        sync_loop_running: typeof parsed.sync_loop_running === 'boolean' ? parsed.sync_loop_running : null,
        power_status: parsed.power_status ?? null,
        raw_data: parsed.raw_data ?? {},
        reported_at: reportedAt,
        updated_at: new Date().toISOString(),
    }

    const { error } = await supabaseAdmin
        .from('system_health_snapshots')
        .upsert(row, { onConflict: 'host_key' })

    if (error) {
        console.error('[webhooks/system-health] upsert failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, host_key: hostKey, reported_at: reportedAt })
}

export async function GET() {
    return NextResponse.json({
        ok: true,
        route: '/api/webhooks/system-health',
        method: 'POST',
        auth: `Send header "${SECRET_HEADER}: <secret>" or "${SIGNATURE_HEADER}: sha256=<hmac>"`,
        body_shape: {
            host_key: 'string',
            temperature_c: 'number | null',
            cpu_load_percent: 'number | null',
            memory_used_percent: 'number | null',
            hip_running: 'boolean',
            sync_loop_running: 'boolean',
            reported_at: 'ISO timestamp',
        },
    })
}

