import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Employee cancels their own claim while it is still pending. */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 404 })

    const { id } = await context.params
    const { data, error } = await supabaseAdmin
        .from('expense_claims')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('employee_id', employeeId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'ยกเลิกได้เฉพาะรายการที่ยังรออนุมัติ' }, { status: 409 })
    return NextResponse.json({ ok: true })
}
