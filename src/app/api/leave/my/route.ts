import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leave/my
 *
 * Returns the signed-in user's leave requests (all statuses),
 * newest-first, with the approver's display name pre-joined so the
 * UI doesn't need a second round-trip.
 */
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ items: [] })

    const { data: rows, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`
            id, reference_code, leave_type_id, start_date, end_date, total_days,
            is_half_day, half_day_period, reason, contact_during_leave,
            advance_notice_exception_required, advance_notice_exception_reason,
            attachment_url, attachment_name, status,
            approver_id, approved_at, approval_notes, rejection_reason,
            submitted_at, cancelled_at, cancellation_reason, created_at
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Resolve approver display names in one round
    const approverIds = Array.from(new Set((rows ?? [])
        .map(r => r.approver_id as string | null)
        .filter((x): x is string => !!x)))
    const approverMap: Record<string, string> = {}
    if (approverIds.length) {
        const { data: apps } = await supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname')
            .in('id', approverIds)
        for (const a of apps ?? []) {
            const base = `${a.first_name_th ?? ''} ${a.last_name_th ?? ''}`.trim()
            approverMap[a.id as string] = a.nickname
                ? `${base || 'ไม่ระบุ'} (${a.nickname})`
                : base || 'ไม่ระบุ'
        }
    }

    return NextResponse.json({
        items: (rows ?? []).map(r => ({
            ...r,
            approver_name: r.approver_id ? approverMap[r.approver_id as string] ?? null : null,
        })),
    })
}
