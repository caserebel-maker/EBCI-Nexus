import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/leave/team — get all leave requests for the manager's subordinates
export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
    const view = searchParams.get('view')

    try {
        let subordinateIds: string[] = []
        let filterSubordinates = false

        if (session.role === 'manager' || session.role === 'employee' || view === 'subordinates') {
            filterSubordinates = true
        }

        if (filterSubordinates) {
            // 1. Find manager employee record
            const { data: managerEmployee, error: managerErr } = await supabaseAdmin
                .from('employees')
                .select('id')
                .eq('user_id', session.id)
                .maybeSingle()

            if (managerErr || !managerEmployee) {
                console.error('[leave/team] manager not found:', managerErr)
                return NextResponse.json({ error: 'ไม่พบข้อมูลหัวหน้า' }, { status: 404 })
            }

            // 2. Fetch subordinates
            const { data: subs, error: subsErr } = await supabaseAdmin
                .from('employees')
                .select('id')
                .or(`manager_id.eq.${managerEmployee.id},leave_approver_id.eq.${managerEmployee.id}`)

            if (subsErr) {
                console.error('[leave/team] fetch subordinates error:', subsErr)
                return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลลูกน้อง' }, { status: 500 })
            }

            subordinateIds = subs.map(s => s.id)
            if (subordinateIds.length === 0) {
                return NextResponse.json({ data: [] })
            }
        }

        // 3. Query leave_requests
        const selectFields = `
            id,
            reference_code,
            status,
            leave_type_id,
            start_date,
            end_date,
            total_days,
            is_half_day,
            half_day_period,
            reason,
            contact_during_leave,
            attachment_url,
            attachment_name,
            created_at,
            submitted_at,
            employee_id,
            employee:employees!leave_requests_employee_id_fkey(
                id,
                employee_code,
                first_name_th,
                last_name_th,
                department,
                position,
                email,
                work_location,
                photo_url
            )
        `.replace(/\s+/g, '')

        let query = supabaseAdmin
            .from('leave_requests')
            .select(selectFields)
            .gte('start_date', `${year}-01-01`)
            .lt('start_date', `${year + 1}-01-01`)

        if (filterSubordinates) {
            query = query.in('employee_id', subordinateIds)
        }
        if (status) {
            query = query.eq('status', status)
        }

        const { data: list, error: listErr } = await query
            .order('status', { ascending: true })
            .order('created_at', { ascending: false })

        if (listErr) {
            console.error('[leave/team] query leave requests error:', listErr)
            return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการคิวรีใบลา' }, { status: 500 })
        }

        // Map database response to match the camelCase structure that client components expect
        const data = (list ?? []).map(r => ({
            id: r.id,
            referenceCode: r.reference_code,
            status: r.status,
            leaveType: r.leave_type_id,
            startDate: r.start_date,
            endDate: r.end_date,
            totalDays: Number(r.total_days),
            isHalfDay: r.is_half_day,
            halfDayPeriod: r.half_day_period,
            reason: r.reason,
            contactDuringLeave: r.contact_during_leave,
            attachmentUrl: r.attachment_url,
            attachmentName: r.attachment_name,
            createdAt: r.created_at,
            submittedAt: r.submitted_at,
            employeeId: r.employee_id,
            employee: r.employee ? {
                id: r.employee.id,
                employeeCode: r.employee.employee_code,
                firstNameTH: r.employee.first_name_th,
                lastNameTH: r.employee.last_name_th,
                department: r.employee.department,
                position: r.employee.position,
                email: r.employee.email,
                workLocation: r.employee.work_location,
                photoUrl: r.employee.photo_url,
            } : null,
        }))

        return NextResponse.json({ data })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}
