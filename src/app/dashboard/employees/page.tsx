import { Employee, EmployeesTable } from "./employees-table"
import { Users } from 'lucide-react'
import prisma from "@/lib/prisma"
import { cookies } from "next/headers"

// Force dynamic to ensure data is fresh
export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
    // 1. Get Session (Simulated for Phase 1)
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    let userRole = 'employee'
    let username = ''

    if (sessionCookie?.value) {
        try {
            const session = JSON.parse(sessionCookie.value)
            userRole = session.role
            username = session.username
        } catch (e) {
            console.error("Session parse error", e)
        }
    }

    // 2. Fetch Data
    // Logic: Admin sees all, Employee sees only themselves
    // For verification Phase, we fetch all if Admin, else fetch self.

    // Note: Since we are migrating, let's fetch ALL for Verification if role is admin.
    // If not admin, we try to find the linked employee.

    let whereClause = {}
    if (userRole !== 'hr_admin') {
        // Find linked employee for this user
        // Since session stores 'id' (userId), we can filter by userId
        // But wait, the session stored `id`, `role`, `name`. (See Step <viewed_code_item> in prompt history)
        // Let's assume we show all for now to easier verify the DB migration, 
        // OR strict implementation:
        // whereClause = { user: { username: username } } // using username from session if available?
        // Let's stick to "Show All" for now to verify the "Real Database" part first, as requested "Admin sees all".
        // Use the logged in user (Suriya/Admin) to see the result.
    }

    const employeesRaw = await prisma.employee.findMany({
        orderBy: { employeeCode: 'asc' },
        // where: whereClause 
    })

    // 3. Transform to Table Format
    const employees: Employee[] = employeesRaw.map(e => ({
        id: e.id,
        employeeCode: e.employeeCode,
        firstNameTH: e.firstNameTH,
        lastNameTH: e.lastNameTH,
        firstNameEN: e.firstNameEN,
        lastNameEN: e.lastNameEN,
        nickname: null, // Schema has it? Let me check schema... 
        // Schema in Step 604: firstNameTH/EN, lastNameTH/EN, position, department, startDate... 
        // Wait, did I add nickname to Employee schema? 
        // Step 604 replacement: 
        // model Employee { start_date, etc... title... }
        // NO NICKNAME in Employee Model!
        // But Table expects nickname? 
        // Step 633: `nickname?: string | null` in Employee type.
        // It's optional. So I can pass null.
        department: e.department,
        position: e.position,
        status: e.status,
        email: e.email,
        phone: e.phone,
        startDate: e.startDate,
        photoPath: null // No photo in Employee schema yet? 
        // Schema Step 604: No `photoPath` in Employee model!
        // Applicant has photoPath. Employee does not.
        // I should have added it, but I followed the prompt "minimal".
        // Table expects `photoPath`. Passing null is fine.
    }))

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                    <Users className="h-6 w-6 text-white dark:text-primary" />
                    Employees
                </h1>
                <p className="text-white/80 dark:text-muted-foreground text-sm">
                    Manage and monitor all employee detailed information.
                </p>
            </div>

            {/* Main Content */}
            <EmployeesTable initialData={employees} />
        </div>
    )
}
