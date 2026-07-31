import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { adjustPendingDays } from '@/lib/leave-balance'
import { sendLeaveApproved } from '@/lib/email-leave'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'
import { findHrNotifyTargets } from '@/lib/hr-notify'
import { sendTelegram, escapeTelegramHtml } from '@/lib/telegram'
import { canActOnLeaveRequest } from '@/lib/leave-delegate-approvers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leave/[id]/approve
 * Body (optional): { notes?: string }
 *
 * Employee/manager approval path. Enforces the normal chain:
 *   - caller is signed in AND is the assigned approver / delegated approver
 *   - row is currently `pending` (409 otherwise — stale click)
 *
 * HR override actions intentionally use /api/hradmin/leave/force-action
 * so the employee-mode path and admin-mode path stay clearly separate.
 * This route only handles the standard approval chain.
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
    const notes: string | null = body?.notes ? String(body.notes).trim() || null : null

    // Read + ownership + state check
    const { data: row, error: readErr } = await supabaseAdmin
        .from('leave_requests')
        .select(`
            id, reference_code, status, employee_id, approver_id,
            leave_type_id, start_date, end_date, total_days, reason
        `)
        .eq('id', id)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'ไม่พบใบลา' }, { status: 404 })

    const canAct = await canActOnLeaveRequest({
        approverEmployeeId,
        applicantEmployeeId: row.employee_id as string,
        primaryApproverId: row.approver_id as string | null,
        isHr: isHrStaff(auth),
    })
    if (!canAct) {
        return NextResponse.json(
            { error: 'คุณไม่ใช่ผู้อนุมัติของใบลานี้' },
            { status: 403 },
        )
    }
    if (row.status !== 'pending') {
        return NextResponse.json(
            { error: 'อนุมัติได้เฉพาะใบลาที่อยู่ในสถานะรออนุมัติ' },
            { status: 409 },
        )
    }

    // Flip status
    const nowIso = new Date().toISOString()
    const { error: updErr } = await supabaseAdmin
        .from('leave_requests')
        .update({
            status: 'approved',
            approved_at: nowIso,
            approval_notes: notes,
            updated_at: nowIso,
        })
        .eq('id', id)
        .eq('status', 'pending') // guard against double-apply
    if (updErr) {
        console.error('[leave/approve] update error:', updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Balance move: pending → used. Two separate adjustments because the
    // balance helper only mutates one delta at a time; both write the
    // same row so the net state is correct.
    const year = new Date(row.start_date as string).getFullYear()
    const totalDays = Number(row.total_days ?? 0)
    const employeeId = row.employee_id as string
    const leaveTypeId = row.leave_type_id as string

    const pendingAdjust = await adjustPendingDays({
        employeeId, leaveTypeId, year, delta: -totalDays,
    })
    if (!pendingAdjust.ok) {
        console.error('[leave/approve] pending rollback failed:', pendingAdjust.error)
    }

    // used_days += totalDays (direct update since we don't have a shared
    // helper and the row just had pending_days zeroed above)
    if (pendingAdjust.ok) {
        const nextUsed = Number(pendingAdjust.row.used_days) + totalDays
        const { error: usedErr } = await supabaseAdmin
            .from('leave_balances')
            .update({
                used_days: nextUsed,
                updated_at: nowIso,
            })
            .eq('id', pendingAdjust.row.id)
        if (usedErr) {
            console.error('[leave/approve] used_days update failed:', usedErr)
        }
    }

    // Fetch applicant + approver details for the email
    const [applicantResult, approverResult, typeResult] = await Promise.all([
        supabaseAdmin
            .from('employees')
            .select('first_name_th, last_name_th, nickname, email')
            .eq('id', employeeId)
            .maybeSingle(),
        supabaseAdmin
            .from('employees')
            .select('first_name_th, last_name_th, nickname, email, position')
            .eq('id', approverEmployeeId)
            .maybeSingle(),
        supabaseAdmin
            .from('leave_types')
            .select('name_th')
            .eq('id', leaveTypeId)
            .maybeSingle(),
    ])

    const applicant = applicantResult.data
    const approver = approverResult.data
    const leaveTypeTh = typeResult.data?.name_th as string | undefined

    const employeeEmail = (applicant?.email as string | null)?.trim()
    let emailSent = false
    if (employeeEmail && employeeEmail.includes('@')) {
        const applicantName = `${applicant?.first_name_th ?? ''} ${applicant?.last_name_th ?? ''}`.trim()
            + (applicant?.nickname ? ` (${applicant.nickname})` : '')
        const approverName = `${approver?.first_name_th ?? ''} ${approver?.last_name_th ?? ''}`.trim()
            + (approver?.nickname ? ` (${approver.nickname})` : '')
        try {
            const result = await sendLeaveApproved({
                referenceCode: String(row.reference_code),
                employeeName: applicantName || (applicant?.nickname ?? ''),
                employeeEmail,
                approverName: approverName || null,
                approverEmail: (approver?.email as string | null) ?? null,
                leaveTypeTh: leaveTypeTh ?? leaveTypeId,
                startDate: row.start_date as string,
                endDate: row.end_date as string,
                totalDays,
                reason: String(row.reason ?? ''),
                approvalNotes: notes,
            })
            emailSent = Boolean(result && 'success' in result && result.success)
            if (!emailSent) {
                console.error('[leave/approve] email non-success:', result)
            }
        } catch (err) {
            console.error('[leave/approve] email threw:', err)
        }
    }

    // In-app notification for the applicant (best-effort)
    try {
        const employeeUserId = await getEmployeeUserId(employeeId)
        if (employeeUserId) {
            const approverNick = (approver?.nickname as string | null)
                ?? `${approver?.first_name_th ?? ''} ${approver?.last_name_th ?? ''}`.trim()
                ?? null
            await createNotification({
                recipient_user_id: employeeUserId,
                type: 'leave_approved',
                title: 'ใบลาของคุณได้รับการอนุมัติ',
                body: `${leaveTypeTh ?? leaveTypeId} ${row.start_date} → ${row.end_date} (${totalDays} วัน)${notes ? ` — ${notes}` : ''}`,
                action_url: '/portal/leave',
                action_label: 'ดูใบลา',
                entity_type: 'leave_request',
                entity_id: id,
                reference_code: String(row.reference_code),
                icon: 'CheckCircle',
                color: 'green',
                sender_name: approverNick || null,
            })
        }
    } catch (err) {
        console.error('[leave/approve] notification error:', err)
    }

    // HR Telegram FYI only after the approver decides. Pending leave
    // requests stay out of HR Telegram to avoid noise from wrong/cancelled
    // submissions.
    try {
        const hrTargets = await findHrNotifyTargets()
        const dateLabel = row.start_date === row.end_date
            ? row.start_date as string
            : `${row.start_date as string} → ${row.end_date as string}`
        const applicantName = `${applicant?.first_name_th ?? ''} ${applicant?.last_name_th ?? ''}`.trim()
            || (applicant?.nickname as string | null)
            || 'พนักงาน'
        const approverFirstName = (approver?.first_name_th as string | null)?.trim() || ''
        const approverName = approverFirstName || (approver?.nickname as string | null) || 'ผู้อนุมัติ'
        const approverFormalName = [
            (approver?.position as string | null)?.trim(),
            approverName,
            approver?.nickname && approver.nickname !== approverName ? `(${approver.nickname})` : '',
        ].filter(Boolean).join(' ')

        for (const t of hrTargets) {
            if (!t.telegramChatId) continue
            const text = [
                `✅ <b>ใบลาได้รับการอนุมัติ</b>`,
                `👤 ${escapeTelegramHtml(applicantName)}`,
                `🌴 ${escapeTelegramHtml(leaveTypeTh ?? leaveTypeId)}`,
                `📅 ${escapeTelegramHtml(dateLabel)} (${totalDays} วัน)`,
                `🧑‍💼 ผู้อนุมัติ: ${escapeTelegramHtml(approverFormalName)}`,
                notes ? `📝 ${escapeTelegramHtml(notes.slice(0, 200))}` : '',
                `<a href="https://ebci-nexus.vercel.app/hradmin/leave?tab=requests">ดูใน Nexus →</a>`,
            ].filter(Boolean).join('\n')
            sendTelegram({ chatId: t.telegramChatId, text })
                .catch(err => console.error('[leave/approve] HR telegram failed:', err))
        }
    } catch (err) {
        console.error('[leave/approve] HR telegram fan-out failed:', err)
    }

    return NextResponse.json({
        success: true,
        id,
        reference_code: row.reference_code,
        status: 'approved',
        approved_at: nowIso,
        email_sent: emailSent,
    })
}
