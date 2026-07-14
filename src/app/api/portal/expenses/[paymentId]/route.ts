import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET = 'employee-expenses'

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ paymentId: string }> },
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 404 })

    const { paymentId } = await context.params
    const { data: payment, error } = await supabaseAdmin
        .from('employee_expense_payments')
        .select('id, employee_id, receipt_path, receipt_file_name')
        .eq('id', paymentId)
        .eq('employee_id', employeeId)
        .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!payment) return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 })
    if (!payment.receipt_path) return NextResponse.json({ error: 'ไม่มีใบเสร็จแนบ' }, { status: 404 })

    const { data, error: signedError } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(payment.receipt_path as string, 3600, {
            download: (payment.receipt_file_name as string | null) ?? undefined,
        })

    if (signedError || !data?.signedUrl) {
        return NextResponse.json({ error: signedError?.message ?? 'สร้างลิงก์ดาวน์โหลดไม่สำเร็จ' }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl, 302)
}
