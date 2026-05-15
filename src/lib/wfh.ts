import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveLeaveApprover } from '@/lib/leave-approval'
import { bangkokTodayIso } from '@/lib/leave-validations'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'
import { findHrNotifyTargets } from '@/lib/hr-notify'
import {
    sendWfhDecidedToEmployee,
    sendWfhSubmittedToEmployee,
    sendWfhSubmittedToApprover,
} from '@/lib/email-wfh'
import { sendTelegram, escapeTelegramHtml } from '@/lib/telegram'
import type { WfhRequest } from '@/lib/wfh-shared'

/**
 * §3.1 Layer 2 — WFH request server operations.
 *
 * Mirrors the leave_requests pipeline at the boundaries (submit →
 * approver → decision → calendar) but uses a separate table so leave
 * balances and absence reports stay out of the picture. Approver
 * routing reuses resolveLeaveApprover() so each employee's WFH
 * routes to the same person their leave would.
 */

const SELECT_COLS = `
    id, reference_code, employee_id, start_date, end_date, total_days,
    reason, contact_during_wfh, status,
    approver_id, approved_at, approval_notes, rejection_reason,
    submitted_at, cancelled_at, cancellation_reason,
    created_at, updated_at
`.replace(/\s+/g, ' ').trim()

function daysInclusive(start: string, end: string): number {
    const s = new Date(start + 'T00:00:00Z').getTime()
    const e = new Date(end + 'T00:00:00Z').getTime()
    if (isNaN(s) || isNaN(e) || e < s) return 0
    return Math.round((e - s) / 86_400_000) + 1
}

export interface SubmitWfhInput {
    employeeId: string
    startDate: string                  // YYYY-MM-DD
    endDate: string                    // YYYY-MM-DD
    reason: string
    contactDuringWfh?: string | null
}

export async function submitWfhRequest(
    input: SubmitWfhInput,
): Promise<{ id: string; reference_code: string; approver_name: string } | { error: string; field?: string }> {
    if (!input.employeeId) return { error: 'ไม่พบข้อมูลพนักงาน' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return { error: 'วันที่เริ่มไม่ถูกต้อง', field: 'startDate' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) return { error: 'วันที่สิ้นสุดไม่ถูกต้อง', field: 'endDate' }
    if (input.endDate < input.startDate) return { error: 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันเริ่ม', field: 'endDate' }

    const reason = input.reason?.trim()
    if (!reason) return { error: 'กรุณาระบุเหตุผล', field: 'reason' }

    // Backstop: don't let employees backdate WFH requests. Lets HR insert
    // historical records via the admin tool if they ever need to.
    const today = bangkokTodayIso()
    if (input.startDate < today) return { error: 'วันที่เริ่มต้องไม่ย้อนหลัง', field: 'startDate' }

    const totalDays = daysInclusive(input.startDate, input.endDate)
    if (totalDays === 0) return { error: 'จำนวนวันต้องมากกว่า 0' }

    // Approver: same chain as leave. If the employee has no approver
    // wired up, surface the same "ติดต่อ HR" message so the user knows
    // it's a setup issue, not a technical one.
    const approver = await resolveLeaveApprover(input.employeeId)
    if (!approver) {
        return { error: 'ไม่พบผู้อนุมัติตามสายงาน — กรุณาแจ้ง HR เพื่อตั้งค่าผู้อนุมัติ' }
    }

    // Reserve a reference code via the dedicated RPC (WFH-{year}-{seq}).
    const { data: refData, error: refErr } = await supabaseAdmin.rpc('generate_wfh_reference')
    if (refErr || !refData) {
        console.error('[wfh] generate_wfh_reference failed:', refErr)
        return { error: 'สร้างรหัสใบขอ WFH ไม่สำเร็จ' }
    }
    const referenceCode = String(refData)

    const contact = input.contactDuringWfh?.trim() || null
    const { data: inserted, error: insErr } = await supabaseAdmin
        .from('wfh_requests')
        .insert({
            reference_code: referenceCode,
            employee_id: input.employeeId,
            start_date: input.startDate,
            end_date: input.endDate,
            total_days: totalDays,
            reason,
            contact_during_wfh: contact,
            status: 'pending',
            approver_id: approver.id,
        })
        .select('id, reference_code')
        .single()
    if (insErr || !inserted) {
        console.error('[wfh] insert error:', insErr)
        return { error: 'บันทึกใบขอ WFH ไม่สำเร็จ' }
    }

    const approverName = [approver.first_name_th, approver.last_name_th]
        .filter(Boolean).join(' ').trim() || 'ผู้อนุมัติ'

    // ── Notification fan-out ────────────────────────────────────────────
    // Best-effort: every notification path is wrapped in try/catch so a
    // single channel failing never bubbles up as a submit failure. The
    // DB row is the authoritative signal that the request exists. Email
    // is reserved for approve/reject decisions, so submit-time fan-out is
    // in-app only.
    //
    // Recipients:
    //   - Approver:  in-app 🔔 (the person who needs to act)
    //   - HR (มด et al.): in-app 🔔, FYI only — Mod's 4 May call:
    //                     HR doesn't approve WFH, just stays informed.
    const applicantRow = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname, email')
        .eq('id', input.employeeId)
        .maybeSingle()
    const applicant = (applicantRow.data ?? null) as {
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
        email: string | null
    } | null
    const applicantName = applicant
        ? (`${applicant.first_name_th ?? ''} ${applicant.last_name_th ?? ''}`.trim()
            || applicant.nickname || 'พนักงาน')
        : 'พนักงาน'
    const applicantNick = applicant?.nickname ?? applicantName
    const applicantEmail = applicant?.email ?? null
    const approverEmail = approver.email ?? null

    // ── Submit-time emails — ม๊อด's 8 พ.ค. spec: applicant + approver get
    // email at submit. HR is in-app only (they have a dashboard). Each
    // job is best-effort + parallel — never blocks the response.
    const emailCtx = {
        referenceCode,
        employeeName: applicantName,
        employeeEmail: applicantEmail ?? '',
        approverName,
        approverEmail,
        startDate: input.startDate,
        endDate: input.endDate,
        totalDays,
        reason,
        contactDuringWfh: contact,
    }

    // Fire notification jobs in parallel. Each job logs its own errors.
    const jobs: Array<Promise<unknown>> = []

    // 0a. Applicant confirmation email
    if (applicantEmail && applicantEmail.includes('@')) {
        jobs.push(
            sendWfhSubmittedToEmployee(emailCtx)
                .catch(err => console.error('[wfh] applicant email failed:', err)),
        )
    }
    // 0b. Approver action-needed email
    if (approverEmail && approverEmail.includes('@')) {
        jobs.push(
            sendWfhSubmittedToApprover(emailCtx)
                .catch(err => console.error('[wfh] approver email failed:', err)),
        )
    }

    // 1. Approver in-app
    jobs.push((async () => {
        try {
            const approverUserId = await getEmployeeUserId(approver.id)
            if (!approverUserId) return
            await createNotification({
                recipient_user_id: approverUserId,
                type: 'wfh_request_pending',
                title: `${applicantNick} ขอ WFH`,
                body: `${input.startDate === input.endDate ? input.startDate : `${input.startDate} → ${input.endDate}`} (${totalDays} วัน) — ${reason}`,
                action_url: '/portal/wfh/inbox',
                action_label: 'ดูรายละเอียด',
                entity_type: 'wfh_request',
                entity_id: inserted.id as string,
                reference_code: referenceCode,
                icon: 'Home',
                color: 'amber',
                sender_name: applicantNick,
            })
        } catch (err) {
            console.error('[wfh] approver in-app notif failed:', err)
        }
    })())

    // 2. HR FYI — per-person in-app 🔔
    jobs.push((async () => {
        try {
            const hrTargets = await findHrNotifyTargets()
            if (hrTargets.length === 0) return
            const dateLabel = input.startDate === input.endDate ? input.startDate : `${input.startDate} → ${input.endDate}`
            for (const t of hrTargets) {
                if (!t.userId) continue
                await createNotification({
                    recipient_user_id: t.userId,
                    type: 'wfh_request_fyi',
                    title: `[FYI] ${applicantNick} ขอ WFH`,
                    body: `${dateLabel} (${totalDays} วัน) — รอ ${approverName} อนุมัติ`,
                    action_url: '/portal/wfh',
                    action_label: 'ดูรายการ',
                    entity_type: 'wfh_request',
                    entity_id: inserted.id as string,
                    reference_code: referenceCode,
                    icon: 'Home',
                    color: 'blue',
                    sender_name: applicantNick,
                }).catch(err => console.error('[wfh] HR in-app notif failed:', err))

                if (t.telegramChatId) {
                    const text = [
                        `🏠 <b>${escapeTelegramHtml(applicantNick)}</b> ขอ WFH`,
                        `📅 ${escapeTelegramHtml(dateLabel)} (${totalDays} วัน)`,
                        `🧑‍💼 รอ ${escapeTelegramHtml(approverName)} อนุมัติ`,
                        reason ? `📝 ${escapeTelegramHtml(reason.slice(0, 200))}` : '',
                        `<a href="https://ebci-nexus.vercel.app/portal/wfh">ดูใน Nexus →</a>`,
                    ].filter(Boolean).join('\n')
                    sendTelegram({ chatId: t.telegramChatId, text })
                        .catch(err => console.error('[wfh] HR telegram failed:', err))
                }
            }
        } catch (err) {
            console.error('[wfh] HR FYI fan-out failed:', err)
        }
    })())

    await Promise.allSettled(jobs)

    return {
        id: inserted.id as string,
        reference_code: inserted.reference_code as string,
        approver_name: approverName,
    }
}

export async function listMyWfhRequests(employeeId: string): Promise<WfhRequest[]> {
    if (!employeeId) return []
    const { data, error } = await supabaseAdmin
        .from('wfh_requests')
        .select(SELECT_COLS)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(200)
    if (error) {
        console.error('[wfh] listMy error:', error)
        return []
    }
    return (data ?? []) as unknown as WfhRequest[]
}

export async function listInboxForApprover(approverEmployeeId: string): Promise<WfhRequest[]> {
    if (!approverEmployeeId) return []
    const { data, error } = await supabaseAdmin
        .from('wfh_requests')
        .select(SELECT_COLS)
        .eq('approver_id', approverEmployeeId)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })
    if (error) {
        console.error('[wfh] inbox error:', error)
        return []
    }
    return (data ?? []) as unknown as WfhRequest[]
}

/**
 * Employee cancels a pending OR approved request.
 * Approver re-confirmation NOT required — no balance to refund, the
 * failure mode is just "doesn't show in the calendar anymore".
 */
export async function cancelWfhRequest(input: {
    id: string
    employeeId: string
    reason?: string | null
}): Promise<{ ok: true } | { error: string }> {
    const { data: existing, error: lookupErr } = await supabaseAdmin
        .from('wfh_requests')
        .select('employee_id, status')
        .eq('id', input.id)
        .maybeSingle()
    if (lookupErr || !existing) return { error: 'ไม่พบใบขอ WFH' }
    if (existing.employee_id !== input.employeeId) return { error: 'ไม่มีสิทธิ์' }
    if (!['pending', 'approved'].includes(existing.status)) {
        return { error: `ใบขอนี้ ${existing.status} แล้ว — ยกเลิกไม่ได้` }
    }
    const { error: updErr } = await supabaseAdmin
        .from('wfh_requests')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: input.reason?.trim() || null,
        })
        .eq('id', input.id)
    if (updErr) {
        console.error('[wfh] cancel error:', updErr)
        return { error: 'ยกเลิกไม่สำเร็จ' }
    }
    return { ok: true }
}

/**
 * Approver decides on a pending request (approve OR reject). Identifies
 * the approver by employees.id (matches approver_id on the row).
 */
export async function decideWfhRequest(input: {
    id: string
    approverEmployeeId: string
    decision: 'approve' | 'reject'
    note?: string | null
}): Promise<{ ok: true } | { error: string }> {
    const { data: existing, error: lookupErr } = await supabaseAdmin
        .from('wfh_requests')
        .select('approver_id, status')
        .eq('id', input.id)
        .maybeSingle()
    if (lookupErr || !existing) return { error: 'ไม่พบใบขอ WFH' }
    if (existing.approver_id !== input.approverEmployeeId) {
        return { error: 'ไม่มีสิทธิ์อนุมัติใบขอนี้' }
    }
    if (existing.status !== 'pending') {
        return { error: `ใบขอนี้ ${existing.status} แล้ว` }
    }

    const note = input.note?.trim() || null
    const nowIso = new Date().toISOString()
    const update = input.decision === 'approve'
        ? {
            status: 'approved' as const,
            approved_at: nowIso,
            approval_notes: note,
            rejection_reason: null,
        }
        : {
            status: 'rejected' as const,
            approved_at: nowIso,           // also stamp the decision time
            rejection_reason: note,
            approval_notes: null,
        }

    const { error: updErr } = await supabaseAdmin
        .from('wfh_requests')
        .update(update)
        .eq('id', input.id)
    if (updErr) {
        console.error('[wfh] decision error:', updErr)
        return { error: 'บันทึกการตัดสินใจไม่สำเร็จ' }
    }

    // ── Notify the applicant of the decision ───────────────────────────
    // Best-effort. We need to re-fetch the row to pull dates/reason for
    // the email template (decision endpoint only knows the id + new
    // status). Failure here doesn't undo the decision.
    try {
        const { data: r } = await supabaseAdmin
            .from('wfh_requests')
            .select('reference_code, employee_id, start_date, end_date, total_days, reason, contact_during_wfh')
            .eq('id', input.id)
            .maybeSingle()
        if (r) {
            const { data: emp } = await supabaseAdmin
                .from('employees')
                .select('first_name_th, last_name_th, nickname, email, user_id')
                .eq('id', r.employee_id as string)
                .maybeSingle()
            const empRow = emp as { first_name_th: string | null; last_name_th: string | null; nickname: string | null; email: string | null; user_id: string | null } | null
            const empName = empRow
                ? (`${empRow.first_name_th ?? ''} ${empRow.last_name_th ?? ''}`.trim() || empRow.nickname || 'พนักงาน')
                : 'พนักงาน'
            // Email
            if (empRow?.email && empRow.email.includes('@')) {
                await sendWfhDecidedToEmployee({
                    referenceCode: r.reference_code as string,
                    employeeName: empName,
                    employeeEmail: empRow.email,
                    startDate: r.start_date as string,
                    endDate: r.end_date as string,
                    totalDays: Number(r.total_days),
                    reason: r.reason as string,
                    contactDuringWfh: r.contact_during_wfh as string | null,
                    decision: input.decision,
                    note,
                }).catch(err => console.error('[wfh] decision email failed:', err))
            }
            // In-app
            if (empRow?.user_id) {
                await createNotification({
                    recipient_user_id: empRow.user_id,
                    type: input.decision === 'approve' ? 'wfh_request_approved' : 'wfh_request_rejected',
                    title: input.decision === 'approve'
                        ? 'คำขอ WFH ได้รับการอนุมัติ'
                        : 'คำขอ WFH ถูกปฏิเสธ',
                    body: note ?? (input.decision === 'approve' ? 'อนุมัติแล้ว' : 'ถูกปฏิเสธ'),
                    action_url: '/portal/wfh',
                    action_label: 'ดูรายละเอียด',
                    entity_type: 'wfh_request',
                    entity_id: input.id,
                    reference_code: r.reference_code as string,
                    icon: 'Home',
                    color: input.decision === 'approve' ? 'green' : 'red',
                }).catch(err => console.error('[wfh] decision in-app notif failed:', err))
            }
        }
    } catch (err) {
        console.error('[wfh] decision notify fan-out failed:', err)
    }

    return { ok: true }
}

/**
 * Does this employee have an APPROVED WFH covering `dateIso`?
 * Read by /portal/checkin (Layer 3) to enable the WFH check-in button
 * only on days the employee is actually approved to work from home.
 */
export async function hasApprovedWfhOn(employeeId: string, dateIso: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from('wfh_requests')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .lte('start_date', dateIso)
        .gte('end_date', dateIso)
        .limit(1)
        .maybeSingle()
    if (error) {
        console.error('[wfh] hasApprovedWfhOn error:', error)
        return false
    }
    return !!data
}
