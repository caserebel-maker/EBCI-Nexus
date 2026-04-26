import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

export async function GET() {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        // All HR admin employees (approval_level = 4)
        const { data: hrAdmins } = await supabaseAdmin
            .from('employees')
            .select('id')
            .eq('approval_level', 4)
            .eq('status', 'active')

        const hrIds = (hrAdmins ?? []).map((e: any) => e.id)
        if (hrIds.length === 0) return NextResponse.json({ data: [] })

        const { data, error } = await supabaseAdmin
            .from('leave_requests')
            .select(`
                id, leave_type, start_date, end_date, total_days, reason,
                status, current_step, created_at,
                employee:employees!employee_id (
                    id, first_name_th, last_name_th, nickname, department, position, email
                ),
                leave_approvals (
                    id, approver_role, status, comment, acted_at, created_at,
                    approver:employees!approver_id (id, first_name_th, last_name_th)
                )
            `)
            .in('current_approver_id', hrIds)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)
        return NextResponse.json({ data: data ?? [] })

    } catch (err: any) {
        console.error('/api/leave/v2/hr-pending:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
