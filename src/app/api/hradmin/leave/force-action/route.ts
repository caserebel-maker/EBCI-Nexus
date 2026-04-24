import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { sendLeaveApproved, sendLeaveRejected } from '@/lib/email-leave'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hradmin/leave/force-action
 *
 * Body: {
 *   id:       string             // leave_requests.id
 *   action:   'approve' | 'reject' | 'cancel'
 *   reason?:  string              // required for reject, ≥5 chars
 * }
 *
 * Lets hr_admin transition ANY request to a new state, bypassing the
 * assigned approver. Handles balance rollbacks across arbitrary state
 * transitions (pending→approved, approved→rejected, rejected→approved,
 * etc.) by computing the delta between the OLD and NEW "consumed
 * bucket":
 *
 *   status=pending    → consumes pending_days
 *   status=approved   → consumes used_days
 *   status=rejected   → consumes nothing
 *   status=cancelled  → consumes nothing
 *
 * Every call appends a one-line audit trail to `approval_notes` so the
 * detail drawer shows who did what.
 */
export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'hr_admin') {
        return NextResponse.json({ error: 'เฉพาะ HR Admin เท่านั้น' }, { status: 403 })
    }

    const actorEmployeeId = await resolveSessionEmployeeId(session)
    if (!actorEmployeeId) {
        return NextResponse.json({ error: 'ไม่พบพนักงานที่เชื่อมโยงบัญชี' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const id = String(body?.id ?? '').trim()
    const action = String(body?.action ?? '').trim()
    const reason = body?.reason ? String(body.reason).trim() : ''

    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    if (!['approve', 'reject', 'cancel'].includes(action)) {
        return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }
    if ((action === 'reject' || action === 'cancel') && reason.length < 5) {
        return NextResponse.json({ error: 'กรุณาระบุเหตุผล (≥ 5 ตัวอักษร)' }, { status: 400 })
    }

    // Read current row
    const { data: row, error: readErr } = await supabaseAdmin
        .from('leave_requests')
        .select(`
            id, reference_code, status, employee_id, approver_id,
            leave_type_id, start_date, end_date, total_days, reason,
            approval_notes, rejection_reason
        `)
        .eq('id', id)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'ไม่พบใบลา' }, { status: 404 })

    const oldStatus = row.status as string
    const newStatus = action === 'approve' ? 'approved'
        : action === 'reject' ? 'rejected'
        : 'cancelled'

    if (oldStatus === newStatus) {
        return NextResponse.json({ error: `ใบลาอยู่ในสถานะ ${newStatus} อยู่แล้ว` }, { status: 409 })
    }

    const totalDays = Number(row.total_days ?? 0)
    const employeeId = row.employee_id as string
    const leaveTypeId = row.leave_type_id as string
    const year = new Date(row.start_date as string).getFullYear()

    // Compute balance adjustment — delta on each "bucket" to move consumption
    // from old status to new status. Sums to zero when the transition is
    // balance-neutral (e.g. rejected → cancelled).
    const consumedBy = (status: string): 'pending' | 'used' | null => {
        if (status === 'pending') return 'pending'
        if (status === 'approved') return 'used'
        return null
    }
    const oldBucket = consumedBy(oldStatus)
    const newBucket = consumedBy(newStatus)

    let balanceError: string | null = null
    if (oldBucket !== newBucket) {
        // Load-or-create the balance row for this (employee, type, year).
        const { data: existing, error: bReadErr } = await supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('leave_type_id', leaveTypeId)
            .eq('year', year)
            .maybeSingle()
        if (bReadErr) {
            balanceError = bReadErr.message
        } else {
            const cur = existing ?? {
                id: null as string | null,
                employee_id: employeeId,
                leave_type_id: leaveTypeId,
                year,
                total_days: 0,
                used_days: 0,
                pending_days: 0,
            }
            const nextPending = Math.max(
                0,
                Number(cur.pending_days ?? 0)
                    + (newBucket === 'pending' ? totalDays : 0)
                    - (oldBucket === 'pending' ? totalDays : 0),
            )
            // used_days can go negative on rollbacks only when totals are
            // out-of-sync; clamp to zero — spec allows "insufficient" but
            // never wants a negative balance persisted.
            const nextUsed = Math.max(
                0,
                Number(cur.used_days ?? 0)
                    + (newBucket === 'used' ? totalDays : 0)
                    - (oldBucket === 'used' ? totalDays : 0),
            )
            const nowIso = new Date().toISOString()
            if (existing?.id) {
                const { error: bUpdErr } = await supabaseAdmin
                    .from('leave_balances')
                    .update({
                        pending_days: nextPending,
                        used_days: nextUsed,
                        updated_at: nowIso,
                    })
                    .eq('id', existing.id as string)
                if (bUpdErr) balanceError = bUpdErr.message
            } else {
                const { error: bInsErr } = await supabaseAdmin
                    .from('leave_balances')
                    .insert({
                        employee_id: employeeId,
                        leave_type_id: leaveTypeId,
                        year,
                        total_days: 0,
                        pending_days: nextPending,
                        used_days: nextUsed,
                    })
                if (bInsErr) balanceError = bInsErr.message
            }
        }
    }
    if (balanceError) {
        console.error('[force-action] balance adjust error:', balanceError)
        // Non-fatal — status flip still happens; a reconciliation job can clean up.
    }

    // Append audit trail to approval_notes (keep historical rejection_reason
    // too — it's separately displayed in the drawer).
    const actorLabel = await describeActor(actorEmployeeId, session.name)
    const stamp = new Date().toISOString()
    const auditLine = `[${stamp}] HR override by ${actorLabel}: ${oldStatus} → ${newStatus}${reason ? ` — ${reason}` : ''}`
    const nextNotes = [row.approval_notes, auditLine].filter(Boolean).join('\n')

    const nowIso = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {
        status: newStatus,
        approval_notes: nextNotes,
        updated_at: nowIso,
    }
    if (newStatus === 'approved') {
        updatePayload.approved_at = nowIso
        updatePayload.approver_id = actorEmployeeId // record HR as approver
    }
    if (newStatus === 'rejected') {
        updatePayload.approved_at = nowIso
        updatePayload.rejection_reason = reason
    }
    if (newStatus === 'cancelled') {
        updatePayload.rejection_reason = reason
    }
    const { error: updErr } = await supabaseAdmin
        .from('leave_requests')
        .update(updatePayload)
        .eq('id', id)
        .eq('status', oldStatus) // guard against concurrent override
    if (updErr) {
        console.error('[force-action] update error:', updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Emails + notifications (best-effort)
    await fireNotifications({
        action,
        newStatus,
        row,
        reason,
        actorEmployeeId,
        actorLabel,
    })

    return NextResponse.json({
        success: true,
        id,
        reference_code: row.reference_code,
        old_status: oldStatus,
        new_status: newStatus,
        balance_warning: balanceError ?? null,
    })
}

async function describeActor(actorEmployeeId: string, fallback: string): Promise<string> {
    const { data } = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname')
        .eq('id', actorEmployeeId)
        .maybeSingle()
    if (!data) return fallback
    const full = `${data.first_name_th ?? ''} ${data.last_name_th ?? ''}`.trim()
    return data.nickname ? `${full} (${data.nickname})` : full || fallback
}

interface NotificationArgs {
    action: string
    newStatus: string
    row: Record<string, unknown>
    reason: string
    actorEmployeeId: string
    actorLabel: string
}

async function fireNotifications(args: NotificationArgs) {
    const { action, newStatus, row, reason, actorLabel } = args
    const employeeId = row.employee_id as string
    const leaveTypeId = row.leave_type_id as string

    const [applicantRes, typeRes] = await Promise.all([
        supabaseAdmin
            .from('employees')
            .select('first_name_th, last_name_th, nickname, email')
            .eq('id', employeeId)
            .maybeSingle(),
        supabaseAdmin
            .from('leave_types')
            .select('name_th')
            .eq('id', leaveTypeId)
            .maybeSingle(),
    ])
    const applicant = applicantRes.data
    const leaveTypeTh = (typeRes.data?.name_th as string | undefined) ?? leaveTypeId
    const employeeEmail = (applicant?.email as string | null)?.trim()
    const applicantName = `${applicant?.first_name_th ?? ''} ${applicant?.last_name_th ?? ''}`.trim()
        + (applicant?.nickname ? ` (${applicant.nickname})` : '')

    // Email
    if (employeeEmail && employeeEmail.includes('@')) {
        try {
            const ctx = {
                referenceCode: String(row.reference_code),
                employeeName: applicantName || (applicant?.nickname as string | null) || '',
                employeeEmail,
                approverName: actorLabel,
                approverEmail: null,
                leaveTypeTh,
                startDate: row.start_date as string,
                endDate: row.end_date as string,
                totalDays: Number(row.total_days ?? 0),
                reason: String(row.reason ?? ''),
            }
            if (action === 'approve') {
                await sendLeaveApproved({ ...ctx, approvalNotes: `HR override — ${actorLabel}` })
            } else if (action === 'reject' || action === 'cancel') {
                await sendLeaveRejected({ ...ctx, rejectionReason: reason })
            }
        } catch (err) {
            console.error('[force-action] email error:', err)
        }
    }

    // In-app notification for the applicant
    try {
        const employeeUserId = await getEmployeeUserId(employeeId)
        if (employeeUserId) {
            const titleMap: Record<string, string> = {
                approved: 'ใบลาของคุณได้รับการอนุมัติ (โดย HR)',
                rejected: 'ใบลาของคุณถูกปฏิเสธ (โดย HR)',
                cancelled: 'ใบลาของคุณถูกยกเลิก (โดย HR)',
            }
            const iconMap: Record<string, string> = {
                approved: 'CheckCircle',
                rejected: 'XCircle',
                cancelled: 'Ban',
            }
            const colorMap: Record<string, 'green' | 'red' | 'gray'> = {
                approved: 'green',
                rejected: 'red',
                cancelled: 'gray',
            }
            await createNotification({
                recipient_user_id: employeeUserId,
                type: action === 'approve' ? 'leave_approved' : 'leave_rejected',
                title: titleMap[newStatus] ?? 'สถานะใบลาเปลี่ยน',
                body: `${leaveTypeTh} ${row.start_date} → ${row.end_date} (${Number(row.total_days ?? 0)} วัน)${reason ? ` — ${reason}` : ''}`,
                action_url: '/portal/leave',
                action_label: 'ดูใบลา',
                entity_type: 'leave_request',
                entity_id: String(row.id),
                reference_code: String(row.reference_code),
                icon: iconMap[newStatus] ?? 'Bell',
                color: colorMap[newStatus] ?? 'gray',
                sender_name: actorLabel,
            })
        }
    } catch (err) {
        console.error('[force-action] notification error:', err)
    }
}
