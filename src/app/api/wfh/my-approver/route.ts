import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { resolveLeaveApprover, displayApproverName } from '@/lib/leave-approval'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wfh/my-approver
 *
 * Read-only preview of WHO will receive the WFH request when the user
 * hits submit. Mirrors wfh.ts::submitWfhRequest exactly so the form
 * shows the same approver the request will actually route to (no
 * surprises after submit).
 *
 * Returns:
 *   { approver: { id, name } } when wired,
 *   { approver: null, error: 'no_approver' } when the chain is broken
 *     and the form should warn the user / disable submit.
 */
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ approver: null, error: 'no_employee_link' })
    }

    const approver = await resolveLeaveApprover(employeeId)
    if (!approver) {
        return NextResponse.json({ approver: null, error: 'no_approver' })
    }
    return NextResponse.json({
        approver: { id: approver.id, name: displayApproverName(approver) },
    })
}
