import { supabaseAdmin } from "@/lib/supabase-admin"
import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { EmployeeProfileView } from "./employee-profile-view"
import { getCurrentPermissions } from "@/lib/permissions-server"
import type { BalanceCell } from "@/components/hradmin/leave/types"

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

    // ── Leave balances (current year) ──────────────────────────────────────────
    // Pulls every leave-type row even when the employee hasn't taken any
    // — the AdjustBalanceModal needs the full set so HR can grant a
    // type that hasn't been seeded yet (e.g. ลาคลอด for someone newly
    // assigned female after gender update). Numeric columns come back
    // as strings from PG, so we coerce defensively before passing on.
    const currentYear = new Date().getFullYear()
    const { data: leaveBalancesRaw } = await supabaseAdmin
        .from('leave_balances')
        .select('id, employee_id, leave_type_id, total_days, used_days, pending_days, remaining_days, is_manually_adjusted, last_adjusted_by, last_adjusted_at, notes')
        .eq('employee_id', employee.id)
        .eq('year', currentYear)

    type RawBalance = {
        id: string
        employee_id: string
        leave_type_id: string
        total_days: number | string | null
        used_days: number | string | null
        pending_days: number | string | null
        remaining_days: number | string | null
        is_manually_adjusted: boolean | null
        last_adjusted_by: string | null
        last_adjusted_at: string | null
        notes: string | null
    }

    const num = (v: number | string | null): number => {
        if (v === null || v === undefined) return 0
        const n = typeof v === 'string' ? parseFloat(v) : v
        return Number.isFinite(n) ? n : 0
    }

    const balanceCells: Record<string, BalanceCell> = {}
    for (const b of (leaveBalancesRaw ?? []) as RawBalance[]) {
        balanceCells[b.leave_type_id] = {
            id: b.id,
            employee_id: b.employee_id,
            leave_type_id: b.leave_type_id,
            total_days: num(b.total_days),
            used_days: num(b.used_days),
            pending_days: num(b.pending_days),
            remaining_days: b.remaining_days === null ? null : num(b.remaining_days),
            is_manually_adjusted: b.is_manually_adjusted,
            last_adjusted_by: b.last_adjusted_by,
            last_adjusted_at: b.last_adjusted_at,
            last_adjusted_by_name: null,
            notes: b.notes,
        }
    }

    // Resolve adjuster names so the modal's history footer shows who
    // last touched each row (matches the balances tab affordance).
    const adjusterIds = Array.from(new Set(
        Object.values(balanceCells)
            .map(c => c.last_adjusted_by)
            .filter((v): v is string => !!v),
    ))
    if (adjusterIds.length > 0) {
        const { data: adjusters } = await supabaseAdmin
            .from('User')
            .select('id, name, username')
            .in('id', adjusterIds)
        const nameById = new Map((adjusters ?? []).map(u => [u.id as string, (u.name as string | null) ?? (u.username as string | null) ?? null]))
        for (const cell of Object.values(balanceCells)) {
            if (cell.last_adjusted_by) {
                cell.last_adjusted_by_name = nameById.get(cell.last_adjusted_by) ?? null
            }
        }
    }

    // Active leave types — needed to populate the modal's row list and
    // surface types the employee hasn't taken yet but might be granted.
    const { data: leaveTypesRaw } = await supabaseAdmin
        .from('leave_types')
        .select('id, name_th, color, icon, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false })
    const leaveTypes = (leaveTypesRaw ?? []) as Array<{
        id: string
        name_th: string
        color: string | null
        icon: string | null
        display_order: number | null
    }>

    // Legacy chart shape — kept until the chart in employee-profile-view
    // is migrated to read `total_days` directly. Maps the canonical cells
    // back to the older `{leave_type, entitled_days, used_days, remaining_days}`
    // structure the chart already understands.
    const leaveBalances = Object.values(balanceCells).map(c => ({
        leave_type: c.leave_type_id,
        entitled_days: c.total_days,
        used_days: c.used_days,
        remaining_days: c.remaining_days ?? Math.max(0, c.total_days - c.used_days - c.pending_days),
    }))

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
            balanceCells={balanceCells}
            leaveTypes={leaveTypes}
            balanceYear={currentYear}
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
