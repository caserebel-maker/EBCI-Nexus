import { NextRequest, NextResponse } from 'next/server'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import {
    grantCompDay, listAllCompDays, voidCompDay,
} from '@/lib/comp-days'
import type { CompDayStatus } from '@/lib/comp-days-shared'

export const dynamic = 'force-dynamic'

/**
 * §2.1 BETA_FEEDBACK — HR-side comp day API.
 *
 * GET    /api/hradmin/comp-days?employee_id=...&status=available
 * POST   /api/hradmin/comp-days  body: { employeeId, workedOn, earnedReason?, expiresAt? }
 * DELETE /api/hradmin/comp-days?id=...&reason=...    (= void, not hard delete)
 *
 * `granted_by` and `voided_by` columns store User.id (auth UUID), so
 * we pass `auth.session.id` not a derived employees.id — same gotcha
 * that bit `leave_balances.last_adjusted_by` (commit a27c3b1).
 */

const VALID_STATUSES: CompDayStatus[] = ['available', 'used', 'expired', 'voided']

export async function GET(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(req.url)
    const employeeId = url.searchParams.get('employee_id')
    const statusParam = url.searchParams.get('status')
    const status = statusParam && (VALID_STATUSES as string[]).includes(statusParam)
        ? (statusParam as CompDayStatus)
        : 'all'
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 500, 1), 2000) : 500

    const items = await listAllCompDays({
        employeeId: employeeId || null,
        status,
        limit,
    })
    return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let body: {
        employeeId?: string
        workedOn?: string
        earnedReason?: string | null
        expiresAt?: string | null
    }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }

    if (!body.employeeId || !body.workedOn) {
        return NextResponse.json({ error: 'employeeId + workedOn required' }, { status: 400 })
    }
    // Cheap shape check on dates so a typo doesn't land a "2026/05/02"
    // string in the DB and silently break .order() comparisons later.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.workedOn)) {
        return NextResponse.json({ error: 'workedOn must be YYYY-MM-DD' }, { status: 400 })
    }
    if (body.expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(body.expiresAt)) {
        return NextResponse.json({ error: 'expiresAt must be YYYY-MM-DD' }, { status: 400 })
    }

    const result = await grantCompDay({
        employeeId: body.employeeId,
        workedOn: body.workedOn,
        earnedReason: body.earnedReason?.trim() || null,
        expiresAt: body.expiresAt || null,
        grantedByUserId: auth.session.id,
    })
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ id: result.id })
}

export async function DELETE(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    const reason = url.searchParams.get('reason')?.trim() || null

    const result = await voidCompDay({
        id,
        voidedByUserId: auth.session.id,
        reason,
    })
    if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true })
}
