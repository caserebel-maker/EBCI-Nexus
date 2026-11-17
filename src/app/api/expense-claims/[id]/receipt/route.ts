import { NextRequest, NextResponse } from 'next/server'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CLAIM_RECEIPT_BUCKET } from '@/lib/expense-claims'

/** Open a claim receipt via a short-lived signed URL. Owner or HR only. */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const { data: claim, error } = await supabaseAdmin
        .from('expense_claims')
        .select('employee_id, receipt_path')
        .eq('id', id)
        .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!claim?.receipt_path) return NextResponse.json({ error: 'ไม่มีใบเสร็จแนบ' }, { status: 404 })

    if (!isHrStaff(auth)) {
        const employeeId = await resolveSessionEmployeeId(auth.session)
        if (employeeId !== claim.employee_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error: signedError } = await supabaseAdmin.storage
        .from(CLAIM_RECEIPT_BUCKET)
        .createSignedUrl(claim.receipt_path as string, 600)
    if (signedError || !data?.signedUrl) {
        return NextResponse.json({ error: signedError?.message ?? 'เปิดใบเสร็จไม่สำเร็จ' }, { status: 500 })
    }
    return NextResponse.redirect(data.signedUrl, 302)
}
