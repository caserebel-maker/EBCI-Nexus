import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { cancelWfhRequest } from '@/lib/wfh'

export const dynamic = 'force-dynamic'

/**
 * POST /api/wfh/[id]/cancel
 * Body: { reason? }
 *
 * Employee cancels their own request (pending OR approved). Approver
 * re-confirmation NOT required because no leave balance is being
 * refunded — failure mode is just "doesn't show in the calendar".
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 400 })

    let body: { reason?: string | null } = {}
    try { body = await req.json() } catch { /* allow empty body */ }

    const result = await cancelWfhRequest({ id, employeeId, reason: body.reason ?? null })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true })
}
