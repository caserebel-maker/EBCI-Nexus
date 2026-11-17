import { NextRequest, NextResponse } from 'next/server'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseClaimForm, uploadClaimReceipt } from '@/lib/expense-claims'

/**
 * HR records a claim on behalf of an employee. HR is the approver, so it
 * starts as "approved" (or "paid" when paid_on is given).
 */
export async function POST(request: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const form = await request.formData()
    const employeeId = String(form.get('employee_id') ?? '').trim()
    const { data: employee } = await supabaseAdmin.from('employees').select('id').eq('id', employeeId).maybeSingle()
    if (!employee) return NextResponse.json({ error: 'กรุณาเลือกพนักงาน' }, { status: 400 })

    const parsed = await parseClaimForm(form)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const paidOn = String(form.get('paid_on') ?? '').trim()
    if (paidOn && !/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) {
        return NextResponse.json({ error: 'วันที่จ่ายไม่ถูกต้อง' }, { status: 400 })
    }

    const upload = await uploadClaimReceipt(employeeId, form.get('receipt'))
    if (!upload.ok) return NextResponse.json({ error: upload.error }, { status: 400 })

    const { session } = auth
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin.from('expense_claims').insert({
        employee_id: employeeId,
        ...parsed.values,
        ...upload.receipt,
        status: paidOn ? 'paid' : 'approved',
        submitted_by: session.id,
        submitted_by_name: session.name,
        reviewed_by: session.id,
        reviewed_by_name: session.name,
        reviewed_at: now,
        ...(paidOn ? { paid_by: session.id, paid_by_name: session.name, paid_on: paidOn } : {}),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
