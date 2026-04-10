import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        let employeeId = session.employeeId
        if (!employeeId) {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(session.id)
            const email = authUser?.user?.email
            if (email) {
                const { data: emp } = await supabaseAdmin
                    .from('employees')
                    .select('id')
                    .eq('email', email)
                    .maybeSingle()
                employeeId = emp?.id
            }
        }
        if (!employeeId) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 404 })

        const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select(`
                id, leave_type, start_date, end_date, total_days, reason,
                status, current_step, created_at,
                employee:employees!employee_id (
                    id, first_name_th, last_name_th, nickname, department, position, email
                ),
                leave_approvals (
                    id, approver_role, status, comment, acted_at,
                    approver:employees!approver_id (id, first_name_th, last_name_th)
                )
            `)
            .eq('current_approver_id', employeeId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)
        return NextResponse.json({ data: data ?? [] })

    } catch (err: any) {
        console.error('/api/leave/v2/pending-approvals:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
