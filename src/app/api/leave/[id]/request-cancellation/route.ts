import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leave/[id]/request-cancellation
 * Body (optional JSON): { reason?: string }
 *
 * Employee-initiated cancellation request for an APPROVED leave. The
 * pending → cancel direct path lives in /cancel; this endpoint is the
 * two-step "ขอยกเลิกใบลาที่อนุมัติแล้ว" flow that needs the approver's
 * sign-off before the row flips to 'cancelled'.
 *
 * Flow: status='approved' → status='cancellation_requested', store
 * the reason on the existing cancellation_reason column, set
 * cancellation_requested_at=now. Notify the approver. Balance is
 * NOT refunded yet — that happens at /cancellation-decision when
 * the approver actually approves.
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
    const reason: string | null = body?.reason ? String(body.reason).trim() || null : null

    // Read + ownership + state check
    const { data: row, error: readErr } = await supabaseAdmin
        .from('leave_requests')
        .select('id, reference_code, employee_id, approver_id, status, leave_type_id, start_date, end_date, total_days')
        .eq('id', id)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'ไม่พบใบลา' }, { status: 404 })
    if (row.employee_id !== employeeId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ขอยกเลิกใบลานี้' }, { status: 403 })
    }
    if (row.status !== 'approved') {
        return NextResponse.json(
            { error: 'ขอยกเลิกได้เฉพาะใบลาที่อนุมัติแล้ว — ใบลาที่ยังรออนุมัติให้ใช้ปุ่ม "ยกเลิก" แทน' },
            { status: 409 },
        )
    }

    const nowIso = new Date().toISOString()
    const { error: updErr } = await supabaseAdmin
        .from('leave_requests')
        .update({
            status: 'cancellation_requested',
            cancellation_requested_at: nowIso,
            cancellation_reason: reason,
            updated_at: nowIso,
        })
        .eq('id', id)
        .eq('status', 'approved') // race guard
    if (updErr) {
        console.error('[leave/request-cancellation] update error:', updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Notify the approver. Best-effort — same pattern as submit/approve.
    try {
        const approverEmployeeId = row.approver_id as string | null
        if (approverEmployeeId) {
            const approverUserId = await getEmployeeUserId(approverEmployeeId)
            if (approverUserId) {
                const [empResult, typeResult] = await Promise.all([
                    supabaseAdmin
                        .from('employees')
                        .select('first_name_th, last_name_th, nickname')
                        .eq('id', employeeId)
                        .maybeSingle(),
                    supabaseAdmin
                        .from('leave_types')
                        .select('name_th')
                        .eq('id', row.leave_type_id)
                        .maybeSingle(),
                ])
                const emp = empResult.data
                const applicantName =
                    `${emp?.first_name_th ?? ''} ${emp?.last_name_th ?? ''}`.trim()
                    + (emp?.nickname ? ` (${emp.nickname})` : '')
                const leaveType = typeResult.data?.name_th ?? 'ลา'
                await createNotification({
                    recipient_user_id: approverUserId,
                    type: 'leave_cancellation_requested',
                    title: `${applicantName || 'พนักงาน'} ขอยกเลิกใบลา ${leaveType}`,
                    body: `${row.start_date} → ${row.end_date} (${row.total_days} วัน)${reason ? ` — ${reason}` : ''}`,
                    action_url: '/portal/leave/inbox',
                    action_label: 'ดูใบลา',
                    entity_type: 'leave_request',
                    entity_id: id,
                    reference_code: String(row.reference_code),
                    icon: 'Ban',
                    color: 'amber',
                    sender_name: applicantName || null,
                })
            }
        }
    } catch (err) {
        console.error('[leave/request-cancellation] notification error:', err)
    }

    return NextResponse.json({
        success: true,
        id,
        status: 'cancellation_requested',
        cancellation_requested_at: nowIso,
    })
}
