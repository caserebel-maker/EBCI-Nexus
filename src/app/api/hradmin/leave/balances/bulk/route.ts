import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

export const dynamic = 'force-dynamic'

/**
 * Bulk leave-balance adjustments.
 *
 *   POST /api/hradmin/leave/balances/bulk
 *
 * Body: {
 *   mode:         'preview' | 'apply'
 *   year:         number
 *   leave_type_id: string
 *   action:       'set_total' | 'add_total' | 'reset_used'
 *   value?:       number       // required for set_total / add_total (≥ 0)
 *   reason:       string       // ≥ 10 chars (apply only)
 *   scope:        {
 *     all?:         boolean
 *     departments?: string[]
 *     levels?:      number[]    // approval_level (1..5)
 *     employee_ids?: string[]
 *   }
 * }
 *
 * preview → returns { affected: number, sample: [{ employee_id, ... }] }
 * apply   → upserts every matching balance row, appends an audit line
 *           to notes, then returns { applied, skipped[] }.
 *
 * Examples HR will reach for:
 *   • Year-end rollover: set_total = 10 across all employees, annual leave.
 *   • Add 1 day for everyone in IT: add_total = 1, departments=['IT'].
 *   • Reset used to 0 (new year start): reset_used.
 */

type Action = 'set_total' | 'add_total' | 'reset_used'

interface ScopeInput {
    all?: boolean
    departments?: string[]
    levels?: number[]
    employee_ids?: string[]
}

export async function POST(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'เฉพาะ HR เท่านั้น' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const mode = String(body?.mode ?? '').trim()
    const year = parseInt(String(body?.year ?? ''), 10)
    const leaveTypeId = String(body?.leave_type_id ?? '').trim()
    const action = String(body?.action ?? '').trim() as Action
    const valueRaw = Number(body?.value)
    const reason = String(body?.reason ?? '').trim()
    const scope: ScopeInput = body?.scope ?? {}

    if (!['preview', 'apply'].includes(mode)) {
        return NextResponse.json({ error: "mode ต้องเป็น 'preview' หรือ 'apply'" }, { status: 400 })
    }
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'year ไม่ถูกต้อง' }, { status: 400 })
    }
    if (!leaveTypeId) {
        return NextResponse.json({ error: 'missing leave_type_id' }, { status: 400 })
    }
    if (!['set_total', 'add_total', 'reset_used'].includes(action)) {
        return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }
    const needsValue = action === 'set_total' || action === 'add_total'
    if (needsValue && (!Number.isFinite(valueRaw) || valueRaw < 0)) {
        return NextResponse.json({ error: 'value ต้องเป็นตัวเลขไม่ติดลบ' }, { status: 400 })
    }
    if (mode === 'apply' && reason.length < 10) {
        return NextResponse.json({ error: 'ต้องระบุเหตุผล (อย่างน้อย 10 ตัวอักษร)' }, { status: 400 })
    }

    const value = needsValue ? Math.round(valueRaw * 2) / 2 : 0  // snap 0.5

    // Validate leave_type
    const typeRes = await supabaseAdmin
        .from('leave_types')
        .select('id, name_th')
        .eq('id', leaveTypeId)
        .maybeSingle()
    if (!typeRes.data) {
        return NextResponse.json({ error: 'ประเภทลาไม่ถูกต้อง' }, { status: 400 })
    }

    // Resolve employee pool
    const employees = await resolveScope(scope)
    if (employees.length === 0) {
        return NextResponse.json({
            success: true,
            affected: 0,
            sample: [],
            applied: 0,
            skipped: [],
            note: 'ไม่พบพนักงานที่ตรงกับเงื่อนไข',
        })
    }

    // Pull existing balances for all matched employees
    const empIds = employees.map(e => e.id)
    const { data: existing } = await supabaseAdmin
        .from('leave_balances')
        .select('id, employee_id, leave_type_id, year, total_days, used_days, pending_days')
        .eq('year', year)
        .eq('leave_type_id', leaveTypeId)
        .in('employee_id', empIds)
    const existingMap = new Map((existing ?? []).map(b => [b.employee_id as string, b]))

    // Compute target state per employee
    const plan = employees.map(emp => {
        const cur = existingMap.get(emp.id)
        const oldTotal = Number(cur?.total_days ?? 0)
        const oldUsed = Number(cur?.used_days ?? 0)
        const oldPending = Number(cur?.pending_days ?? 0)
        let newTotal = oldTotal
        let newUsed = oldUsed
        if (action === 'set_total') newTotal = value
        if (action === 'add_total') newTotal = Math.max(0, oldTotal + value)
        if (action === 'reset_used') newUsed = 0
        const changed =
            newTotal !== oldTotal
            || newUsed !== oldUsed
        return {
            employee: emp,
            balance: cur ?? null,
            oldTotal, oldUsed, oldPending,
            newTotal, newUsed,
            newRemaining: Math.max(0, newTotal - newUsed - oldPending),
            changed,
        }
    })

    const dirty = plan.filter(p => p.changed)

    if (mode === 'preview') {
        return NextResponse.json({
            success: true,
            affected: dirty.length,
            unchanged: plan.length - dirty.length,
            sample: dirty.slice(0, 12).map(p => ({
                employee_id: p.employee.id,
                employee_code: p.employee.employee_code,
                name: nameOf(p.employee),
                department: p.employee.department,
                old_total: p.oldTotal,
                new_total: p.newTotal,
                old_used: p.oldUsed,
                new_used: p.newUsed,
                pending: p.oldPending,
                new_remaining: p.newRemaining,
            })),
        })
    }

    // ── apply ────────────────────────────────────────────────────────────
    const actorId = await resolveSessionEmployeeId(auth.session)
    const actorLabel = await describeActor(actorId, auth.session.name)
    const nowIso = new Date().toISOString()
    const actionLabel = action === 'set_total'
        ? `ตั้งยอดรวม = ${value}`
        : action === 'add_total'
            ? `เพิ่มยอดรวม +${value}`
            : 'reset ยอดที่ใช้ = 0'

    const skipped: Array<{ employee_id: string; reason: string }> = []
    let applied = 0

    for (const p of dirty) {
        const audit = `[${nowIso}] ปรับโดย ${actorLabel} (bulk · ${actionLabel}): ${p.oldTotal}/${p.oldUsed} → ${p.newTotal}/${p.newUsed} — ${reason}`
        if (p.balance?.id) {
            const { data: cur } = await supabaseAdmin
                .from('leave_balances')
                .select('notes')
                .eq('id', p.balance.id as string)
                .maybeSingle()
            const nextNotes = [cur?.notes as string | null, audit].filter(Boolean).join('\n')
            const { error } = await supabaseAdmin
                .from('leave_balances')
                .update({
                    total_days: p.newTotal,
                    used_days: p.newUsed,
                    is_manually_adjusted: true,
                    last_adjusted_by: actorId,
                    last_adjusted_at: nowIso,
                    notes: nextNotes,
                    updated_at: nowIso,
                })
                .eq('id', p.balance.id as string)
            if (error) {
                skipped.push({ employee_id: p.employee.id, reason: error.message })
                continue
            }
            applied++
        } else {
            const { error } = await supabaseAdmin
                .from('leave_balances')
                .insert({
                    employee_id: p.employee.id,
                    leave_type_id: leaveTypeId,
                    year,
                    total_days: p.newTotal,
                    used_days: p.newUsed,
                    pending_days: 0,
                    is_manually_adjusted: true,
                    last_adjusted_by: actorId,
                    last_adjusted_at: nowIso,
                    notes: audit,
                })
            if (error) {
                skipped.push({ employee_id: p.employee.id, reason: error.message })
                continue
            }
            applied++
        }
    }

    return NextResponse.json({
        success: true,
        applied,
        skipped,
        unchanged: plan.length - dirty.length,
    })
}

// ─── helpers ───────────────────────────────────────────────────────────────

interface EmployeeLite {
    id: string
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    department: string | null
    approval_level: number | null
}

async function resolveScope(scope: ScopeInput): Promise<EmployeeLite[]> {
    if (scope.employee_ids && scope.employee_ids.length > 0) {
        const { data } = await supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname, department, approval_level')
            .in('id', scope.employee_ids)
            .eq('status', 'active')
        return (data ?? []) as EmployeeLite[]
    }
    let q = supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, department, approval_level')
        .eq('status', 'active')
    if (scope.departments && scope.departments.length > 0) {
        q = q.in('department', scope.departments)
    }
    if (scope.levels && scope.levels.length > 0) {
        q = q.in('approval_level', scope.levels)
    }
    // `all` is implicit when no filters narrow the scope.
    q = q.order('department', { ascending: true, nullsFirst: false })
        .order('nickname',   { ascending: true, nullsFirst: false })
        .limit(5000)
    const { data } = await q
    return (data ?? []) as EmployeeLite[]
}

async function describeActor(actorId: string | null, fallback: string): Promise<string> {
    if (!actorId) return fallback
    const { data } = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname')
        .eq('id', actorId)
        .maybeSingle()
    if (!data) return fallback
    const full = `${data.first_name_th ?? ''} ${data.last_name_th ?? ''}`.trim()
    return data.nickname ? `${full} (${data.nickname})` : full || fallback
}

function nameOf(emp: EmployeeLite): string {
    const full = `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim()
    return emp.nickname ? `${full} (${emp.nickname})` : full
}
