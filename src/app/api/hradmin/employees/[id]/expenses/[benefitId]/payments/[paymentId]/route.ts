import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

const BUCKET = 'employee-expenses'

async function requireHr() {
    const auth = await getAuth()
    return auth && isHrStaff(auth) ? auth : null
}

async function getPayment(idOrCode: string, benefitId: string, paymentId: string) {
    const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('id')
        .or(`id.eq.${idOrCode},employee_code.eq.${idOrCode}`)
        .maybeSingle()
    if (!employee?.id) return null

    const { data: payment } = await supabaseAdmin
        .from('employee_expense_payments')
        .select('id, employee_id, benefit_id, receipt_path, receipt_file_name')
        .eq('id', paymentId)
        .eq('employee_id', employee.id)
        .eq('benefit_id', benefitId)
        .maybeSingle()
    return payment
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string; benefitId: string; paymentId: string }> },
) {
    const auth = await requireHr()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, benefitId, paymentId } = await context.params
    const payment = await getPayment(id, benefitId, paymentId)
    if (!payment) return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 })
    if (!payment.receipt_path) return NextResponse.json({ error: 'ไม่มีใบเสร็จแนบ' }, { status: 404 })

    const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(payment.receipt_path as string, 3600, {
            download: (payment.receipt_file_name as string | null) ?? undefined,
        })

    if (error || !data?.signedUrl) {
        return NextResponse.json({ error: error?.message ?? 'สร้างลิงก์ดาวน์โหลดไม่สำเร็จ' }, { status: 500 })
    }

    return NextResponse.redirect(data.signedUrl, 302)
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string; benefitId: string; paymentId: string }> },
) {
    const auth = await requireHr()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, benefitId, paymentId } = await context.params
    const payment = await getPayment(id, benefitId, paymentId)
    if (!payment) return NextResponse.json({ error: 'ไม่พบรายการ' }, { status: 404 })

    const { error } = await supabaseAdmin
        .from('employee_expense_payments')
        .delete()
        .eq('id', paymentId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (payment.receipt_path) {
        await supabaseAdmin.storage.from(BUCKET).remove([payment.receipt_path as string])
    }

    return NextResponse.json({ ok: true })
}
