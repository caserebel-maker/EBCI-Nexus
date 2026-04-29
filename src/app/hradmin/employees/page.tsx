import { EmployeesTable, Employee } from "./employees-table"
import { EmployeesHeader } from "./header"
import { ContractsCoverageBanner } from "@/components/hradmin/employees/ContractsCoverageBanner"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getSession } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
    // 1. Get Session Info (for Audit/Role purposes)
    const session = await getSession()
    const userRole = session?.role ?? 'employee'

    // 2. Fetch Employees from Supabase
    // We join with applicants to get the photo_path and other original details
    const { data: employeesRaw, error } = await supabaseAdmin
        .from('employees')
        .select(`
            *,
            applicants (
                photo_path,
                nickname
            )
        `)
        .order('employee_code', { ascending: true })

    if (error) {
        console.error("Supabase Employees Fetch Error:", error)
    }

    // ── Contracts coverage stats (HR-only banner) ──────────────────────────────
    // Goal: every active employee has ≥ 1 contract on file within 3 months
    // (decided with HR Apr 27 2026). We surface a progress bar at the top of
    // the list so HR can see at a glance how the backfill is going.
    const isHr = userRole === 'hr_admin'
    let contractsCoverage: { withContract: number; activeTotal: number } | null = null
    if (isHr) {
        const activeTotal = (employeesRaw ?? []).filter((e: any) => e.status === 'active').length
        const { data: covRows } = await supabaseAdmin
            .from('employee_contracts')
            .select('employee_id')
            .is('deleted_at', null)
        const withContract = new Set((covRows ?? []).map((r: any) => r.employee_id as string)).size
        contractsCoverage = { withContract, activeTotal }
    }

    // 3. Transform to Table Format
    const employees: Employee[] = (employeesRaw || []).map((e: any) => ({
        id: e.id,
        employeeCode: e.employee_code,
        firstNameTH: e.first_name_th,
        lastNameTH: e.last_name_th,
        firstNameEN: e.first_name_en,
        lastNameEN: e.last_name_en,
        nickname: e.nickname || e.applicants?.nickname || null,
        department: e.department,
        position: e.position,
        status: e.status,
        email: e.email,
        phone: e.phone,
        startDate: new Date(e.start_date || Date.now()),
        photoUrl: e.photo_url || null,
        photoPath: e.applicants?.photo_path || null,
        quitDate: e.quit_date ?? null,
        quitReason: e.quit_reason ?? null,
        approvalLevel: e.approval_level ?? null,
    }))

    return (
        <div className="space-y-6">
            <EmployeesHeader />
            {contractsCoverage && (
                <ContractsCoverageBanner
                    withContract={contractsCoverage.withContract}
                    activeTotal={contractsCoverage.activeTotal}
                />
            )}
            <EmployeesTable initialData={employees} isHrAdmin={userRole === 'hr_admin'} />
        </div>
    )
}
