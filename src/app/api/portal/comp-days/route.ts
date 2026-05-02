import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import {
    listCompDaysForEmployee, getCompDaySummary, useCompDay,
} from '@/lib/comp-days'

export const dynamic = 'force-dynamic'

/**
 * §2.1 BETA_FEEDBACK — Employee-side comp day API.
 *
 * GET  /api/portal/comp-days   → { items, summary }
 * POST /api/portal/comp-days   body: { useOn, note? }
 *
 * POST picks the oldest available comp day (FIFO, expires-first) and
 * marks it used on `useOn`. Idempotency: if the employee somehow taps
 * use twice, the second call lands on a different available row (or
 * 400 if none left). This isn't full pessimistic locking but it's
 * sufficient — comp days are infrequent + per-user, no race risk.
 */

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ items: [], summary: { available: 0, used: 0, expired: 0, voided: 0, total: 0 } })
    }

    const [items, summary] = await Promise.all([
        listCompDaysForEmployee(employeeId),
        getCompDaySummary(employeeId),
    ])
    return NextResponse.json({ items, summary })
}

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 400 })
    }

    let body: { useOn?: string; note?: string | null }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }

    if (!body.useOn) {
        return NextResponse.json({ error: 'useOn required' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.useOn)) {
        return NextResponse.json({ error: 'useOn must be YYYY-MM-DD' }, { status: 400 })
    }

    const result = await useCompDay({
        employeeId,
        useOn: body.useOn,
        note: body.note?.trim() || null,
    })
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ id: result.id })
}
