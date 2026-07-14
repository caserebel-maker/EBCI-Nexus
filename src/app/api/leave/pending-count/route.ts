import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { getDelegateApplicantIdsForApprover } from '@/lib/leave-delegate-approvers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leave/pending-count
 *
 * Cheap count-only variant of /api/leave/inbox used by the sidebar
 * badge. Polled every 60s by the shell so approvers see a fresh
 * number without loading the full inbox payload.
 */
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ count: 0 })

    const approverId = await resolveSessionEmployeeId(session)
    if (!approverId) return NextResponse.json({ count: 0 })

    const ids = new Set<string>()

    // Primary: count on employees.id — matches the inbox pathway.
    const primary = await supabaseAdmin
        .from('leave_requests')
        .select('id')
        .eq('approver_id', approverId)
        .in('status', ['pending', 'cancellation_requested'])
    for (const row of primary.data ?? []) ids.add(row.id as string)

    const delegateApplicantIds = await getDelegateApplicantIdsForApprover(approverId)
    if (delegateApplicantIds.length > 0) {
        const delegated = await supabaseAdmin
            .from('leave_requests')
            .select('id')
            .in('employee_id', delegateApplicantIds)
            .in('status', ['pending', 'cancellation_requested'])
        for (const row of delegated.data ?? []) ids.add(row.id as string)
    }

    // Same fallback as /api/leave/inbox — tolerates legacy rows that
    // stored session.id in approver_id.
    if (ids.size === 0 && session.id && session.id !== approverId) {
        const fallback = await supabaseAdmin
            .from('leave_requests')
            .select('id')
            .eq('approver_id', session.id)
            .in('status', ['pending', 'cancellation_requested'])
        for (const row of fallback.data ?? []) ids.add(row.id as string)
    }

    return NextResponse.json({ count: ids.size })
}
