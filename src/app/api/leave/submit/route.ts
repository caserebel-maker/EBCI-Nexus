import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import {
    bangkokTodayIso,
    validateLeaveRequest,
} from '@/lib/leave-validations'
import {
    fetchActiveLeaveTypes,
    fetchBalancesForEmployee,
    adjustPendingDays,
    type LeaveType,
} from '@/lib/leave-balance'
import {
    resolveLeaveApprover,
    findMdEmployee,
    displayApproverName,
    ANNUAL_LEAVE_MD_THRESHOLD_DAYS,
} from '@/lib/leave-approval'
import {
    sendLeaveSubmittedToApprover,
    sendLeaveSubmittedToEmployee,
    sendLeaveSubmittedToMdFyi,
} from '@/lib/email-leave'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'
import { findHrNotifyTargets } from '@/lib/hr-notify'
import { resolveApproverInboxUrl } from '@/lib/leave-inbox-url'
import { sendTelegram, escapeTelegramHtml } from '@/lib/telegram'
import { getDelegateApproverIdsForApplicant } from '@/lib/leave-delegate-approvers'

export const dynamic = 'force-dynamic'

const BUCKET = 'leave-attachments'
const MAX_ATTACHMENT = 5 * 1024 * 1024 // 5MB per spec
const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/octet-stream',
])
const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])
const CONTENT_TYPE_BY_EXT: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
}

function getSafeAttachmentMeta(file: File): { ext: string; contentType: string } | { error: string } {
    const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!ext || !ALLOWED_EXT.has(ext)) {
        return { error: 'รองรับเฉพาะ PDF, JPG, PNG, WEBP, HEIC หรือ HEIF' }
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
        return { error: `ประเภทไฟล์ไม่รองรับ (${file.type})` }
    }
    return {
        ext,
        contentType: CONTENT_TYPE_BY_EXT[ext] ?? (file.type || 'application/octet-stream'),
    }
}

async function cleanupFailedRequest(args: {
    leaveRequestId: string
    uploadedPath?: string | null
}) {
    const jobs: Array<Promise<unknown>> = [
        Promise.resolve(supabaseAdmin.from('leave_requests').delete().eq('id', args.leaveRequestId)),
    ]
    if (args.uploadedPath) {
        jobs.push(supabaseAdmin.storage.from(BUCKET).remove([args.uploadedPath]))
    }
    await Promise.allSettled(jobs)
}

/**
 * POST /api/leave/submit — multipart/form-data
 *
 * Fields:
 *   leave_type_id: string   (annual|personal|sick|marriage|bereavement|training)
 *   start_date:    YYYY-MM-DD
 *   end_date:      YYYY-MM-DD
 *   is_half_day:   'true' | 'false'
 *   half_day_period?: 'morning' | 'afternoon'   (required when is_half_day=true)
 *   reason:        string
 *   contact_during_leave?: string
 *   attachment?:   File
 *
 * Flow: validate → resolve approver → call generate_leave_reference()
 *   → insert leave_requests (status=pending) → upload attachment →
 *   bump leave_balances.pending_days → fire-and-forget email.
 */
export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงานที่เชื่อมโยงกับบัญชีของคุณ' }, { status: 400 })
    }

    const form = await req.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })

    const leaveTypeId = String(form.get('leave_type_id') ?? '').trim()
    const startDate = String(form.get('start_date') ?? '').trim()
    const endDate = String(form.get('end_date') ?? '').trim()
    const isHalfDay = String(form.get('is_half_day') ?? 'false') === 'true'
    const halfDayPeriod = String(form.get('half_day_period') ?? '').trim() || null
    const reason = String(form.get('reason') ?? '').trim()
    const contact = String(form.get('contact_during_leave') ?? '').trim() || null
    const advanceNoticeExceptionReason =
        String(form.get('advance_notice_exception_reason') ?? '').trim() || null
    const attachment = form.get('attachment') as File | null

    if (!leaveTypeId || !startDate || !endDate || !reason) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
    }
    if (isHalfDay && halfDayPeriod !== 'morning' && halfDayPeriod !== 'afternoon') {
        return NextResponse.json({ error: 'เลือกช่วงลาครึ่งวัน (เช้า/บ่าย)' }, { status: 400 })
    }
    if (isHalfDay && startDate !== endDate) {
        return NextResponse.json({ error: 'ลาครึ่งวันต้องเป็นวันเดียวกัน' }, { status: 400 })
    }

    // Look up leave_type metadata
    const leaveTypes = await fetchActiveLeaveTypes()
    const leaveType: LeaveType | undefined = leaveTypes.find(t => t.id === leaveTypeId)
    if (!leaveType) return NextResponse.json({ error: 'ประเภทลาไม่ถูกต้อง' }, { status: 400 })

    // Attachment pre-check (we don't upload yet — validate first to avoid orphaned files)
    let attachmentMeta: { ext: string; contentType: string } | null = null
    if (attachment && attachment.size > 0) {
        if (attachment.size > MAX_ATTACHMENT) {
            return NextResponse.json({ error: 'ไฟล์ใหญ่เกิน 5 MB' }, { status: 413 })
        }
        const meta = getSafeAttachmentMeta(attachment)
        if ('error' in meta) {
            return NextResponse.json({ error: meta.error }, { status: 415 })
        }
        attachmentMeta = meta
    }

    // Validate business rules
    const year = new Date(startDate).getFullYear()
    const balances = await fetchBalancesForEmployee(employeeId, year)
    const balance = balances.find(b => b.leave_type_id === leaveTypeId) ?? null
    const hasAttachment = !!(attachment && attachment.size > 0)

    const validation = await validateLeaveRequest({
        leaveType,
        startDate,
        endDate,
        isHalfDay,
        hasAttachment,
        balance,
        employeeId,
        todayBangkokIso: bangkokTodayIso(),
        advanceNoticeExceptionReason,
    })
    if (!validation.ok) {
        return NextResponse.json({ error: validation.error, field: validation.field }, { status: 400 })
    }
    const totalDays = validation.totalDays
    const advanceNoticeExceptionRequired =
        leaveTypeId === 'annual'
        && Number(leaveType.advance_notice_days ?? 0) > 0
        && (() => {
            const start = new Date(`${startDate}T00:00:00+07:00`).getTime()
            const today = new Date(`${bangkokTodayIso()}T00:00:00+07:00`).getTime()
            return Number.isFinite(start) && Number.isFinite(today)
                && Math.round((start - today) / 86400000) < Number(leaveType.advance_notice_days ?? 0)
        })()
    const policyExceptionNote = advanceNoticeExceptionRequired && advanceNoticeExceptionReason
        ? `ขอยกเว้นเงื่อนไขล่วงหน้า: ${advanceNoticeExceptionReason}`
        : ''
    const reasonForMessages = policyExceptionNote
        ? `${reason}\n\n${policyExceptionNote}`
        : reason

    // Resolve approver (logged even if null so HR can see orphans in Session 2)
    //
    // §8 พ.ค. — ม๊อด's escalation rule: ลาพักร้อนเกิน 3 วัน → MD เป็นคน
    // อนุมัติ ไม่ใช่หัวหน้าสายงาน. ≤ 3 วัน → หัวหน้าอนุมัติตามปกติ + MD
    // ได้แค่ FYI (handled in the email + notification fan-out below).
    //
    // Identification: MD = active employee with approval_level=4. If no
    // MD exists (org bootstrapping, vacancy, etc.) we fall back silently
    // to the line manager — never block the submission just because the
    // MD seat is empty. HR sees the chain via the audit dashboard.
    const lineManager = await resolveLeaveApprover(employeeId)
    const needsMdApproval =
        leaveTypeId === 'annual' && totalDays > ANNUAL_LEAVE_MD_THRESHOLD_DAYS
    const md = (leaveTypeId === 'annual') ? await findMdEmployee() : null
    const approver = needsMdApproval && md ? md : lineManager
    if (!approver) {
        return NextResponse.json({
            error: 'ไม่พบผู้อนุมัติตามสายงาน — กรุณาแจ้ง HR เพื่อตั้งค่าผู้อนุมัติ',
        }, { status: 400 })
    }

    // Reserve reference_code + id
    const { data: refData, error: refErr } = await supabaseAdmin.rpc('generate_leave_reference')
    if (refErr || !refData) {
        console.error('[leave/submit] generate_leave_reference failed:', refErr)
        return NextResponse.json({ error: 'สร้างรหัสใบลาไม่สำเร็จ' }, { status: 500 })
    }
    const referenceCode = String(refData)

    const nowIso = new Date().toISOString()
    // Insert with status=pending FIRST — balance adjustment is a separate
    // call; if that fails we've still got the authoritative row and can
    // reconcile. Alternative would be a stored proc for atomicity; keep
    // it simple for now.
    const { data: insertedRow, error: insErr } = await supabaseAdmin
        .from('leave_requests')
        .insert({
            reference_code: referenceCode,
            employee_id: employeeId,
            leave_type_id: leaveTypeId,
            start_date: startDate,
            end_date: endDate,
            total_days: totalDays,
            is_half_day: isHalfDay,
            half_day_period: isHalfDay ? halfDayPeriod : null,
            reason,
            contact_during_leave: contact,
            advance_notice_exception_required: advanceNoticeExceptionRequired,
            advance_notice_exception_reason: advanceNoticeExceptionRequired
                ? advanceNoticeExceptionReason
                : null,
            status: 'pending',
            approver_id: approver.id,
            submitted_at: nowIso,
            created_at: nowIso,
            updated_at: nowIso,
        })
        .select('id')
        .single()
    if (insErr || !insertedRow) {
        console.error('[leave/submit] insert failed:', insErr)
        return NextResponse.json({ error: insErr?.message ?? 'บันทึกใบลาไม่สำเร็จ' }, { status: 500 })
    }
    const leaveRequestId = insertedRow.id as string

    // Upload attachment (after insert so we can scope the storage path by id)
    let attachmentUrl: string | null = null
    let attachmentName: string | null = null
    if (attachment && attachment.size > 0) {
        const meta = attachmentMeta ?? getSafeAttachmentMeta(attachment)
        if ('error' in meta) {
            await cleanupFailedRequest({ leaveRequestId })
            return NextResponse.json({ error: meta.error }, { status: 415 })
        }
        const safe = `attachment-${Date.now()}.${meta.ext}`
        const path = `${employeeId}/${leaveRequestId}/${safe}`
        const fileBytes = await attachment.arrayBuffer()
        const { error: upErr } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, fileBytes, { upsert: true, contentType: meta.contentType })
        if (upErr) {
            console.error('[leave/submit] attachment upload failed:', upErr)
            await cleanupFailedRequest({ leaveRequestId })
            return NextResponse.json({
                error: `อัปโหลดไฟล์แนบไม่สำเร็จ — ${upErr.message}`,
            }, { status: 500 })
        } else {
            const { data: signed, error: signErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .createSignedUrl(path, 60 * 60 * 24 * 30)
            if (signErr || !signed?.signedUrl) {
                console.error('[leave/submit] attachment signed-url failed:', signErr)
                await cleanupFailedRequest({ leaveRequestId, uploadedPath: path })
                return NextResponse.json({
                    error: `สร้างลิงก์ไฟล์แนบไม่สำเร็จ — ${signErr?.message ?? 'no signed URL'}`,
                }, { status: 500 })
            }
            attachmentUrl = signed?.signedUrl ?? null
            attachmentName = attachment.name
            const { error: attachUpdateErr } = await supabaseAdmin
                .from('leave_requests')
                .update({ attachment_url: attachmentUrl, attachment_name: attachmentName })
                .eq('id', leaveRequestId)
            if (attachUpdateErr) {
                console.error('[leave/submit] attachment metadata update failed:', attachUpdateErr)
                await cleanupFailedRequest({ leaveRequestId, uploadedPath: path })
                return NextResponse.json({
                    error: `บันทึกข้อมูลไฟล์แนบไม่สำเร็จ — ${attachUpdateErr.message}`,
                }, { status: 500 })
            }
        }
    }

    // Reserve pending days on the balance row
    const balanceResult = await adjustPendingDays({
        employeeId, leaveTypeId, year, delta: totalDays,
    })
    if (!balanceResult.ok) {
        console.error('[leave/submit] balance adjust failed:', balanceResult.error)
        // Soft-fail — the request is still in the system; a future reconciliation
        // job can re-sum pending_days from leave_requests.
    }

    // Resolve names + URLs. ม๊อด's 8 พ.ค. spec: send email to BOTH the
    // approver (so they know there's something to act on) AND the
    // applicant (confirmation receipt with reference code). HR is in-app
    // only — they have a dashboard.
    const employeeRow = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname, email, employee_code')
        .eq('id', employeeId)
        .maybeSingle()
    const employeeName = employeeRow.data
        ? `${employeeRow.data.first_name_th ?? ''} ${employeeRow.data.last_name_th ?? ''}`.trim()
          + (employeeRow.data.nickname ? ` (${employeeRow.data.nickname})` : '')
        : session.name
    const employeeEmail = (employeeRow.data?.email as string | null) ?? null
    const approverName = displayApproverName(approver)
    const approverEmail = approver.email ?? null

    const emailSent = { employee: false, approver: false, md_fyi: false }

    // Resolve approver's inbox URL once for the bell notification below.
    // Best-effort: returns /portal/leave/inbox on any failure, which
    // works for every role.
    const approverUserIdForUrl = await getEmployeeUserId(approver.id)
    const approverInboxUrl = approverUserIdForUrl
        ? await resolveApproverInboxUrl(approverUserIdForUrl)
        : '/portal/leave/inbox'

    // ── Submit-time emails (approver + applicant) ──────────────────────────
    // Best-effort + parallel. Each job logs its own errors. Result flags
    // surface back to the client in case the UI wants to show "email
    // Resolve delegate/backup approvers (e.g. supervisor_id / co-approvers)
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

    // ── Email notification block (Primary + Co-approvers) ──────────────────
    {
        const jobs: Array<Promise<unknown>> = []
        if (employeeEmail && employeeEmail.includes('@')) {
            jobs.push(
                sendLeaveSubmittedToEmployee({
                    referenceCode,
                    employeeName,
                    employeeEmail: employeeEmail ?? '',
                    approverName,
                    approverEmail: approverEmail ?? '',
                    approverInboxUrl,
                    leaveTypeTh: leaveType.name_th ?? 'ลา',
                    startDate,
                    endDate,
                    totalDays,
                    reason: reasonForMessages,
                })
                    .then(r => { emailSent.employee = Boolean(r && 'success' in r && r.success) })
                    .catch(err => console.error('[leave/submit] employee email threw:', err)),
            )
        }

        // Send email to primary approver + all co-approvers / delegate approvers
        const targetApproverEmails = new Set<string>()
        if (approverEmail && approverEmail.includes('@')) {
            targetApproverEmails.add(approverEmail)
        }
        for (const da of delegateApprovers) {
            if (da.email && da.email.includes('@')) {
                targetApproverEmails.add(da.email)
            }
        }

        for (const targetEmail of targetApproverEmails) {
            const emailCtx = {
                referenceCode,
                employeeName,
                employeeEmail: employeeEmail ?? '',
                approverName,
                approverEmail: targetEmail,
                approverInboxUrl,
                leaveTypeTh: leaveType.name_th ?? 'ลา',
                startDate,
                endDate,
                totalDays,
                reason: reasonForMessages,
            }
            jobs.push(
                sendLeaveSubmittedToApprover(emailCtx)
                    .then(r => { emailSent.approver = Boolean(r && 'success' in r && r.success) })
                    .catch(err => console.error('[leave/submit] approver email threw:', err)),
            )
        }
        await Promise.allSettled(jobs)
    }

    // Collect all recipient user IDs for the pending approval notification
    const pendingRecipients = new Set<string>()
    if (approverUserIdForUrl) pendingRecipients.add(approverUserIdForUrl)
    for (const da of delegateApprovers) {
        const daUserId = da.user_id || await getEmployeeUserId(da.id)
        if (daUserId) pendingRecipients.add(daUserId)
    }

    // In-app notification for the approvers (primary + delegates)
    try {
        const applicantNick = (employeeRow.data?.nickname as string | null) ?? employeeName
        const leaveTypeTh = leaveType.name_th ?? 'ลา'
        const dateLabel = startDate === endDate ? startDate : `${startDate} → ${endDate}`
        for (const recipientUserId of pendingRecipients) {
            await createNotification({
                recipient_user_id: recipientUserId,
                type: 'leave_request_pending',
                title: `${applicantNick} ขอ${leaveTypeTh}`,
                body: `${dateLabel} (${totalDays} วัน) — ${reasonForMessages || 'ไม่ระบุเหตุผล'}`,
                action_url: approverInboxUrl,
                action_label: 'ดูรายละเอียด',
                entity_type: 'leave_request',
                entity_id: leaveRequestId,
                reference_code: referenceCode,
                icon: 'Calendar',
                color: 'amber',
                sender_name: applicantNick,
            })
        }
    } catch (err) {
        console.error('[leave/submit] notification error:', err)
    }

    // Telegram for the approver(s) and other requested recipients
    try {
        const applicantNick = (employeeRow.data?.nickname as string | null) ?? employeeName
        const leaveTypeTh = leaveType.name_th ?? 'ลา'
        const dateLabel = startDate === endDate ? startDate : `${startDate} → ${endDate}`
        const inboxUrl = approverInboxUrl.startsWith('http')
            ? approverInboxUrl
            : `https://ebci-nexus.vercel.app${approverInboxUrl}`
        const text = [
            `🔔 <b>รออนุมัติ${escapeTelegramHtml(leaveTypeTh)}</b>`,
            `👤 ${escapeTelegramHtml(applicantNick)}`,
            `📅 ${escapeTelegramHtml(dateLabel)} (${totalDays} วัน)`,
            reasonForMessages ? `📝 ${escapeTelegramHtml(reasonForMessages.slice(0, 260))}` : '',
            `<a href="${escapeTelegramHtml(inboxUrl)}">เปิดกล่องอนุมัติใน Nexus →</a>`,
        ].filter(Boolean).join('\n')

        // Collect all Telegram chat IDs that need this message
        const telegramTargets = new Set<string>()
        if (approver.telegram_chat_id) telegramTargets.add(approver.telegram_chat_id)
        for (const da of delegateApprovers) {
            if (da.telegram_chat_id) telegramTargets.add(da.telegram_chat_id)
        }

        // Special rule: if applicant is Tee Chayut (employee_code: '491-67'), also notify Mod (Arthit) on Telegram
        const applicantCode = employeeRow.data?.employee_code || ''
        if (applicantCode === '491-67') {
            // Find Mod's employee record
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
                .catch(err => console.error(`[leave/submit] telegram send to ${chatId} failed:`, err))
        }
    } catch (err) {
        console.error('[leave/submit] telegram dispatcher failed:', err)
    }

    // ── MD FYI fan-out — ม๊อด's 8 พ.ค. call: MD ต้องเห็นทุกใบลาพักร้อน ───
    if (leaveTypeId === 'annual' && md && md.id !== approver.id) {
        try {
            const mdUserId = await getEmployeeUserId(md.id)
            const applicantNick = (employeeRow.data?.nickname as string | null) ?? employeeName
            const dateLabel = startDate === endDate ? startDate : `${startDate} → ${endDate}`
            if (mdUserId) {
                await createNotification({
                    recipient_user_id: mdUserId,
                    type: 'leave_request_fyi',
                    title: `[FYI] ${applicantNick} ลาพักร้อน`,
                    body: `${dateLabel} (${totalDays} วัน) — รอ ${approver.first_name_th ?? 'ผู้บังคับบัญชา'} อนุมัติ (ไม่ต้องอนุมัติ)`,
                    action_url: '/hradmin/leave?tab=requests',
                    action_label: 'ดูรายการใบลา',
                    entity_type: 'leave_request',
                    entity_id: leaveRequestId,
                    reference_code: referenceCode,
                    icon: 'Calendar',
                    color: 'blue',
                    sender_name: applicantNick,
                }).catch(err => console.error('[leave/submit] MD in-app FYI failed:', err))
            }
            if (md.email && md.email.includes('@')) {
                const r = await sendLeaveSubmittedToMdFyi({
                    referenceCode,
                    employeeName,
                    mdEmail: md.email,
                    approverName,
                    leaveTypeTh: leaveType.name_th ?? 'ลาพักร้อน',
                    startDate,
                    endDate,
                    totalDays,
                    reason: reasonForMessages,
                }).catch(err => {
                    console.error('[leave/submit] MD email FYI failed:', err)
                    return null
                })
                emailSent.md_fyi = Boolean(r && 'success' in r && r.success)
            }
        } catch (err) {
            console.error('[leave/submit] MD FYI fan-out failed:', err)
        }
    }

    // ── HR FYI fan-out — pending requests stay in-app only ─────────────
    try {
        const fyiRecipients = new Set<string>()
        // Always include Super Admin (Suriya - 9dc14c59-d2a3-4804-abf1-14417507f0dc)
        fyiRecipients.add('9dc14c59-d2a3-4804-abf1-14417507f0dc')
        // Always include HR Admin (Arthit - 48d4b74a-38e8-4106-a5da-8017e55fd6d8)
        fyiRecipients.add('48d4b74a-38e8-4106-a5da-8017e55fd6d8')

        // Also fetch any other HR notify targets dynamically
        const hrTargets = await findHrNotifyTargets()
        for (const t of hrTargets) {
            if (t.userId) fyiRecipients.add(t.userId)
        }

        // Exclude anyone who is already a pending approver (primary or delegate)
        for (const pendingId of pendingRecipients) {
            fyiRecipients.delete(pendingId)
        }

        if (fyiRecipients.size > 0) {
            const dateLabel = startDate === endDate ? startDate : `${startDate} → ${endDate}`
            const applicantNick = (employeeRow.data?.nickname as string | null) ?? employeeName
            for (const recipientUserId of fyiRecipients) {
                await createNotification({
                    recipient_user_id: recipientUserId,
                    type: 'leave_request_fyi',
                    title: `[FYI] ${applicantNick} ${leaveType.name_th ?? 'ลา'}`,
                    body: `${dateLabel} (${totalDays} วัน) — รอ ${approver.first_name_th ?? 'ผู้บังคับบัญชา'} อนุมัติ`,
                    action_url: '/hradmin/leave?tab=requests',
                    action_label: 'ดูรายการใบลา',
                    entity_type: 'leave_request',
                    entity_id: leaveRequestId,
                    reference_code: referenceCode,
                    icon: 'Calendar',
                    color: 'blue',
                    sender_name: applicantNick,
                }).catch(err => console.error('[leave/submit] HR in-app FYI failed:', err))
            }
        }
    } catch (err) {
        console.error('[leave/submit] HR FYI fan-out failed:', err)
    }

    return NextResponse.json({
        success: true,
        id: leaveRequestId,
        reference_code: referenceCode,
        approver: {
            id: approver.id,
            name: approverName,
        },
        total_days: totalDays,
        email_sent: emailSent,
    })
}
