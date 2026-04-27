import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

export const dynamic = 'force-dynamic'

const BUCKET = 'salary-slips'

/**
 * GET /api/portal/payroll/[slipId]
 *
 * Employee-side download of their own salary slip. Verifies the
 * slip belongs to the signed-in user before minting the signed URL —
 * this is the access-control gate, not the can_manage_payroll flag.
 */
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ slipId: string }> },
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { slipId } = await context.params
    const { data: row } = await supabaseAdmin
        .from('salary_slips')
        .select('employee_id, file_path, file_name')
        .eq('id', slipId)
        .is('deleted_at', null)
        .maybeSingle()
    if (!row) return NextResponse.json({ error: 'ไม่พบสลิป' }, { status: 404 })

    // The crucial check: this slip must belong to the signed-in user.
    if (row.employee_id !== employeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
