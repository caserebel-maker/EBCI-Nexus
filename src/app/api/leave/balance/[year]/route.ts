import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
    fetchActiveLeaveTypes,
    fetchBalancesForEmployee,
    computeRemaining,
    leaveTypeVisibleForGender,
    normalizeGender,
} from '@/lib/leave-balance'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leave/balance/[year]
 *
 * Returns one entry per active leave_type with the signed-in user's
 * quota for `year`. Types with no balance row yet come back with
 * total=0 so the UI can show them (card stays visible even if HR
 * hasn't granted a quota — e.g. annual for new hires).
 */
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ year: string }> },
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ balances: [] })

    const { year: yearParam } = await context.params
    const year = parseInt(yearParam, 10)
    if (!Number.isFinite(year)) {
        return NextResponse.json({ error: 'ปีไม่ถูกต้อง' }, { status: 400 })
    }

    const [types, yearBalances, employeeRow] = await Promise.all([
        fetchActiveLeaveTypes(),
        fetchBalancesForEmployee(employeeId, year),
        supabaseAdmin
            .from('employees')
            .select('gender')
            .eq('id', employeeId)
            .maybeSingle(),
    ])

    // Lifetime types (อุปสมบท, สมรส, เกณฑ์ทหาร) live at the employee's
    // start_date year — querying year=2026 wouldn't see a row pinned to
    // 2021. Fetch them separately, year-agnostic, and let them override
    // any (unlikely) yearly row of the same type.
    const lifetimeTypeIds = types.filter(t => t.is_lifetime).map(t => t.id)
    const lifetimeBalancesRes = lifetimeTypeIds.length > 0
        ? await supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .in('leave_type_id', lifetimeTypeIds)
        : { data: [] }

    // Filter out gender-restricted types so a male employee never sees
    // ลาคลอด in the dropdown, and a female employee never sees
    // ลาเกณฑ์ทหาร / ลาอุปสมบท. Unknown gender → show everything (we'd
    // rather an HR fix than block the user).
    const employeeGender = normalizeGender(employeeRow.data?.gender ?? null)
    const visibleTypes = types.filter(t => leaveTypeVisibleForGender(t, employeeGender))

    const balanceByType = new Map(yearBalances.map(b => [b.leave_type_id, b]))
    // Lifetime overrides — use the start-year row regardless of `year` param.
    for (const b of (lifetimeBalancesRes.data ?? [])) {
        balanceByType.set(b.leave_type_id as string, b as typeof yearBalances[number])
    }
    const enriched = visibleTypes.map(t => {
        const row = balanceByType.get(t.id) ?? null
        const total = Number(row?.total_days ?? 0)
        const used = Number(row?.used_days ?? 0)
        const pending = Number(row?.pending_days ?? 0)
        return {
            leave_type_id: t.id,
            name_th: t.name_th,
            name_en: t.name_en,
            icon: t.icon,
            color: t.color,
            is_unlimited: !!t.is_unlimited,
            is_lifetime: !!t.is_lifetime,
            requires_attachment: !!t.requires_attachment,
            attachment_description: t.attachment_description,
            advance_notice_days: t.advance_notice_days ?? 0,
            same_day_allowed: t.same_day_allowed !== false,
            display_order: t.display_order ?? 99,
            total_days: total,
            used_days: used,
            pending_days: pending,
            remaining_days: computeRemaining(row),
        }
    })

    return NextResponse.json({
        year,
        balances: enriched,
        computed_at: new Date().toISOString(),
    })
}
