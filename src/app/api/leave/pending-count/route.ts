import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

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

    // Primary: count on employees.id — matches the inbox pathway.
    const primary = await supabaseAdmin
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('approver_id', approverId)
        .eq('status', 'pending')
    let count = primary.count ?? 0

    // Same fallback as /api/leave/inbox — tolerates legacy rows that
    // stored session.id in approver_id.
    if (count === 0 && session.id && session.id !== approverId) {
        const fallback = await supabaseAdmin
            .from('leave_requests')
            .select('id', { count: 'exact', head: true })
            .eq('approver_id', session.id)
            .eq('status', 'pending')
        if ((fallback.count ?? 0) > 0) count = fallback.count ?? 0
    }

    return NextResponse.json({ count })
}
