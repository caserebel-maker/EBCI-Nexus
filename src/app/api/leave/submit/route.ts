import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import {
    bangkokTodayIso,
    calculateLeaveDays,
    validateLeaveRequest,
} from '@/lib/leave-validations'
import {
    fetchActiveLeaveTypes,
    fetchBalancesForEmployee,
    adjustPendingDays,
    type LeaveType,
} from '@/lib/leave-balance'
import { resolveLeaveApprover, displayApproverName } from '@/lib/leave-approval'
import { sendLeaveSubmittedToEmployee, sendLeaveSubmittedToApprover } from '@/lib/email-leave'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

const BUCKET = 'leave-attachments'
const MAX_ATTACHMENT = 5 * 1024 * 1024 // 5MB per spec
const ALLOWED_MIME = new Set([
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
])

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
    if (attachment && attachment.size > 0) {
        if (attachment.size > MAX_ATTACHMENT) {
            return NextResponse.json({ error: 'ไฟล์ใหญ่เกิน 5 MB' }, { status: 413 })
        }
        if (attachment.type && !ALLOWED_MIME.has(attachment.type)) {
            return NextResponse.json({ error: `ประเภทไฟล์ไม่รองรับ (${attachment.type})` }, { status: 415 })
        }
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
    })
    if (!validation.ok) {
        return NextResponse.json({ error: validation.error, field: validation.field }, { status: 400 })
    }
    const totalDays = validation.totalDays

    // Resolve approver (logged even if null so HR can see orphans in Session 2)
    const approver = await resolveLeaveApprover(employeeId)
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
        const ext = (attachment.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
        const safe = `attachment-${Date.now()}.${ext}`
        const path = `${employeeId}/${leaveRequestId}/${safe}`
        const { error: upErr } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, attachment, { upsert: true, contentType: attachment.type || undefined })
        if (upErr) {
            console.error('[leave/submit] attachment upload failed:', upErr)
            // Still persist the request — user can re-upload later
        } else {
            const { data: signed } = await supabaseAdmin.storage
                .from(BUCKET)
                .createSignedUrl(path, 60 * 60 * 24 * 30)
            attachmentUrl = signed?.signedUrl ?? null
            attachmentName = attachment.name
            await supabaseAdmin
                .from('leave_requests')
                .update({ attachment_url: attachmentUrl, attachment_name: attachmentName })
                .eq('id', leaveRequestId)
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

    // Emails — awaited so Vercel's Lambda doesn't tear the function
    // down mid-send. Both failures are non-fatal: the DB row is the
    // authoritative record, delivery status is logged + returned as
    // flags for the client to surface if it wants to.
    const employeeRow = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname, email')
        .eq('id', employeeId)
        .maybeSingle()
    const employeeName = employeeRow.data
        ? `${employeeRow.data.first_name_th ?? ''} ${employeeRow.data.last_name_th ?? ''}`.trim()
          + (employeeRow.data.nickname ? ` (${employeeRow.data.nickname})` : '')
        : session.name
    const employeeEmail = (employeeRow.data?.email as string | null) ?? session.name
    const approverName = displayApproverName(approver)
    const approverEmail = approver.email

    const emailSent = { employee: false, approver: false }

    const emailCtx = {
        referenceCode,
        employeeName,
        employeeEmail,
        approverName,
        approverEmail,
        leaveTypeTh: leaveType.name_th,
        startDate,
        endDate,
        totalDays,
        reason,
    }
    try {
        const jobs: Array<Promise<unknown>> = []
        if (employeeEmail && employeeEmail.includes('@')) {
            jobs.push(
                sendLeaveSubmittedToEmployee(emailCtx)
                    .then(r => { emailSent.employee = Boolean(r && 'success' in r && r.success) })
                    .catch(err => console.error('[leave/submit] employee email threw:', err)),
            )
        }
        if (approverEmail && approverEmail.includes('@')) {
            jobs.push(
                sendLeaveSubmittedToApprover(emailCtx)
                    .then(r => { emailSent.approver = Boolean(r && 'success' in r && r.success) })
                    .catch(err => console.error('[leave/submit] approver email threw:', err)),
            )
        }
        await Promise.allSettled(jobs)
    } catch (err) {
        console.error('[leave/submit] unexpected email error:', err)
    }

    // In-app notification for the approver. Best-effort: failure here
    // never interrupts the response — the DB row + email are the
    // authoritative signals.
    try {
        const approverUserId = await getEmployeeUserId(approver.id)
        if (approverUserId) {
            const applicantNick = (employeeRow.data?.nickname as string | null) ?? employeeName
            const leaveTypeTh = leaveType.name_th ?? 'ลา'
            const dateLabel = startDate === endDate ? startDate : `${startDate} → ${endDate}`
            await createNotification({
                recipient_user_id: approverUserId,
                type: 'leave_request_pending',
                title: `${applicantNick} ขอ${leaveTypeTh}`,
                body: `${dateLabel} (${totalDays} วัน) — ${reason || 'ไม่ระบุเหตุผล'}`,
                action_url: '/portal/leave/inbox',
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
