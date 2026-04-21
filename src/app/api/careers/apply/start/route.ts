import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendDraftSavedEmail } from '@/lib/careers-emails'

/**
 * POST /api/careers/apply/start
 *
 * Body (all optional): { email?, position_applied?, first_name_th?, ... }
 *
 * Creates a new draft, generates a reference code via the DB function,
 * and returns { id, reference_code } the client keeps in the URL.
 * If an email is provided, sends the "draft saved" email so the
 * applicant can resume later.
 */
export async function POST(req: NextRequest) {
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty body ok */ }

    // Generate reference code via the DB function
    const { data: refData, error: refErr } = await supabaseAdmin.rpc('generate_application_reference')
    if (refErr || !refData) {
        console.error('[careers/start] rpc error:', refErr)
        return NextResponse.json({ error: 'สร้างรหัสใบสมัครไม่สำเร็จ' }, { status: 500 })
    }
    const referenceCode = String(refData)

    // Capture a minimal first-step payload — the form will patch the rest via autosave
    const nowIso = new Date().toISOString()
    const insert: Record<string, unknown> = {
        reference_code: referenceCode,
        application_status: 'draft',
        current_step: 1,
        completed_steps: [],
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        user_agent: req.headers.get('user-agent') ?? null,
        last_saved_at: nowIso,
    }
    // Allow caller to seed any column — strip unknown/dangerous values
    for (const [k, v] of Object.entries(body)) {
        if (FORBIDDEN_FIELDS.has(k)) continue
        insert[k] = v
    }

    const { data: row, error: insErr } = await supabaseAdmin
        .from('job_applications')
        .insert(insert)
        .select('id, reference_code, email, position_applied')
        .single()

    if (insErr || !row) {
        console.error('[careers/start] insert error:', insErr)
        return NextResponse.json({ error: insErr?.message ?? 'สร้างใบสมัครไม่สำเร็จ' }, { status: 500 })
    }

    // Fire-and-forget email (don't block response)
    const applicantEmail = (row.email as string | null)?.trim()
    if (applicantEmail) {
        sendDraftSavedEmail({
            to: applicantEmail,
            referenceCode: row.reference_code as string,
            position: row.position_applied as string | null,
        }).catch(err => console.error('[careers/start] email error:', err))
    }

    return NextResponse.json({
        id: row.id,
        reference_code: row.reference_code,
    })
}

// Fields the client is never allowed to set on /start
const FORBIDDEN_FIELDS = new Set([
    'id', 'reference_code', 'application_status', 'created_at', 'updated_at',
    'submitted_at', 'reviewed_by', 'reviewed_at', 'review_notes',
    'interview_evaluation', 'pdpa_consented_at',
])
