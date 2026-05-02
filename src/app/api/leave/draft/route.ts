import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

export const dynamic = 'force-dynamic'

/**
 * §2.4 BETA_FEEDBACK — Draft + autosave ใบลา
 *
 * GET    /api/leave/draft         → list current user's drafts
 * POST   /api/leave/draft         → upsert (body: { id?, payload })
 * DELETE /api/leave/draft?id=...  → delete one draft
 *
 * Drafts are stored separately from `leave_requests` so:
 *   - approver inbox / audit / reports queries stay clean
 *   - form-shape changes don't need migrations (payload is jsonb)
 *
 * Auth: session cookie + resolveSessionEmployeeId. Drafts are scoped
 * to the session's employee row — no other user can read/write yours.
 */

interface DraftPayload {
    leave_type_id?: string | null
    start_date?: string | null
    end_date?: string | null
    is_half_day?: boolean
    half_day_period?: 'morning' | 'afternoon' | null
    reason?: string | null
    contact_during_leave?: string | null
    step?: number
    // Attachments are NOT serialized — File objects can't survive a
    // page reload anyway, so the user re-attaches on resume.
}

const MAX_PAYLOAD_BYTES = 8_000  // ~8KB is plenty for a leave form
const MAX_DRAFTS_PER_USER = 10   // soft cap to prevent runaway autosave bugs

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ items: [] })

    const { data, error } = await supabaseAdmin
        .from('leave_drafts')
        .select('id, payload, created_at, updated_at')
        .eq('employee_id', employeeId)
        .order('updated_at', { ascending: false })
        .limit(MAX_DRAFTS_PER_USER)

    if (error) {
        console.error('[leave/draft] list error:', error)
        return NextResponse.json({ error: 'โหลดฉบับร่างไม่สำเร็จ' }, { status: 500 })
    }
    return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 400 })
    }

    let body: { id?: string; payload?: DraftPayload }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const payload = sanitizePayload(body.payload)
    const serialized = JSON.stringify(payload)
    if (serialized.length > MAX_PAYLOAD_BYTES) {
        return NextResponse.json({ error: 'payload เกินขนาดที่อนุญาต' }, { status: 413 })
    }

    // Update path — must verify the draft belongs to this employee so
    // a tampered id can't overwrite someone else's draft.
    if (body.id) {
        const { data: existing, error: lookupErr } = await supabaseAdmin
            .from('leave_drafts')
            .select('id')
            .eq('id', body.id)
            .eq('employee_id', employeeId)
            .maybeSingle()
        if (lookupErr || !existing) {
            return NextResponse.json({ error: 'ไม่พบฉบับร่างนี้' }, { status: 404 })
        }
        const { error: updErr } = await supabaseAdmin
            .from('leave_drafts')
            .update({ payload })
            .eq('id', body.id)
        if (updErr) {
            console.error('[leave/draft] update error:', updErr)
            return NextResponse.json({ error: 'บันทึกฉบับร่างไม่สำเร็จ' }, { status: 500 })
        }
        return NextResponse.json({ id: body.id })
    }

    // Insert path — soft-cap at MAX_DRAFTS_PER_USER so a runaway
    // autosave (e.g. component re-creating IDs) can't fill the table.
    const { count } = await supabaseAdmin
        .from('leave_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', employeeId)
    if ((count ?? 0) >= MAX_DRAFTS_PER_USER) {
        return NextResponse.json(
            { error: `ฉบับร่างเกิน ${MAX_DRAFTS_PER_USER} ฉบับ — ลบฉบับเก่าก่อน` },
            { status: 409 },
        )
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
        .from('leave_drafts')
        .insert({ employee_id: employeeId, payload })
        .select('id')
        .single()
    if (insErr || !inserted) {
        console.error('[leave/draft] insert error:', insErr)
        return NextResponse.json({ error: 'บันทึกฉบับร่างไม่สำเร็จ' }, { status: 500 })
    }
    return NextResponse.json({ id: inserted.id })
}

export async function DELETE(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 400 })
    }

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    // Scope by employee_id so a tampered id can't delete other people's
    // drafts. Returning 200 even when 0 rows match is intentional —
    // we don't leak whether the id existed.
    const { error } = await supabaseAdmin
        .from('leave_drafts')
        .delete()
        .eq('id', id)
        .eq('employee_id', employeeId)
    if (error) {
        console.error('[leave/draft] delete error:', error)
        return NextResponse.json({ error: 'ลบฉบับร่างไม่สำเร็จ' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
}

/**
 * Strip everything we don't recognize so a malformed client can't
 * stuff arbitrary keys into the jsonb. Trimmed strings, capped lengths.
 */
function sanitizePayload(raw: DraftPayload | undefined): DraftPayload {
    if (!raw || typeof raw !== 'object') return {}
    const out: DraftPayload = {}
    if (typeof raw.leave_type_id === 'string') out.leave_type_id = raw.leave_type_id.slice(0, 64)
    if (typeof raw.start_date === 'string')    out.start_date    = raw.start_date.slice(0, 32)
    if (typeof raw.end_date === 'string')      out.end_date      = raw.end_date.slice(0, 32)
    if (typeof raw.is_half_day === 'boolean')  out.is_half_day   = raw.is_half_day
    if (raw.half_day_period === 'morning' || raw.half_day_period === 'afternoon') {
        out.half_day_period = raw.half_day_period
    }
    if (typeof raw.reason === 'string')               out.reason               = raw.reason.slice(0, 2000)
    if (typeof raw.contact_during_leave === 'string') out.contact_during_leave = raw.contact_during_leave.slice(0, 200)
    if (typeof raw.step === 'number' && raw.step >= 1 && raw.step <= 4) out.step = Math.floor(raw.step)
    return out
}
