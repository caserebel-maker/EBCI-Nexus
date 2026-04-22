import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyOwnership } from '@/lib/careers-ownership'
import { sanitizeApplyFields } from '@/lib/careers-sanitize'

/**
 * PATCH /api/careers/apply/[id]/autosave
 * Body: { reference_code, fields: { ...columns } }
 *
 * Partial update to a draft row. Only works while status='draft'.
 * Client should debounce calls (~3s idle).
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const referenceCode = String(body.reference_code ?? '').trim()
    const fields = (body.fields ?? {}) as Record<string, unknown>

    const auth = await verifyOwnership(id, referenceCode)
    if (!auth.ok) {
        return NextResponse.json({ error: 'ตรวจสอบสิทธิ์ไม่ผ่าน', reason: auth.reason }, { status: 403 })
    }
    if (auth.status !== 'draft') {
        return NextResponse.json({ error: 'ใบสมัครถูกส่งแล้ว ไม่สามารถแก้ไขได้' }, { status: 409 })
    }

    const cleanUpdate: Record<string, unknown> = sanitizeApplyFields(fields)
    cleanUpdate.last_saved_at = new Date().toISOString()

    if (Object.keys(cleanUpdate).length === 1) {
        // only last_saved_at — nothing actually changed
        return NextResponse.json({ saved_at: cleanUpdate.last_saved_at })
    }

    const { error } = await supabaseAdmin
        .from('job_applications')
        .update(cleanUpdate)
        .eq('id', id)

    if (error) {
        console.error('[careers/autosave] update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved_at: cleanUpdate.last_saved_at })
}
