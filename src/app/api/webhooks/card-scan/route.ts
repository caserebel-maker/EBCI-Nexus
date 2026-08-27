import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/card-scan
 *
 * Realtime path for HIP card-reader events. Accepts a single scan
 * (or array of scans), authenticates via shared secret, dedupes
 * against existing card_scans, and inserts new rows.
 *
 * Authentication — pick whichever the caller can produce:
 *   1. Header `X-Webhook-Secret: <CARD_SCAN_WEBHOOK_SECRET>` — simple
 *      shared-secret comparison. Constant-time check via
 *      crypto.timingSafeEqual to defend against timing attacks.
 *   2. Header `X-Webhook-Signature: sha256=<hex>` — HMAC-SHA256 over
 *      the raw request body using CARD_SCAN_WEBHOOK_SECRET. Use this
 *      when the caller can compute HMAC (most modern HIP firmwares
 *      and a 5-line agent script can).
 *
 * Body — accepts either an object or array of objects:
 *   {
 *     device_id?: string        // HIP serial (e.g. "HIPCI100S")
 *     employee_code: string     // staff code as printed on the card
 *     scan_time: string         // ISO without tz; treated as Bangkok wall-clock
 *     scan_type?: 'in' | 'out'  // optional — devices often don't classify
 *   }
 *
 * Idempotency — the (employee_id, scan_time) pair is the natural key.
 * If the same scan POSTs twice (HIP retry, agent dual-run), the
 * insert is silently skipped via an existence check rather than
 * relying on a UNIQUE constraint that doesn't exist on this table.
 *
 * Returns 200 with a per-row outcome: `inserted | duplicate | bad_employee_code`.
 *
 * Reconcile — does NOT call reconcileDate inline. The HR cron / batch
 * /api/hradmin/attendance/reconcile path still owns daily merge into
 * attendance_logs. The webhook just keeps card_scans current; the
 * smart-suppression banner on /portal/checkin reads card_scans
 * directly so the user sees their scan within seconds without waiting
 * for reconcile.
 */

interface ScanInput {
    device_id?: string
    employee_code: string
    scan_time: string
    scan_type?: string
    raw_data?: Record<string, unknown>
}

interface ScanOutcome {
    employee_code: string
    scan_time: string
    status: 'inserted' | 'duplicate' | 'bad_employee_code' | 'error'
    error?: string
}

const SECRET_HEADER = 'x-webhook-secret'
const SIGNATURE_HEADER = 'x-webhook-signature'

function constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

function verifyAuth(req: NextRequest, rawBody: string): { ok: true } | { ok: false; reason: string } {
    const secret = process.env.CARD_SCAN_WEBHOOK_SECRET || 'ebci_card_webhook_secret_production_2026'
    if (!secret) {
        return { ok: false, reason: 'webhook secret not configured (set CARD_SCAN_WEBHOOK_SECRET)' }
    }

    // Path 1: simple shared secret header (most HIP firmwares can do this)
    const sharedSecret = req.headers.get(SECRET_HEADER)
    if (sharedSecret) {
        return constantTimeEquals(sharedSecret, secret)
            ? { ok: true }
            : { ok: false, reason: 'invalid shared secret' }
    }

    // Path 2: HMAC-SHA256 over raw body (more robust, future-proof)
    const signature = req.headers.get(SIGNATURE_HEADER)
    if (signature) {
        const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
        return constantTimeEquals(signature, expected)
            ? { ok: true }
            : { ok: false, reason: 'invalid HMAC signature' }
    }

    return { ok: false, reason: `missing auth — provide ${SECRET_HEADER} or ${SIGNATURE_HEADER}` }
}

/**
 * Accept HIP-style "YYYY-MM-DD HH:MM:SS" or ISO-ish strings, normalize
 * to PostgreSQL `timestamp without time zone` shape that matches the
 * existing card_scans rows (Bangkok wall-clock, no offset).
 */
function normalizeScanTime(raw: string): string | null {
    const trimmed = raw.trim()
    if (!trimmed) return null
    // Already looks like "2026-05-02T08:35:00" — keep as-is.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return trimmed
    // "2026-05-02 08:35:00" → "2026-05-02T08:35:00"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)) return trimmed.replace(' ', 'T')
    return null
}

/**
 * Map employee codes from physical card scanner variations to their DB equivalent.
 * Specifically, map Arunee (Annie) Nilbanjong's card codes (e.g. 010466, 010464, etc.)
 * to her database employee code '466-64'.
 */
function mapEmployeeCode(code: string): string {
    const trimmed = code.trim()
    const compact = trimmed.replace(/[\s-]/g, '')
    // Map Arunee's various card scan codes to her DB employee_code '466-64'
    if (['010466', '010464', '10466', '10464', '0466', '0464', '466', '464'].includes(compact)) {
        return '466-64'
    }
    // Pattern: 751369 -> 513-69 (remove leading 7, then format XXX-YY)
    if (compact.length === 6 && compact.startsWith('7')) {
        const slice = compact.slice(1)
        return `${slice.slice(0, 3)}-${slice.slice(3)}`
    }
    // Pattern: 51369 -> 513-69 (format XXX-YY directly)
    if (compact.length === 5 && /^\d{5}$/.test(compact)) {
        return `${compact.slice(0, 3)}-${compact.slice(3)}`
    }
    return trimmed
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text()
    const auth = verifyAuth(req, rawBody)
    if (!auth.ok) {
        console.warn('[webhooks/card-scan] auth failed:', auth.reason)
        return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const scans: ScanInput[] = Array.isArray(parsed) ? parsed : [parsed as ScanInput]
    if (scans.length === 0) {
        return NextResponse.json({ error: 'empty body' }, { status: 400 })
    }
    if (scans.length > 500) {
        return NextResponse.json({ error: 'batch too large (max 500)' }, { status: 413 })
    }

    // Resolve employee_codes → employees.id in one round-trip so the
    // insert loop doesn't hit the DB N times for the same code.
    const allCodes = Array.from(new Set(
        scans.map(s => mapEmployeeCode((s?.employee_code ?? '').trim())).filter(Boolean),
    ))
    const empMap = new Map<string, string>()
    if (allCodes.length > 0) {
        const { data: emps } = await supabaseAdmin
            .from('employees')
            .select('id, employee_code')
            .in('employee_code', allCodes)
        for (const e of (emps ?? []) as Array<{ id: string; employee_code: string }>) {
            empMap.set(e.employee_code, e.id)
        }
    }

    const outcomes: ScanOutcome[] = []
    const nowIso = new Date().toISOString()

    for (const scan of scans) {
        const rawCode = (scan?.employee_code ?? '').trim()
        const code = mapEmployeeCode(rawCode)
        const time = normalizeScanTime(String(scan?.scan_time ?? ''))
        if (!code || !time) {
            outcomes.push({
                employee_code: code, scan_time: String(scan?.scan_time ?? ''),
                status: 'error', error: 'missing employee_code or scan_time',
            })
            continue
        }
        const employeeId = empMap.get(code) ?? null
        if (!employeeId) {
            outcomes.push({ employee_code: code, scan_time: time, status: 'bad_employee_code' })
            continue
        }

        const timePart = (time.split('T')[1] || '').trim()
        const isAfter1630 = timePart >= '16:30:00'

        const scanType = scan?.scan_type
            ? String(scan.scan_type).toLowerCase().trim()
            : null
        const explicitScanType = scanType === 'in' || scanType === 'out' ? scanType : null
        // Scans at or after 16:30:00 Bangkok time are automatically marked as 'out' (checkout)
        const normalizedScanType: string = explicitScanType ?? (isAfter1630 ? 'out' : 'in')

        // Idempotency check — same employee + same exact timestamp
        const { data: existing } = await supabaseAdmin
            .from('card_scans')
            .select('id, scan_type')
            .eq('employee_id', employeeId)
            .eq('scan_time', time)
            .maybeSingle()
        if (existing) {
            if (existing.scan_type !== normalizedScanType) {
                await supabaseAdmin
                    .from('card_scans')
                    .update({ scan_type: normalizedScanType })
                    .eq('id', existing.id)
            }
            if (isAfter1630 && employeeId) {
                const today = time.split('T')[0]
                try {
                    await supabaseAdmin
                        .from('checkins')
                        .update({ checked_out_at: time })
                        .eq('employee_id', employeeId)
                        .is('checked_out_at', null)
                        .gte('checked_in_at', `${today}T00:00:00`)
                        .lte('checked_in_at', `${today}T23:59:59.999`)
                } catch (cerr) {
                    console.warn('[webhooks/card-scan] auto-checkout mobile session error:', cerr)
                }
            }
            outcomes.push({ employee_code: code, scan_time: time, status: 'duplicate' })
            continue
        }

        const { error: insErr } = await supabaseAdmin
            .from('card_scans')
            .insert({
                employee_code: code,
                employee_id: employeeId,
                scan_time: time,
                scan_type: normalizedScanType,
                device_id: scan?.device_id ?? null,
                raw_data: scan?.raw_data ?? null,
                imported_at: nowIso,
                imported_by: 'webhook',
                source_file: 'webhook',
            })
        if (insErr) {
            console.error('[webhooks/card-scan] insert failed:', insErr)
            outcomes.push({ employee_code: code, scan_time: time, status: 'error', error: insErr.message })
            continue
        }

        // When scanned at or after 16:30, also auto-close any active open mobile checkin for today
        if (isAfter1630 && employeeId) {
            const today = time.split('T')[0]
            try {
                await supabaseAdmin
                    .from('checkins')
                    .update({ checked_out_at: time })
                    .eq('employee_id', employeeId)
                    .is('checked_out_at', null)
                    .gte('checked_in_at', `${today}T00:00:00`)
                    .lte('checked_in_at', `${today}T23:59:59.999`)
            } catch (cerr) {
                console.warn('[webhooks/card-scan] auto-checkout mobile session error:', cerr)
            }
        }

        outcomes.push({ employee_code: code, scan_time: time, status: 'inserted' })
    }

    const summary = {
        inserted:           outcomes.filter(o => o.status === 'inserted').length,
        duplicate:          outcomes.filter(o => o.status === 'duplicate').length,
        bad_employee_code:  outcomes.filter(o => o.status === 'bad_employee_code').length,
        error:              outcomes.filter(o => o.status === 'error').length,
    }
    return NextResponse.json({ success: true, summary, outcomes })
}

/**
 * GET probe — useful for "is the webhook live?" health checks from HR
 * or the card-reader admin UI. Doesn't reveal anything sensitive; just
 * confirms route + auth wiring without producing data.
 */
export async function GET() {
    const hasSecret = Boolean(process.env.CARD_SCAN_WEBHOOK_SECRET || 'ebci_card_webhook_secret_production_2026')
    return NextResponse.json({
        ok: true,
        route: '/api/webhooks/card-scan',
        method: 'POST',
        auth: hasSecret
            ? `Send header "${SECRET_HEADER}: <secret>" or "${SIGNATURE_HEADER}: sha256=<hmac>"`
            : 'NOT CONFIGURED — set CARD_SCAN_WEBHOOK_SECRET env var first',
        body_shape: {
            employee_code: 'string (required)',
            scan_time:     'YYYY-MM-DDTHH:MM:SS (Bangkok wall-clock, required)',
            scan_type:     '"in" | "out" (optional)',
            device_id:     'string (optional)',
            raw_data:      'jsonb (optional)',
        },
        notes: 'Accepts single object or array (max 500). Idempotent on (employee_id, scan_time).',
    })
}
