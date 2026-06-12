import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { calculateLeaveDays } from '@/lib/leave-validations'
import { sendLeaveApproved } from '@/lib/email-leave'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hradmin/leave/create-on-behalf
 *
 * Body: {
 *   employee_id:      string
 *   leave_type_id:    string
 *   start_date:       YYYY-MM-DD
 *   end_date:         YYYY-MM-DD
 *   reason:           string          (≥ 3 chars)
 *   is_half_day?:     boolean         (default false)
 *   half_day_period?: 'morning' | 'afternoon'
 *   notes?:           string          (optional HR note)
 * }
 *
 * Creates the leave_request already in `approved` status (HR is acting
 * as the authoritative approver) and deducts balance straight into
 * `used_days`. Reuses generate_leave_reference() + sendLeaveApproved()
 * so the employee gets the same result-email flow they'd see from a
 * normal approve, just with "created by HR" noted in approval_notes.
 */
export async function POST(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'เฉพาะ HR เท่านั้น' }, { status: 403 })
    }
    const session = auth.session

    const actorId = await resolveSessionEmployeeId(session)
    if (!actorId) return NextResponse.json({ error: 'ไม่พบพนักงานที่เชื่อมโยงบัญชี' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const employeeId = String(body?.employee_id ?? '').trim()
    const leaveTypeId = String(body?.leave_type_id ?? '').trim()
    const startDate = String(body?.start_date ?? '').trim()
    const endDate = String(body?.end_date ?? '').trim()
    const reason = String(body?.reason ?? '').trim()
    const isHalfDay = Boolean(body?.is_half_day)
    const halfDayPeriod = body?.half_day_period ? String(body.half_day_period).trim() : null
    const hrNotes = body?.notes ? String(body.notes).trim() : ''

    if (!employeeId || !leaveTypeId || !startDate || !endDate || reason.length < 3) {
        return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง' }, { status: 400 })
    }
    if (endDate < startDate) {
        return NextResponse.json({ error: 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่ม' }, { status: 400 })
    }
    if (isHalfDay && startDate !== endDate) {
        return NextResponse.json({ error: 'ลาครึ่งวันต้องเป็นวันเดียวกัน' }, { status: 400 })
    }

    // Verify employee + leave type exist
    const [empRes, typeRes] = await Promise.all([
        supabaseAdmin.from('employees')
            .select('id, first_name_th, last_name_th, nickname, email')
            .eq('id', employeeId)
            .maybeSingle(),
        supabaseAdmin.from('leave_types')
            .select('id, name_th, is_unlimited')
            .eq('id', leaveTypeId)
            .maybeSingle(),
    ])
    if (!empRes.data) return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })
    if (!typeRes.data) return NextResponse.json({ error: 'ประเภทลาไม่ถูกต้อง' }, { status: 400 })
    const leaveTypeTh = typeRes.data.name_th as string
    const isUnlimited = typeRes.data.is_unlimited === true

    const totalDays = calculateLeaveDays(startDate, endDate, isHalfDay)
    if (!(totalDays > 0)) {
        return NextResponse.json({ error: 'คำนวณจำนวนวันลาไม่สำเร็จ' }, { status: 400 })
    }

    const year = new Date(startDate).getFullYear()

    // Fetch existing balance to validate before inserting request
    const { data: existing } = await supabaseAdmin
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('leave_type_id', leaveTypeId)
        .eq('year', year)
        .maybeSingle()

    if (!isUnlimited) {
        const totalEntitled = Number(existing?.total_days ?? 0)
        if (totalEntitled <= 0) {
            return NextResponse.json({
                error: `พนักงานไม่มีสิทธิ์${leaveTypeTh}ในปีนี้ — กรุณากำหนดโควตาก่อน`,
            }, { status: 400 })
        }
        const used = Number(existing?.used_days ?? 0)
        const pending = Number(existing?.pending_days ?? 0)
        const remaining = Math.max(0, totalEntitled - used - pending)
        if (totalDays > remaining) {
            return NextResponse.json({
                error: `วันลาไม่พอ — คงเหลือ ${remaining} วัน · ขอ ${totalDays} วัน`,
            }, { status: 400 })
        }
    }

    // Reserve reference code
    const { data: refData, error: refErr } = await supabaseAdmin.rpc('generate_leave_reference')
    if (refErr || !refData) {
        console.error('[create-on-behalf] generate_leave_reference failed:', refErr)
        return NextResponse.json({ error: 'สร้างรหัสใบลาไม่สำเร็จ' }, { status: 500 })
    }
    const referenceCode = String(refData)

    const actorLabel = await describeActor(actorId, session.name)
    const nowIso = new Date().toISOString()
    const auditLine = `[${nowIso}] Created on behalf by HR — ${actorLabel}${hrNotes ? ` — ${hrNotes}` : ''}`

    const { data: inserted, error: insErr } = await supabaseAdmin
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
            status: 'approved',
            approver_id: actorId,          // HR is the authoritative approver
            submitted_at: nowIso,
            approved_at: nowIso,
            approval_notes: auditLine,
            created_at: nowIso,
            updated_at: nowIso,
        })
        .select('id')
        .single()
    if (insErr || !inserted) {
        console.error('[create-on-behalf] insert error:', insErr)
        return NextResponse.json({ error: insErr?.message ?? 'บันทึกไม่สำเร็จ' }, { status: 500 })
    }

    // Balance: +used_days directly (skip pending — it's already approved)
    if (existing?.id) {
        const nextUsed = Number(existing.used_days ?? 0) + totalDays
        await supabaseAdmin
            .from('leave_balances')
            .update({ used_days: nextUsed, updated_at: nowIso })
            .eq('id', existing.id as string)
    } else {
        await supabaseAdmin
            .from('leave_balances')
            .insert({
                employee_id: employeeId,
                leave_type_id: leaveTypeId,
                year,
                total_days: 0,
                used_days: totalDays,
                pending_days: 0,
            })
    }

    // Email the employee — reuse approved template with a "created by HR" note
    const applicantName = `${empRes.data.first_name_th ?? ''} ${empRes.data.last_name_th ?? ''}`.trim()
        + (empRes.data.nickname ? ` (${empRes.data.nickname})` : '')
    const employeeEmail = (empRes.data.email as string | null)?.trim()
    let emailSent = false
    if (employeeEmail && employeeEmail.includes('@')) {
        try {
            const result = await sendLeaveApproved({
                referenceCode,
                employeeName: applicantName || (empRes.data.nickname as string | null) || '',
                employeeEmail,
                approverName: actorLabel,
                approverEmail: null,
                leaveTypeTh,
                startDate,
                endDate,
                totalDays,
                reason,
                approvalNotes: `สร้างโดย HR — ${actorLabel}${hrNotes ? ` — ${hrNotes}` : ''}`,
            })
            emailSent = Boolean(result && 'success' in result && result.success)
        } catch (err) {
            console.error('[create-on-behalf] email error:', err)
        }
    }

    // In-app notification
    try {
        const employeeUserId = await getEmployeeUserId(employeeId)
        if (employeeUserId) {
            await createNotification({
                recipient_user_id: employeeUserId,
                type: 'leave_approved',
                title: 'HR สร้างใบลาให้คุณ',
                body: `${leaveTypeTh} ${startDate} → ${endDate} (${totalDays} วัน)`,
                action_url: '/portal/leave',
                action_label: 'ดูใบลา',
                entity_type: 'leave_request',
                entity_id: inserted.id as string,
                reference_code: referenceCode,
                icon: 'CheckCircle',
                color: 'green',
                sender_name: actorLabel,
            })
        }
    } catch (err) {
        console.error('[create-on-behalf] notification error:', err)
    }

    return NextResponse.json({
        success: true,
        id: inserted.id,
        reference_code: referenceCode,
        total_days: totalDays,
        email_sent: emailSent,
    })
}

async function describeActor(employeeId: string, fallback: string): Promise<string> {
    const { data } = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname')
        .eq('id', employeeId)
        .maybeSingle()
    if (!data) return fallback
    const full = `${data.first_name_th ?? ''} ${data.last_name_th ?? ''}`.trim()
    return data.nickname ? `${full} (${data.nickname})` : full || fallback
}
