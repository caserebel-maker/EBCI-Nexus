import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

type EmployeeJoin = {
    id: string
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    department: string | null
    position: string | null
    email: string | null
}

type LeaveRequestRow = {
    id: string
    reference_code: string | null
    employee_id?: string | null
    leave_type_id: string
    start_date: string
    end_date: string
    total_days: number | string
    is_half_day: boolean | null
    half_day_period: string | null
    reason: string | null
    status: string
    approver_id?: string | null
    approved_at: string | null
    approval_notes?: string | null
    rejection_reason: string | null
    created_at: string
    updated_at: string | null
}

type LeaveRequestWithEmployee = LeaveRequestRow & {
    employee?: EmployeeJoin | EmployeeJoin[] | null
}

function joinedEmployee(value: LeaveRequestWithEmployee['employee']): EmployeeJoin | null {
    if (Array.isArray(value)) return value[0] ?? null
    return value ?? null
}

// GET /api/leave/requests — list leave requests
// Migrated from Prisma to Supabase to match live DB schema.
export async function GET(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()

    try {
        // ── Employee / Manager: own requests only ──────────────────────
        if (!isHrStaff(auth)) {
            const employeeId = await resolveSessionEmployeeId(auth.session)
            if (!employeeId) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 404 })

            let q = supabaseAdmin
                .from('leave_requests')
                .select(`
                    id, reference_code, leave_type_id, start_date, end_date,
                    total_days, is_half_day, half_day_period, reason,
                    status, approver_id, approved_at, rejection_reason,
                    created_at, updated_at
                `)
                .eq('employee_id', employeeId)
                .gte('start_date', `${year}-01-01`)
                .lt('start_date', `${year + 1}-01-01`)
                .order('created_at', { ascending: false })

            if (status) q = q.eq('status', status)

            const { data, error } = await q
            if (error) throw new Error(error.message)

            // Map to camelCase for backward compat with the frontend
            const mapped = ((data ?? []) as LeaveRequestRow[]).map(mapLeaveRow)
            return NextResponse.json({ data: mapped })
        }

        // ── HR Admin: all requests with filters ───────────────────────
        const department = searchParams.get('department')
        const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
        const leaveType = searchParams.get('leaveType')
        const employeeId = searchParams.get('employeeId')

        const startFilter = month
            ? `${year}-${String(month).padStart(2, '0')}-01`
            : `${year}-01-01`
        // Fix month overflow for December (month 12 → next year)
        const endYear = month === 12 ? year + 1 : year
        const endMonth = month === 12 ? 1 : (month ? month + 1 : null)
        const endFilterFixed = endMonth
            ? `${endYear}-${String(endMonth).padStart(2, '0')}-01`
            : `${year + 1}-01-01`

        let q = supabaseAdmin
            .from('leave_requests')
            .select(`
                id, reference_code, employee_id, leave_type_id,
                start_date, end_date, total_days,
                is_half_day, half_day_period,
                reason, status,
                approver_id, approved_at, approval_notes, rejection_reason,
                created_at, updated_at,
                employee:employees!leave_requests_employee_id_fkey (
                    id, employee_code, first_name_th, last_name_th,
                    department, position, email
                )
            `)
            .gte('start_date', startFilter)
            .lt('start_date', endFilterFixed)
            .order('created_at', { ascending: false })

        if (status) q = q.eq('status', status)
        if (leaveType) q = q.eq('leave_type_id', leaveType)
        if (employeeId) q = q.eq('employee_id', employeeId)

        const { data, error } = await q
        if (error) throw new Error(error.message)

        // Post-filter by department if specified (since department is on the joined employee)
        let results = (data ?? []) as LeaveRequestWithEmployee[]
        if (department) {
            results = results.filter(r => joinedEmployee(r.employee)?.department === department)
        }

        // Map to frontend-expected shape
        const mapped = results.map(r => {
            const employee = joinedEmployee(r.employee)
            return {
                ...mapLeaveRow(r),
                employee: employee ? {
                    id: employee.id,
                    employeeCode: employee.employee_code,
                    firstNameTH: employee.first_name_th,
                    lastNameTH: employee.last_name_th,
                    department: employee.department,
                    position: employee.position,
                    email: employee.email,
                } : null,
            }
        })

        return NextResponse.json({ data: mapped })
    } catch (err: unknown) {
        console.error('/api/leave/requests GET:', err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}

/**
 * Map a Supabase leave_requests row to the camelCase shape
 * the frontend LeaveRequest interface expects.
 */
function mapLeaveRow(r: LeaveRequestRow) {
    return {
        id: r.id,
        referenceCode: r.reference_code,
        leaveType: r.leave_type_id,       // DB column is leave_type_id
        startDate: r.start_date,
        endDate: r.end_date,
        totalDays: Number(r.total_days ?? 0),
        isHalfDay: r.is_half_day,
        halfDayPeriod: r.half_day_period,
        reason: r.reason,
        status: r.status,
        approvedAt: r.approved_at,
        approvalNotes: r.approval_notes,
        rejectionReason: r.rejection_reason,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }
}

// POST /api/leave/requests — create a new leave request
// Migrated from Prisma to Supabase.
export async function POST(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { leaveType, startDate, endDate, reason, isHalfDay, halfDayPeriod } = body

        if (!leaveType || !startDate || !endDate || !reason) {
            return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 })
        }

        const start = new Date(startDate)
        const end = new Date(endDate)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง' }, { status: 400 })
        }
        if (end < start) {
            return NextResponse.json({ error: 'วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่มต้น' }, { status: 400 })
        }

        // Resolve employee
        const { data: employee } = await supabaseAdmin
            .from('employees')
            .select('id, leave_approver_id')
            .eq('user_id', auth.session.id)
            .single()

        if (!employee) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 404 })

        // Calculate working days
        const totalDays = isHalfDay ? 0.5 : calcWorkingDays(start, end)

        // Generate reference code
        const year = start.getFullYear()
        const { count } = await supabaseAdmin
            .from('leave_requests')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${year}-01-01`)
            .lt('created_at', `${year + 1}-01-01`)

        const refCode = `LV-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`

        const { data: created, error } = await supabaseAdmin
            .from('leave_requests')
            .insert({
                employee_id: employee.id,
                leave_type_id: leaveType,
                start_date: startDate,
                end_date: endDate,
                total_days: totalDays,
                is_half_day: isHalfDay ?? false,
                half_day_period: halfDayPeriod ?? null,
                reason,
                status: 'pending',
                reference_code: refCode,
                approver_id: employee.leave_approver_id ?? null,
                submitted_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (error) throw new Error(error.message)

        return NextResponse.json({ data: created }, { status: 201 })
    } catch (err: unknown) {
        console.error('/api/leave/requests POST:', err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}

// Calculate working days between two dates (excluding weekends)
function calcWorkingDays(start: Date, end: Date): number {
    let count = 0
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    while (cur <= endDay) {
        const dow = cur.getDay()
        if (dow !== 0 && dow !== 6) count++
        cur.setDate(cur.getDate() + 1)
    }
    return count
}
