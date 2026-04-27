import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

const BUCKET = 'employee-contracts'

/**
 * GET /api/hradmin/employees/[id]/contracts/[contractId]
 *
 * Mints a 1-hour signed URL pointing at the contract blob in private
 * storage and 302-redirects to it. We don't return the URL as JSON
 * because the browser's native download UX (Content-Disposition,
 * progress, resume) only triggers on a direct navigation.
 *
 * Setting `download` on createSignedUrl asks Supabase to add the
 * Content-Disposition: attachment header so the file always saves
 * rather than rendering inline (PDFs especially).
 */
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string; contractId: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden — HR only' }, { status: 403 })
    }

    const { contractId } = await context.params
    const { data: row, error } = await supabaseAdmin
        .from('employee_contracts')
        .select('file_path, file_name')
        .eq('id', contractId)
        .is('deleted_at', null)
        .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'ไม่พบสัญญา' }, { status: 404 })

    const { data: signed, error: signErr } = await supabaseAdmin
        .storage
        .from(BUCKET)
        .createSignedUrl(row.file_path as string, 3600, {
            download: (row.file_name as string) ?? undefined,
        })
    if (signErr || !signed) {
        return NextResponse.json(
            { error: signErr?.message ?? 'สร้างลิงก์ดาวน์โหลดไม่สำเร็จ' },
            { status: 500 },
        )
    }

    return NextResponse.redirect(signed.signedUrl, 302)
}

/**
 * DELETE /api/hradmin/employees/[id]/contracts/[contractId]
 *
 * Soft delete only. Thai labour law requires HR to retain employment
 * records for ≥ 2 years post-termination, so a hard DELETE would put
 * the company at compliance risk. We stamp deleted_at + deleted_by
 * so HR can audit the lifecycle, and the storage blob stays put.
 *
 * Body: { reason?: string }
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string; contractId: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden — HR only' }, { status: 403 })
    }

    const { contractId } = await context.params
    const body = await req.json().catch(() => ({}))
    const reason = body.reason ? String(body.reason).trim().slice(0, 500) : null

    const { data: existing, error: readErr } = await supabaseAdmin
        .from('employee_contracts')
        .select('id, deleted_at')
        .eq('id', contractId)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'ไม่พบสัญญา' }, { status: 404 })
    if (existing.deleted_at) {
        return NextResponse.json({ error: 'สัญญานี้ถูกลบไปแล้ว' }, { status: 400 })
    }

    const { error: updateErr } = await supabaseAdmin
        .from('employee_contracts')
        .update({
            deleted_at: new Date().toISOString(),
            deleted_by: auth.session.id,
            deleted_reason: reason,
        })
        .eq('id', contractId)

    if (updateErr) {
        console.error('[contracts/delete] update error:', updateErr)
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
