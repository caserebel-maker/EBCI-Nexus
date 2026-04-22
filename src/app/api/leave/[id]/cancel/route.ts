import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { adjustPendingDays } from '@/lib/leave-balance'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leave/[id]/cancel
 * Body (optional JSON): { reason?: string }
 *
 * Employee-initiated cancel. Only allowed when status='pending' and
 * the caller owns the request. Reverses the pending_days reservation
 * made at submit time.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ error: 'ไม่พบพนักงานที่เชื่อมโยงบัญชี' }, { status: 400 })
    }

    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const reason: string | null = body?.reason ? String(body.reason).trim() : null

    // Ownership + state check
    const { data: row, error: readErr } = await supabaseAdmin
        .from('leave_requests')
        .select('id, employee_id, status, leave_type_id, total_days, start_date')
        .eq('id', id)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'ไม่พบใบลา' }, { status: 404 })
    if (row.employee_id !== employeeId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ยกเลิกใบลานี้' }, { status: 403 })
    }
    if (row.status !== 'pending') {
        return NextResponse.json(
            { error: 'ยกเลิกได้เฉพาะใบลาที่อยู่ในสถานะรออนุมัติ' },
            { status: 409 },
        )
    }

    const nowIso = new Date().toISOString()
    const { error: updErr } = await supabaseAdmin
        .from('leave_requests')
        .update({
            status: 'cancelled',
            cancelled_at: nowIso,
            cancellation_reason: reason,
            updated_at: nowIso,
        })
        .eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Release the pending reservation on the balance row
    const year = new Date(row.start_date as string).getFullYear()
    const balanceRes = await adjustPendingDays({
        employeeId,
        leaveTypeId: row.leave_type_id as string,
        year,
        delta: -Number(row.total_days ?? 0),
    })
    if (!balanceRes.ok) {
        console.error('[leave/cancel] balance rollback failed:', balanceRes.error)
        // Row is cancelled already; pending rollback is best-effort.
    }

    return NextResponse.json({ success: true, id, cancelled_at: nowIso })
}
