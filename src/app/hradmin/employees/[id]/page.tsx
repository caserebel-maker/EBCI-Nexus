import { supabaseAdmin } from "@/lib/supabase-admin"
import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { EmployeeProfileView } from "./employee-profile-view"
import { getCurrentPermissions } from "@/lib/permissions-server"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: PageProps) {
    const { id } = await params
    console.log(`[employee-detail] requested id="${id}"`)

    // Resolve role from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    let isHrAdmin = false
    if (sessionCookie?.value) {
        try {
            const session = JSON.parse(sessionCookie.value)
            isHrAdmin = session.role === 'hr_admin'
        } catch { /* ignore */ }
    }

    // ── Fetch employee — try employee_code first, fallback to UUID ─────────────
    // employee_code: text ID used in URLs (e.g. EMP001)
    // id (UUID): legacy links may still use this
    const SELECT = `*, applicants (photo_path, nickname, phone, email, current_address)`

    let employee: any = null
    const { data: byCode, error: codeError } = await supabaseAdmin
        .from('employees')
        .select(SELECT)
        .eq('employee_code', id)
        .maybeSingle()

    if (byCode) {
        employee = byCode
    } else {
        console.error(`[employee-detail] employee_code lookup failed for "${id}":`, JSON.stringify(codeError))
        // Fallback: try UUID (old links)
        const { data: byUuid, error: uuidError } = await supabaseAdmin
            .from('employees')
            .select(SELECT)
            .eq('id', id)
            .maybeSingle()
        if (byUuid) {
            employee = byUuid
        } else {
            console.error(`[employee-detail] UUID lookup also failed for "${id}":`, JSON.stringify(uuidError))
            notFound()
        }
    }

    const displayName = `${employee.first_name_th} ${employee.last_name_th}`

    // ── Photo URL ──────────────────────────────────────────────────────────────
    let photoUrl: string | null = employee.photo_url ?? null
    if (!photoUrl) {
        const legacyPath = employee.applicants?.photo_path
        if (legacyPath) {
            const { data } = await supabaseAdmin.storage
                .from('applicant-assets')
                .createSignedUrl(legacyPath, 3600)
            photoUrl = data?.signedUrl ?? null
        }
    }

    // ── All employees for supervisor dropdown ──────────────────────────────────
    const { data: allEmployeesRaw } = await supabaseAdmin
        .from('employees')
        .select('id, first_name_th, last_name_th, position')
        .eq('status', 'active')
        .neq('id', employee.id)
        .order('first_name_th', { ascending: true })

    const allEmployees: { id: string; first_name_th: string; last_name_th: string; position: string }[] =
        allEmployeesRaw ?? []

    // ── Supervisor name ────────────────────────────────────────────────────────
    let supervisorName = '—'
    if (employee.manager_id) {
        const sup = allEmployeesRaw?.find(e => e.id === employee.manager_id)
            ?? (await supabaseAdmin
                .from('employees')
                .select('first_name_th, last_name_th')
                .eq('id', employee.manager_id)
                .single()
                .then(r => r.data))
        if (sup) supervisorName = `${sup.first_name_th} ${sup.last_name_th}`
    }

    // ── Leave balances ─────────────────────────────────────────────────────────
    const { data: leaveBalancesRaw } = await supabaseAdmin
        .from('leave_balances')
        .select('leave_type, entitled_days, used_days, remaining_days')
        .eq('employee_id', employee.id)

    const leaveBalances: { leave_type: string; entitled_days: number; used_days: number; remaining_days: number }[] =
        leaveBalancesRaw ?? []

    // ── Payroll permission gate ────────────────────────────────────────────────
    // Only users with can_manage_payroll see the salary-slips card.
    // HR Manager (มด) hits this page fine but the slips section is hidden.
    const perms = await getCurrentPermissions()
    const canViewPayroll = perms.can_manage_payroll === true

    // ── Salary slips (only fetched when viewer has the flag) ───────────────────
    let salarySlips: Array<{
        id: string; year: number; month: number;
        file_name: string | null; file_size: number | null;
        mime_type: string | null; notes: string | null;
        uploaded_at: string;
    }> = []
    if (canViewPayroll) {
        const { data: slipsRaw } = await supabaseAdmin
            .from('salary_slips')
            .select('id, year, month, file_name, file_size, mime_type, notes, uploaded_at')
            .eq('employee_id', employee.id)
            .is('deleted_at', null)
            .order('year', { ascending: false })
            .order('month', { ascending: false })
        salarySlips = (slipsRaw ?? []) as typeof salarySlips
    }

    // ── Employment contracts (HR scans) ────────────────────────────────────────
    // Returned newest-first so the most recent contract is the one HR
    // sees first when scrolling. Soft-deleted rows are filtered out
    // so HR doesn't have to ignore the trash.
    const { data: contractsRaw } = await supabaseAdmin
        .from('employee_contracts')
        .select('id, contract_type, signed_date, effective_start, effective_end, file_path, file_name, file_size, mime_type, page_count, notes, uploaded_at')
        .eq('employee_id', employee.id)
        .is('deleted_at', null)
        .order('signed_date', { ascending: false })

    const contracts = (contractsRaw ?? []) as Array<{
        id: string
        contract_type: 'probation' | 'permanent' | 'amendment' | 'renewal' | 'termination'
        signed_date: string
        effective_start: string | null
        effective_end: string | null
        file_path: string
        file_name: string | null
        file_size: number | null
        mime_type: string | null
        page_count: number | null
        notes: string | null
        uploaded_at: string
    }>

    // ── All leave requests ─────────────────────────────────────────────────────
    const { data: recentLeavesRaw } = await supabaseAdmin
        .from('leave_requests')
        .select('id, leave_type, start_date, end_date, days, status, created_at, reason')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })

    const recentLeaves: {
        id: string
        leave_type: string
        start_date: string
        end_date: string
        days: number
        status: string
        created_at: string
        reason: string | null
    }[] = recentLeavesRaw ?? []

    // ── Tenure ─────────────────────────────────────────────────────────────────
    const startDate = new Date(employee.start_date)
    const now = new Date()
    const tenureMonths = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
    const tenureYears = Math.floor(tenureMonths / 12)
    const tenureRem = tenureMonths % 12
    const tenure = tenureYears > 0
        ? `${tenureYears} ปี${tenureRem > 0 ? ` ${tenureRem} เดือน` : ''}`
        : `${tenureRem} เดือน`

    return (
        <EmployeeProfileView
            employee={employee}
            photoUrl={photoUrl}
            displayName={displayName}
            supervisorName={supervisorName}
            tenure={tenure}
            leaveBalances={leaveBalances}
            recentLeaves={recentLeaves}
            allEmployees={allEmployees}
            id={id}
            isHrAdmin={isHrAdmin}
            contracts={contracts}
            canViewPayroll={canViewPayroll}
            salarySlips={salarySlips}
        />
    )
}
