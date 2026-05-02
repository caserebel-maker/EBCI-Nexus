import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/hradmin/leave/balances
 *
 * Body: {
 *   balance_id?:     string | null   // null/missing → upsert a new row
 *   employee_id:     string
 *   leave_type_id:   string
 *   year:            number
 *   total_days:      number          // ≥ 0
 *   used_days?:      number          // optional override, ≥ 0
 *   reason:          string          // ≥ 10 chars
 * }
 *
 * Updates (or creates) a leave_balances row and appends an audit line
 * to its `notes` column. `total_days` is the primary editable field;
 * `used_days` is also editable as an HR override (migration cases where
 * the leave-request flow can't reconstruct the historical used count).
 * `pending_days` stays owned by the request flow — touching it from
 * here would orphan the inbox state.
 */
export async function PATCH(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'เฉพาะ HR เท่านั้น' }, { status: 403 })
    }
    const session = auth.session

    const actorId = await resolveSessionEmployeeId(session)
    if (!actorId) return NextResponse.json({ error: 'ไม่พบพนักงานที่เชื่อมโยงบัญชี' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const balanceId = body?.balance_id ? String(body.balance_id) : null
    const employeeId = String(body?.employee_id ?? '').trim()
    const leaveTypeId = String(body?.leave_type_id ?? '').trim()
    const year = parseInt(String(body?.year ?? ''), 10)
    const totalDaysRaw = Number(body?.total_days)
    // used_days is OPTIONAL — only validated when the client sent it.
    // Distinguishes "didn't pass" from "passed 0" by checking key presence.
    const usedProvided = body !== null && typeof body === 'object' && 'used_days' in body
    const usedDaysRaw = usedProvided ? Number(body?.used_days) : null
    const reason = String(body?.reason ?? '').trim()

    if (!employeeId || !leaveTypeId) {
        return NextResponse.json({ error: 'missing employee_id or leave_type_id' }, { status: 400 })
    }
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'year ไม่ถูกต้อง' }, { status: 400 })
    }
    if (!Number.isFinite(totalDaysRaw) || totalDaysRaw < 0) {
        return NextResponse.json({ error: 'total_days ต้องไม่ติดลบ' }, { status: 400 })
    }
    if (usedProvided && (!Number.isFinite(usedDaysRaw) || (usedDaysRaw as number) < 0)) {
        return NextResponse.json({ error: 'used_days ต้องไม่ติดลบ' }, { status: 400 })
    }
    if (reason.length < 10) {
        return NextResponse.json({ error: 'ต้องระบุเหตุผล (อย่างน้อย 10 ตัวอักษร)' }, { status: 400 })
    }
    const newTotal = Math.round(totalDaysRaw * 2) / 2 // snap to 0.5 step
    const newUsed = usedProvided
        ? Math.round((usedDaysRaw as number) * 2) / 2
        : null

    // Validate FKs
    const [empRes, typeRes] = await Promise.all([
        supabaseAdmin.from('employees').select('id').eq('id', employeeId).maybeSingle(),
        supabaseAdmin.from('leave_types').select('id').eq('id', leaveTypeId).maybeSingle(),
    ])
    if (!empRes.data) return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })
    if (!typeRes.data) return NextResponse.json({ error: 'ประเภทลาไม่ถูกต้อง' }, { status: 400 })

    // Locate existing row
    let existing: Record<string, unknown> | null = null
    if (balanceId) {
        const r = await supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('id', balanceId)
            .maybeSingle()
        existing = r.data ?? null
    }
    if (!existing) {
        const r = await supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('leave_type_id', leaveTypeId)
            .eq('year', year)
            .maybeSingle()
        existing = r.data ?? null
    }

    const actorLabel = await describeActor(actorId, session.name)
    const nowIso = new Date().toISOString()
    const oldTotal = Number(existing?.total_days ?? 0)
    const oldUsed = Number(existing?.used_days ?? 0)
    // Audit line records both fields when used_days was overridden so the
    // history shows the full delta in one entry. Total-only edits stay
    // single-line so the existing format isn't disturbed.
    const auditLine = newUsed !== null
        ? `[${nowIso}] ปรับโดย ${actorLabel}: total ${oldTotal} → ${newTotal}, used ${oldUsed} → ${newUsed} — ${reason}`
        : `[${nowIso}] ปรับโดย ${actorLabel}: ${oldTotal} → ${newTotal} — ${reason}`

    let resultRow: Record<string, unknown> | null = null
    if (existing) {
        const nextNotes = [existing.notes as string | null, auditLine].filter(Boolean).join('\n')
        const { data, error } = await supabaseAdmin
            .from('leave_balances')
            .update({
                total_days: newTotal,
                ...(newUsed !== null ? { used_days: newUsed } : {}),
                is_manually_adjusted: true,
                last_adjusted_by: session.id,
                last_adjusted_at: nowIso,
                notes: nextNotes,
                updated_at: nowIso,
            })
            .eq('id', existing.id as string)
            .select('*')
            .single()
        if (error) {
            console.error('[balances.patch] update error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        resultRow = data
    } else {
        const { data, error } = await supabaseAdmin
            .from('leave_balances')
            .insert({
                employee_id: employeeId,
                leave_type_id: leaveTypeId,
                year,
                total_days: newTotal,
                used_days: newUsed ?? 0,
                pending_days: 0,
                is_manually_adjusted: true,
                last_adjusted_by: session.id,
                last_adjusted_at: nowIso,
                notes: auditLine,
            })
            .select('*')
            .single()
        if (error) {
            console.error('[balances.patch] insert error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        resultRow = data
    }

    return NextResponse.json({
        success: true,
        id: resultRow?.id,
        old_total: oldTotal,
        new_total: newTotal,
    })
}

async function describeActor(employeeId: string, fallback: string): Promise<string> {
    const { data } = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname')
        .eq('id', employeeId)
        .maybeSingle()
    if (!data) return fallback
    const full = `${data.first_name_th ?? ''} ${data.last_name_th ?? ''}`.trim()
    return data.nickname ? `${full} (${data.nickname})` : full || fallback
}
