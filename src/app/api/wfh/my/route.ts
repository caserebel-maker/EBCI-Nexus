import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { listMyWfhRequests } from '@/lib/wfh'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wfh/my
 * Returns the signed-in employee's WFH requests (any status, newest first).
 */
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ items: [] })

    const items = await listMyWfhRequests(employeeId)
    return NextResponse.json({ items })
}
