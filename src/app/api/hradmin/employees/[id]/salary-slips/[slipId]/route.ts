import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, canManagePayroll } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

const BUCKET = 'salary-slips'

/**
 * GET /api/hradmin/employees/[id]/salary-slips/[slipId]
 *
 * Mints a 1-hour signed URL for the slip blob and 302-redirects.
 * The download attribute on the URL forces "Save As" rather than
 * inline render, which matters for slips since most are PDF and
 * inline-rendering them inside a Vercel response would tempt the
 * browser to cache the URL.
 */
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string; slipId: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePayroll(auth)) {
        return NextResponse.json({ error: 'Forbidden — payroll permission required' }, { status: 403 })
    }

    const { slipId } = await context.params
    const { data: row } = await supabaseAdmin
        .from('salary_slips')
        .select('file_path, file_name')
        .eq('id', slipId)
        .is('deleted_at', null)
        .maybeSingle()
    if (!row) return NextResponse.json({ error: 'ไม่พบสลิป' }, { status: 404 })

    const { data: signed, error: signErr } = await supabaseAdmin
        .storage
        .from(BUCKET)
        .createSignedUrl(row.file_path as string, 3600, {
            download: (row.file_name as string) ?? undefined,
        })
    if (signErr || !signed) {
        return NextResponse.json({ error: signErr?.message ?? 'สร้างลิงก์ดาวน์โหลดไม่สำเร็จ' }, { status: 500 })
    }
    return NextResponse.redirect(signed.signedUrl, 302)
}

/**
 * DELETE /api/hradmin/employees/[id]/salary-slips/[slipId]
 *
 * Soft delete only. Blob stays in storage to satisfy the 7-year
 * legal retention; the row is hidden from list/download and the
 * unique-period index frees up so HR can re-upload if needed.
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string; slipId: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePayroll(auth)) {
        return NextResponse.json({ error: 'Forbidden — payroll permission required' }, { status: 403 })
    }

    const { slipId } = await context.params
    const body = await req.json().catch(() => ({}))
    const reason = body.reason ? String(body.reason).trim().slice(0, 500) : null

    const { data: existing } = await supabaseAdmin
        .from('salary_slips')
        .select('id, deleted_at')
        .eq('id', slipId)
        .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'ไม่พบสลิป' }, { status: 404 })
    if (existing.deleted_at) {
        return NextResponse.json({ error: 'สลิปนี้ถูกลบไปแล้ว' }, { status: 400 })
    }

    const { error: updateErr } = await supabaseAdmin
        .from('salary_slips')
        .update({
            deleted_at: new Date().toISOString(),
            deleted_by: auth.session.id,
            deleted_reason: reason,
        })
        .eq('id', slipId)
    if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
}
