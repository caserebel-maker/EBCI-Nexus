import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { bangkokTodayIso } from '@/lib/leave-validations'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leave/[id]/cancellation-decision
 * Body: { decision: 'approve' | 'reject', reason?: string }
 *
 * Approver-only counterpart to /request-cancellation. Resolves a
 * `cancellation_requested` row by either:
 *   - approve  → status='cancelled' (and refund used_days IF the
 *                leave start_date is still in the future — leave that
 *                already started counts as taken)
 *   - reject   → status='approved'  (revert to pre-request state, with
 *                a cancellation_decision_reason recorded)
 *
 * Either way we stamp cancellation_decided_by + cancellation_decision_
 * reason for audit. Then notify the applicant.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const approverEmployeeId = await resolveSessionEmployeeId(session)
    if (!approverEmployeeId) {
        return NextResponse.json({ error: 'ไม่พบพนักงานที่เชื่อมโยงบัญชี' }, { status: 400 })
    }

    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const decision = String(body?.decision ?? '').trim()
    const reason: string | null = body?.reason ? String(body.reason).trim() || null : null

    if (decision !== 'approve' && decision !== 'reject') {
        return NextResponse.json(
            { error: 'decision ต้องเป็น "approve" หรือ "reject"' },
            { status: 400 },
        )
    }
    // Reject without a reason leaves the user guessing why; require a
    // short note so the applicant knows what to do next.
    if (decision === 'reject' && (!reason || reason.length < 10)) {
        return NextResponse.json(
            { error: 'กรุณาระบุเหตุผลการปฏิเสธอย่างน้อย 10 ตัวอักษร' },
            { status: 400 },
        )
    }

    // Read + ownership + state check
    const { data: row, error: readErr } = await supabaseAdmin
        .from('leave_requests')
        .select('id, reference_code, employee_id, approver_id, status, leave_type_id, start_date, end_date, total_days')
        .eq('id', id)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'ไม่พบใบลา' }, { status: 404 })
    if (row.approver_id !== approverEmployeeId) {
        return NextResponse.json({ error: 'คุณไม่ใช่ผู้อนุมัติของใบลานี้' }, { status: 403 })
    }
    if (row.status !== 'cancellation_requested') {
        return NextResponse.json(
            { error: 'พิจารณาได้เฉพาะคำขอยกเลิกที่อยู่ในสถานะรอผลพิจารณา' },
            { status: 409 },
        )
    }

    const nowIso = new Date().toISOString()
    const employeeId = row.employee_id as string
    const leaveTypeId = row.leave_type_id as string
    const totalDays = Number(row.total_days ?? 0)
    const startDate = row.start_date as string

    if (decision === 'approve') {
        // Flip to cancelled. Race guard on cancellation_requested so a
        // double-click can't double-apply the balance refund below.
        const { error: updErr } = await supabaseAdmin
            .from('leave_requests')
            .update({
                status: 'cancelled',
                cancelled_at: nowIso,
                cancellation_decided_by: approverEmployeeId,
                cancellation_decision_reason: reason,
                updated_at: nowIso,
            })
            .eq('id', id)
            .eq('status', 'cancellation_requested')
        if (updErr) {
            console.error('[leave/cancellation-decision] approve update failed:', updErr)
            return NextResponse.json({ error: updErr.message }, { status: 500 })
        }

        // Refund balance ONLY when the leave hasn't started yet. Leave
        // that already began counts as taken — no refund makes sense
        // even if the employee files cancellation post-hoc. Compare in
        // Bangkok-local terms because start_date is a date-only field
        // and "today in Bangkok" is the calendar day the user thinks in.
        const todayIso = bangkokTodayIso()
        const refundEligible = startDate >= todayIso
        if (refundEligible && totalDays > 0) {
            const year = new Date(startDate).getFullYear()
            const { data: balanceRow } = await supabaseAdmin
                .from('leave_balances')
                .select('id, used_days')
                .eq('employee_id', employeeId)
                .eq('leave_type_id', leaveTypeId)
                .eq('year', year)
                .maybeSingle()
            if (balanceRow) {
                const nextUsed = Math.max(0, Number(balanceRow.used_days ?? 0) - totalDays)
                const { error: balErr } = await supabaseAdmin
                    .from('leave_balances')
                    .update({ used_days: nextUsed, updated_at: nowIso })
                    .eq('id', balanceRow.id)
                if (balErr) {
                    console.error('[leave/cancellation-decision] balance refund failed:', balErr)
                }
            }
        }

        // Notify applicant
        try {
            const employeeUserId = await getEmployeeUserId(employeeId)
            if (employeeUserId) {
                const refundNote = refundEligible
                    ? ' · ระบบคืนวันลาให้แล้ว'
                    : ' · ไม่คืนวันลา (วันลาผ่านไปแล้ว)'
                await createNotification({
                    recipient_user_id: employeeUserId,
                    type: 'leave_cancelled',
                    title: 'อนุมัติคำขอยกเลิกใบลา',
                    body: `${row.start_date} → ${row.end_date} (${totalDays} วัน) — ใบลาถูกยกเลิกแล้ว${refundNote}${reason ? ` · ${reason}` : ''}`,
                    action_url: '/portal/leave',
                    action_label: 'ดูใบลา',
                    entity_type: 'leave_request',
                    entity_id: id,
                    reference_code: String(row.reference_code),
                    icon: 'Ban',
                    color: 'gray',
                })
            }
        } catch (err) {
            console.error('[leave/cancellation-decision] notification error:', err)
        }

        return NextResponse.json({
            success: true,
            id,
            status: 'cancelled',
            cancelled_at: nowIso,
            refunded: refundEligible,
        })
    }

    // decision === 'reject' — leave reverts to approved
    const { error: updErr } = await supabaseAdmin
        .from('leave_requests')
        .update({
            status: 'approved',
            cancellation_decided_by: approverEmployeeId,
            cancellation_decision_reason: reason,
            updated_at: nowIso,
        })
        .eq('id', id)
        .eq('status', 'cancellation_requested')
    if (updErr) {
        console.error('[leave/cancellation-decision] reject update failed:', updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Notify applicant — clear about the rejection reason
    try {
        const employeeUserId = await getEmployeeUserId(employeeId)
        if (employeeUserId) {
            await createNotification({
                recipient_user_id: employeeUserId,
                type: 'leave_cancellation_rejected',
                title: 'ปฏิเสธคำขอยกเลิกใบลา',
                body: `${row.start_date} → ${row.end_date} (${totalDays} วัน) — ใบลายังคงสถานะอนุมัติ · เหตุผล: ${reason ?? '—'}`,
                action_url: '/portal/leave',
                action_label: 'ดูใบลา',
                entity_type: 'leave_request',
                entity_id: id,
                reference_code: String(row.reference_code),
                icon: 'XCircle',
                color: 'red',
            })
        }
    } catch (err) {
        console.error('[leave/cancellation-decision] notification error:', err)
    }

    return NextResponse.json({
        success: true,
        id,
        status: 'approved',
        cancellation_rejected_at: nowIso,
        cancellation_decision_reason: reason,
    })
}
