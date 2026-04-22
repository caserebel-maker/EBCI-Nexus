import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { sendStatusChangeEmail } from '@/lib/careers-emails'
import { canTransition, APPLICANT_STATUSES, type ApplicantStatus } from '@/lib/applicant-status'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hradmin/applicants/[id]/status
 * Body: { new_status: ApplicantStatus, notes?: string }
 *
 * HR-admin only. Validates the transition against the state machine,
 * updates the row (application_status + reviewed_by + reviewed_at),
 * appends the optional note to review_notes, and fires the
 * corresponding applicant email. Email failures do NOT roll back the
 * status change — the row is authoritative and we'd rather HR see the
 * new state than fail the whole action.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'hr_admin') {
        return NextResponse.json({ error: 'Forbidden — HR Admin only' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const newStatus = String(body.new_status ?? '').trim() as ApplicantStatus
    const notes: string | null = body.notes ? String(body.notes).trim() || null : null

    if (!APPLICANT_STATUSES.includes(newStatus)) {
        return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 })
    }

    const { data: row, error: readErr } = await supabaseAdmin
        .from('job_applications')
        .select(`
            id, reference_code, application_status, review_notes,
            email, first_name_th, last_name_th, nickname, position_applied
        `)
        .eq('id', id)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'ไม่พบใบสมัคร' }, { status: 404 })

    const currentStatus = (row.application_status as ApplicantStatus) ?? 'submitted'
    if (currentStatus === newStatus) {
        return NextResponse.json({ error: 'สถานะเดิมอยู่แล้ว ไม่มีอะไรเปลี่ยน' }, { status: 400 })
    }
    if (!canTransition(currentStatus, newStatus)) {
        return NextResponse.json({
            error: `เปลี่ยนจาก ${currentStatus} → ${newStatus} ไม่ได้ (ไม่อยู่ใน workflow)`,
        }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const evaluatorId = session.employeeId ?? session.id
    // Append the note as a signed/timestamped line so the audit trail grows
    const trailLine = `[${nowIso}] ${currentStatus} → ${newStatus}`
        + (session.name ? ` by ${session.name}` : '')
        + (notes ? `\n${notes}` : '')
    const nextReviewNotes = row.review_notes
        ? `${row.review_notes}\n---\n${trailLine}`
        : trailLine

    const { error: upErr } = await supabaseAdmin
        .from('job_applications')
        .update({
            application_status: newStatus,
            reviewed_at: nowIso,
            reviewed_by: evaluatorId,
            review_notes: nextReviewNotes,
            updated_at: nowIso,
        })
        .eq('id', id)
    if (upErr) {
        console.error('[applicants/status] update error:', upErr)
        return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    // Send applicant email (awaited so Vercel doesn't kill the Lambda
    // mid-send). Never blocks the status change itself.
    let emailSent = false
    const applicantEmail = (row.email as string | null)?.trim()
    const applicantName = [row.first_name_th, row.last_name_th].filter(Boolean).join(' ')
        + (row.nickname ? ` (${row.nickname})` : '')
    if (applicantEmail) {
        try {
            const result = await sendStatusChangeEmail(newStatus, {
                to: applicantEmail,
                referenceCode: String(row.reference_code),
                applicantName: applicantName || null,
                position: (row.position_applied as string | null) ?? null,
                notes,
            })
            emailSent = Boolean(result && 'success' in result && result.success)
            if (!emailSent) {
                console.error('[applicants/status] email returned non-success:', result)
            }
        } catch (err) {
            console.error('[applicants/status] email threw:', err)
        }
    }

    return NextResponse.json({
        success: true,
        status: newStatus,
        previous_status: currentStatus,
        email_sent: emailSent,
        reviewed_at: nowIso,
    })
}
