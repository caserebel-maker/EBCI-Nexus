import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { listInboxForApprover } from '@/lib/wfh'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wfh/inbox
 * Returns pending WFH requests routed to the signed-in approver.
 *
 * Approver identification: matches `wfh_requests.approver_id` against
 * the session's employee_id (NOT User.id) — same convention as
 * leave inbox / leave-approval.ts.
 */
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ items: [] })

    const items = await listInboxForApprover(employeeId)
    return NextResponse.json({ items })
}
