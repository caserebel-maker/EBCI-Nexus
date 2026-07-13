import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'
import { getDelegateApproverIdsForApplicant } from '@/lib/leave-delegate-approvers'
import { findHrNotifyTargets } from '@/lib/hr-notify'
import { sendTelegram, escapeTelegramHtml } from '@/lib/telegram'

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
    // Notify the approver(s) and FYI targets. Best-effort — same pattern as submit/approve.
    try {
        const approverEmployeeId = row.approver_id as string | null
        const [empResult, typeResult, primaryApproverResult] = await Promise.all([
            supabaseAdmin
                .from('employees')
                .select('first_name_th, last_name_th, nickname, employee_code')
                .eq('id', employeeId)
                .maybeSingle(),
            supabaseAdmin
                .from('leave_types')
                .select('name_th')
                .eq('id', row.leave_type_id)
                .maybeSingle(),
            approverEmployeeId
                ? supabaseAdmin
                    .from('employees')
                    .select('first_name_th, last_name_th, nickname, telegram_chat_id')
                    .eq('id', approverEmployeeId)
                    .maybeSingle()
                : Promise.resolve({ data: null }),
        ])

        const emp = empResult.data
        const applicantName =
            `${emp?.first_name_th ?? ''} ${emp?.last_name_th ?? ''}`.trim()
            + (emp?.nickname ? ` (${emp.nickname})` : '')
        const leaveType = typeResult.data?.name_th ?? 'ลา'
        const primaryApprover = primaryApproverResult.data
        const primaryApproverName = primaryApprover
            ? `${primaryApprover.first_name_th ?? ''} ${primaryApprover.last_name_th ?? ''}`.trim()
              + (primaryApprover.nickname ? ` (${primaryApprover.nickname})` : '')
            : 'ผู้บังคับบัญชา'

        // Resolve delegate/backup approvers
        const delegateIds = await getDelegateApproverIdsForApplicant(employeeId)
        const delegateApprovers: Array<{
            id: string
            first_name_th: string | null
            last_name_th: string | null
            nickname: string | null
            email: string | null
            telegram_chat_id: string | null
            user_id: string | null
        }> = []
        if (delegateIds.length > 0) {
            const { data: delegates } = await supabaseAdmin
                .from('employees')
                .select('id, first_name_th, last_name_th, nickname, email, telegram_chat_id, user_id')
                .in('id', delegateIds)
            if (delegates) {
                delegateApprovers.push(...delegates)
            }
        }

        // Collect all recipient user IDs for the pending cancellation notification
        const pendingRecipients = new Set<string>()
        if (approverEmployeeId) {
            const primaryUserId = await getEmployeeUserId(approverEmployeeId)
            if (primaryUserId) pendingRecipients.add(primaryUserId)
        }
        for (const da of delegateApprovers) {
            const daUserId = da.user_id || await getEmployeeUserId(da.id)
            if (daUserId) pendingRecipients.add(daUserId)
        }

        // Send in-app notification to approvers (primary + delegates)
        for (const recipientUserId of pendingRecipients) {
            await createNotification({
                recipient_user_id: recipientUserId,
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

        // Send FYI in-app notifications to Super Admin (Suriya) and HR Admin (Arthit)
        const fyiRecipients = new Set<string>()
        fyiRecipients.add('9dc14c59-d2a3-4804-abf1-14417507f0dc') // Suriya
        fyiRecipients.add('48d4b74a-38e8-4106-a5da-8017e55fd6d8') // Arthit
        const hrTargets = await findHrNotifyTargets()
        for (const t of hrTargets) {
            if (t.userId) fyiRecipients.add(t.userId)
        }

        for (const recipientUserId of fyiRecipients) {
            await createNotification({
                recipient_user_id: recipientUserId,
                type: 'leave_request_fyi',
                title: `[FYI] ${applicantName || 'พนักงาน'} ขอยกเลิกใบลา ${leaveType}`,
                body: `${row.start_date} → ${row.end_date} (${row.total_days} วัน) — รอ ${primaryApprover?.first_name_th ?? 'ผู้บังคับบัญชา'} อนุมัติ`,
                action_url: '/hradmin/leave?tab=requests',
                action_label: 'ดูรายการใบลา',
                entity_type: 'leave_request',
                entity_id: id,
                reference_code: String(row.reference_code),
                icon: 'Ban',
                color: 'blue',
                sender_name: applicantName || null,
            }).catch(err => console.error('[leave/request-cancellation] HR FYI failed:', err))
        }

        // Telegram notification for cancellation request
        try {
            const dateLabel = row.start_date === row.end_date ? row.start_date : `${row.start_date} → ${row.end_date}`
            const text = [
                `🔔 <b>ขอยกเลิกใบลา${escapeTelegramHtml(leaveType)}</b>`,
                `👤 ${escapeTelegramHtml(applicantName)}`,
                `📅 ${escapeTelegramHtml(dateLabel)} (${row.total_days} วัน)`,
                reason ? `📝 เหตุผล: ${escapeTelegramHtml(reason.slice(0, 200))}` : '',
                `<a href="https://ebci-nexus.vercel.app/portal/leave/inbox">เปิดกล่องอนุมัติใน Nexus →</a>`,
            ].filter(Boolean).join('\n')

            const telegramTargets = new Set<string>()
            if (primaryApprover?.telegram_chat_id) telegramTargets.add(primaryApprover.telegram_chat_id)
            for (const da of delegateApprovers) {
                if (da.telegram_chat_id) telegramTargets.add(da.telegram_chat_id)
            }

            // Special rule: if applicant is Tee Chayut (employee_code: '491-67'), also notify Mod (Arthit) on Telegram
            const applicantCode = emp?.employee_code || ''
            if (applicantCode === '491-67') {
                const { data: modEmp } = await supabaseAdmin
                    .from('employees')
                    .select('telegram_chat_id')
                    .eq('id', '23a770e5-f5bf-4933-83ab-c694f69496d6')
                    .maybeSingle()
                if (modEmp?.telegram_chat_id) {
                    telegramTargets.add(modEmp.telegram_chat_id)
                }
            }

            for (const chatId of telegramTargets) {
                sendTelegram({ chatId, text })
                    .catch(err => console.error(`[leave/request-cancellation] telegram send to ${chatId} failed:`, err))
            }
        } catch (err) {
            console.error('[leave/request-cancellation] telegram dispatcher failed:', err)
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
