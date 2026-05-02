import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { submitWfhRequest } from '@/lib/wfh'

export const dynamic = 'force-dynamic'

/**
 * POST /api/wfh/submit
 * Body: { startDate, endDate, reason, contactDuringWfh? }
 *
 * Employee submits a WFH request. Routes to the same approver chain
 * as their leave requests (resolveLeaveApprover) so HR doesn't have
 * to maintain a parallel routing table.
 */
export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 400 })

    let body: {
        startDate?: string
        endDate?: string
        reason?: string
        contactDuringWfh?: string | null
    }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const result = await submitWfhRequest({
        employeeId,
        startDate: body.startDate ?? '',
        endDate: body.endDate ?? '',
        reason: body.reason ?? '',
        contactDuringWfh: body.contactDuringWfh ?? null,
    })
    if ('error' in result) {
        return NextResponse.json({ error: result.error, field: result.field }, { status: 400 })
    }
    return NextResponse.json(result)
}
