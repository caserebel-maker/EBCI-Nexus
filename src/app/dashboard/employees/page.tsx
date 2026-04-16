import { EmployeesTable, Employee } from "./employees-table"
import { EmployeesHeader } from "./header"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { cookies } from "next/headers"

export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
    // 1. Get Session Info (for Audit/Role purposes)
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    let userRole = 'employee'

    if (sessionCookie?.value) {
        try {
            const session = JSON.parse(sessionCookie.value)
            userRole = session.role
        } catch (e) {
            console.error("Session parse error", e)
        }
    }

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
            <EmployeesTable initialData={employees} isHrAdmin={userRole === 'hr_admin'} />
        </div>
    )
}
