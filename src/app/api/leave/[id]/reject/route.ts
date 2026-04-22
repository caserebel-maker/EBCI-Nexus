import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { adjustPendingDays } from '@/lib/leave-balance'
import { sendLeaveRejected } from '@/lib/email-leave'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leave/[id]/reject
 * Body: { rejection_reason: string }  (required, ≥ 10 chars)
 *
 * Rejects the pending leave request. Guards the same way as approve:
 * caller must be the assigned approver, row must be pending. Rolls
 * back the pending_days reservation so the applicant's balance shows
 * the days as available again, then fires the rejection email with
 * the reason.
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
    const rejectionReason: string = String(body?.rejection_reason ?? '').trim()
    if (rejectionReason.length < 10) {
        return NextResponse.json(
            { error: 'กรุณาระบุเหตุผลการปฏิเสธอย่างน้อย 10 ตัวอักษร' },
            { status: 400 },
        )
    }

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

    if (row.approver_id !== approverEmployeeId) {
        return NextResponse.json({ error: 'คุณไม่ใช่ผู้อนุมัติของใบลานี้' }, { status: 403 })
    }
    if (row.status !== 'pending') {
        return NextResponse.json(
            { error: 'ปฏิเสธได้เฉพาะใบลาที่อยู่ในสถานะรออนุมัติ' },
            { status: 409 },
        )
    }

    const nowIso = new Date().toISOString()
    const { error: updErr } = await supabaseAdmin
        .from('leave_requests')
        .update({
            status: 'rejected',
            approved_at: nowIso,
            rejection_reason: rejectionReason,
            updated_at: nowIso,
        })
        .eq('id', id)
        .eq('status', 'pending') // race guard
    if (updErr) {
        console.error('[leave/reject] update error:', updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Return the pending-days reservation — used_days is NOT touched.
    const year = new Date(row.start_date as string).getFullYear()
    const totalDays = Number(row.total_days ?? 0)
    const pendingAdjust = await adjustPendingDays({
        employeeId: row.employee_id as string,
        leaveTypeId: row.leave_type_id as string,
        year,
        delta: -totalDays,
    })
    if (!pendingAdjust.ok) {
        console.error('[leave/reject] pending rollback failed:', pendingAdjust.error)
    }

    // Email the applicant
    const [applicantResult, approverResult, typeResult] = await Promise.all([
        supabaseAdmin
            .from('employees')
            .select('first_name_th, last_name_th, nickname, email')
            .eq('id', row.employee_id)
            .maybeSingle(),
        supabaseAdmin
            .from('employees')
            .select('first_name_th, last_name_th, nickname, email')
            .eq('id', approverEmployeeId)
            .maybeSingle(),
        supabaseAdmin
            .from('leave_types')
            .select('name_th')
            .eq('id', row.leave_type_id)
            .maybeSingle(),
    ])
    const applicant = applicantResult.data
    const approver = approverResult.data
    const employeeEmail = (applicant?.email as string | null)?.trim()

    let emailSent = false
    if (employeeEmail && employeeEmail.includes('@')) {
        const applicantName = `${applicant?.first_name_th ?? ''} ${applicant?.last_name_th ?? ''}`.trim()
            + (applicant?.nickname ? ` (${applicant.nickname})` : '')
        const approverName = `${approver?.first_name_th ?? ''} ${approver?.last_name_th ?? ''}`.trim()
            + (approver?.nickname ? ` (${approver.nickname})` : '')
        try {
            const result = await sendLeaveRejected({
                referenceCode: String(row.reference_code),
                employeeName: applicantName || (applicant?.nickname ?? ''),
                employeeEmail,
                approverName: approverName || null,
                approverEmail: (approver?.email as string | null) ?? null,
                leaveTypeTh: (typeResult.data?.name_th as string | undefined) ?? row.leave_type_id as string,
                startDate: row.start_date as string,
                endDate: row.end_date as string,
                totalDays,
                reason: String(row.reason ?? ''),
                rejectionReason,
            })
            emailSent = Boolean(result && 'success' in result && result.success)
            if (!emailSent) console.error('[leave/reject] email non-success:', result)
        } catch (err) {
            console.error('[leave/reject] email threw:', err)
        }
    }

    return NextResponse.json({
        success: true,
        id,
        reference_code: row.reference_code,
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejected_at: nowIso,
        email_sent: emailSent,
    })
}
