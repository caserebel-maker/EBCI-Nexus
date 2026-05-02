import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { decideWfhRequest } from '@/lib/wfh'

export const dynamic = 'force-dynamic'

/**
 * POST /api/wfh/[id]/decision
 * Body: { decision: 'approve' | 'reject', note? }
 *
 * Approver acts on a pending WFH request. Identity is verified inside
 * decideWfhRequest() by matching the session's employee_id against the
 * request's approver_id — no caller can decide on someone else's
 * routing.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const approverEmployeeId = await resolveSessionEmployeeId(session)
    if (!approverEmployeeId) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 400 })

    let body: { decision?: string; note?: string | null }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }
    if (body.decision !== 'approve' && body.decision !== 'reject') {
        return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 })
    }

    const result = await decideWfhRequest({
        id,
        approverEmployeeId,
        decision: body.decision,
        note: body.note ?? null,
    })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true })
}
