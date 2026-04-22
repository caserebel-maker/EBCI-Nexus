import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyOwnership } from '@/lib/careers-ownership'
import {
    sendApplicationSubmittedEmail,
    sendHrNotificationEmail,
} from '@/lib/careers-emails'
import { sanitizeApplyFields } from '@/lib/careers-sanitize'

/**
 * POST /api/careers/apply/[id]/submit
 * Body: { reference_code, fields?: { ...final fields } }
 *
 * Writes any remaining fields, then flips application_status='submitted'
 * and records submitted_at. Sends two emails:
 *  - To the applicant (confirmation)
 *  - To HR team (new application notification)
 *
 * Does basic required-field validation (position, name, email, pdpa).
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const referenceCode = String(body.reference_code ?? '').trim()
    const extraFields = (body.fields ?? {}) as Record<string, unknown>

    const auth = await verifyOwnership(id, referenceCode)
    if (!auth.ok) return NextResponse.json({ error: 'Forbidden', reason: auth.reason }, { status: 403 })
    if (auth.status !== 'draft') {
        return NextResponse.json({ error: 'ใบสมัครนี้ถูกส่งไปแล้ว' }, { status: 409 })
    }

    // Apply any last-moment changes (forbidden columns stripped + date/numeric
    // empty strings → null, same treatment as /start and /autosave)
    const update: Record<string, unknown> = sanitizeApplyFields(extraFields)

    if (Object.keys(update).length) {
        const { error: upErr } = await supabaseAdmin
            .from('job_applications')
            .update({ ...update, last_saved_at: new Date().toISOString() })
            .eq('id', id)
        if (upErr) {
            console.error('[careers/submit] final update error:', upErr)
            return NextResponse.json({ error: upErr.message }, { status: 500 })
        }
    }

    // Re-read to validate required fields
    const { data: row, error: readErr } = await supabaseAdmin
        .from('job_applications')
        .select(`
            id, reference_code, email, position_applied, photo_url,
            first_name_th, last_name_th, nickname,
            phone_mobile, pdpa_consented
        `)
        .eq('id', id)
        .single()
    if (readErr || !row) {
        return NextResponse.json({ error: readErr?.message ?? 'not_found' }, { status: 500 })
    }

    const missing: string[] = []
    if (!row.position_applied) missing.push('ตำแหน่งที่ต้องการ')
    if (!row.first_name_th || !row.last_name_th) missing.push('ชื่อ-สกุล')
    if (!row.email) missing.push('email')
    if (!row.phone_mobile) missing.push('เบอร์มือถือ')
    if (!row.photo_url) missing.push('รูปถ่าย')
    if (!row.pdpa_consented) missing.push('ยินยอม PDPA')
    if (missing.length) {
        return NextResponse.json(
            { error: 'ข้อมูลไม่ครบ', missing },
            { status: 400 },
        )
    }

    // Flip status → submitted
    const nowIso = new Date().toISOString()
    const { error: subErr } = await supabaseAdmin
        .from('job_applications')
        .update({
            application_status: 'submitted',
            submitted_at: nowIso,
            pdpa_consented_at: nowIso,
            last_saved_at: nowIso,
            completed_steps: [1, 2, 3, 4, 5],
            current_step: 5,
        })
        .eq('id', id)
    if (subErr) {
        console.error('[careers/submit] status flip error:', subErr)
        return NextResponse.json({ error: subErr.message }, { status: 500 })
    }

    // Emails (fire-and-forget — don't block the response)
    const applicantName = [row.first_name_th, row.last_name_th].filter(Boolean).join(' ')
        + (row.nickname ? ` (${row.nickname})` : '')
    const applicantEmail = String(row.email)

    Promise.allSettled([
        sendApplicationSubmittedEmail({
            to: applicantEmail,
            referenceCode: String(row.reference_code),
            applicantName: applicantName || null,
            position: row.position_applied as string | null,
        }),
        sendHrNotificationEmail({
            applicationId: String(row.id),
            referenceCode: String(row.reference_code),
            applicantName: applicantName || null,
            email: applicantEmail,
            position: row.position_applied as string | null,
        }),
    ]).then(results => {
        for (const r of results) if (r.status === 'rejected') console.error('[careers/submit] email:', r.reason)
    })

    return NextResponse.json({
        success: true,
        reference_code: row.reference_code,
        submitted_at: nowIso,
    })
}
