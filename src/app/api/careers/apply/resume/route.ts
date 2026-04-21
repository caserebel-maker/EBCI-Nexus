import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/careers/apply/resume
 * Body: { email, reference_code }
 *
 * Returns the draft row on match so the applicant can continue filling.
 * If the application is already submitted, returns 409 (locked).
 */
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const ref = String(body.reference_code ?? '').trim().toUpperCase()

    if (!email || !ref) {
        return NextResponse.json({ error: 'กรุณากรอก email และรหัสใบสมัคร' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
        .from('job_applications')
        .select('*')
        .eq('reference_code', ref)
        .ilike('email', email)
        .maybeSingle()

    if (error) {
        console.error('[careers/resume] query error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
        return NextResponse.json({ error: 'ไม่พบใบสมัครที่ตรงกับข้อมูลที่กรอก' }, { status: 404 })
    }

    if (data.application_status && data.application_status !== 'draft') {
        return NextResponse.json(
            { error: 'ใบสมัครนี้ถูกส่งแล้ว ไม่สามารถแก้ไขได้', status: data.application_status },
            { status: 409 },
        )
    }

    return NextResponse.json({ application: data })
}
