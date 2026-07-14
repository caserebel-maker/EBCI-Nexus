import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { bangkokTodayIso } from '@/lib/leave-validations'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'
import { canActOnLeaveRequest, getDelegateApproverIdsForApplicant } from '@/lib/leave-delegate-approvers'
import { findHrNotifyTargets } from '@/lib/hr-notify'
import { sendApprovedLeaveCancellationNotice } from '@/lib/email-leave'
import { formatEmployeeName } from '@/lib/format-employee-name'

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
        .select('id, reference_code, employee_id, approver_id, status, leave_type_id, start_date, end_date, total_days, reason, cancellation_reason')
        .eq('id', id)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'ไม่พบใบลา' }, { status: 404 })
    const canAct = await canActOnLeaveRequest({
        approverEmployeeId,
        applicantEmployeeId: row.employee_id as string,
        primaryApproverId: row.approver_id as string | null,
    })
    if (!canAct) {
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
            const refundNote = refundEligible
                ? ' · ระบบคืนวันลาให้แล้ว'
                : ' · ไม่คืนวันลา (วันลาผ่านไปแล้ว)'
            if (employeeUserId) {
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

            const delegateApproverIds = await getDelegateApproverIdsForApplicant(employeeId)
            const approverIds = Array.from(new Set([
                row.approver_id as string | null,
                approverEmployeeId,
                ...delegateApproverIds,
            ].filter(Boolean) as string[]))

            const [
                { data: employee },
                { data: leaveType },
                { data: approverRows },
                hrTargets,
            ] = await Promise.all([
                supabaseAdmin
                    .from('employees')
                    .select('id, user_id, email, first_name_th, last_name_th, nickname')
                    .eq('id', employeeId)
                    .maybeSingle(),
                supabaseAdmin
                    .from('leave_types')
                    .select('name_th, name')
                    .eq('id', leaveTypeId)
                    .maybeSingle(),
                approverIds.length
                    ? supabaseAdmin
                        .from('employees')
                        .select('id, user_id, email, first_name_th, last_name_th, nickname')
                        .in('id', approverIds)
                    : Promise.resolve({ data: [] }),
                findHrNotifyTargets(),
            ])

            const employeeName = formatEmployeeName(employee, 'พนักงาน')
            const leaveTypeName = String(leaveType?.name_th ?? leaveType?.name ?? 'ลา')
            const primaryApprover = (approverRows ?? []).find((emp: { id: string }) => emp.id === row.approver_id) ?? null
            const decider = (approverRows ?? []).find((emp: { id: string }) => emp.id === approverEmployeeId) ?? null
            const primaryApproverName = primaryApprover ? formatEmployeeName(primaryApprover) : null
            const deciderName = formatEmployeeName(decider, 'ผู้อนุมัติ')
            const dateText = row.start_date === row.end_date ? row.start_date : `${row.start_date} → ${row.end_date}`
            const noticeBody = `${employeeName} · ${leaveTypeName} ${dateText} (${totalDays} วัน) — ใบลาถูกยกเลิกแล้ว${refundNote}`
            const notifiedUsers = new Set<string>(employeeUserId ? [employeeUserId] : [])
            const emailRecipients = new Set<string>()
            const employeeEmail = typeof employee?.email === 'string' ? employee.email.trim() : ''

            for (const approver of approverRows ?? []) {
                const userId = typeof approver.user_id === 'string' ? approver.user_id : null
                const email = typeof approver.email === 'string' ? approver.email.trim() : ''
                if (userId && !notifiedUsers.has(userId)) {
                    notifiedUsers.add(userId)
                    await createNotification({
                        recipient_user_id: userId,
                        type: 'leave_cancelled',
                        title: 'ใบลาที่เคยอนุมัติถูกยกเลิกแล้ว',
                        body: noticeBody,
                        action_url: '/portal/leave/inbox',
                        action_label: 'ดูกล่องอนุมัติ',
                        entity_type: 'leave_request',
                        entity_id: id,
                        reference_code: String(row.reference_code),
                        icon: 'Ban',
                        color: 'amber',
                    })
                }
                if (email && email !== employeeEmail) emailRecipients.add(email)
            }

            for (const hr of hrTargets) {
                const userId = hr.userId
                const email = hr.email?.trim()
                if (userId && !notifiedUsers.has(userId)) {
                    notifiedUsers.add(userId)
                    await createNotification({
                        recipient_user_id: userId,
                        type: 'leave_cancelled',
                        title: `[FYI] ${employeeName} ยกเลิกใบลาแล้ว`,
                        body: noticeBody,
                        action_url: '/hradmin/leave?tab=requests',
                        action_label: 'ดูรายการลา',
                        entity_type: 'leave_request',
                        entity_id: id,
                        reference_code: String(row.reference_code),
                        icon: 'Ban',
                        color: 'amber',
                    })
                }
                if (email && email !== employeeEmail) emailRecipients.add(email)
            }

            await sendApprovedLeaveCancellationNotice({
                recipients: Array.from(emailRecipients),
                referenceCode: String(row.reference_code),
                employeeName,
                employeeEmail: employeeEmail || '',
                approverName: primaryApproverName,
                approverEmail: typeof primaryApprover?.email === 'string' ? primaryApprover.email : null,
                leaveTypeTh: leaveTypeName,
                startDate: row.start_date as string,
                endDate: row.end_date as string,
                totalDays,
                reason: String(row.reason ?? ''),
                cancellationApprovedByName: deciderName,
                cancellationReason: reason ?? (row.cancellation_reason as string | null) ?? null,
                refunded: refundEligible,
            })
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
