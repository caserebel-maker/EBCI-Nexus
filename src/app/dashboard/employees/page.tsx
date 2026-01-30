import { Employee, EmployeesTable } from "./employees-table"
import { Users } from 'lucide-react'

// Mock Data (Phase 3.9)
const MOCK_EMPLOYEES: Employee[] = [
    { id: "1", employeeId: "EMP-001", name: "Somchai Jai-dee", email: "somchai@ebci.co.th", department: "Human Resources", position: "HR Manager", status: "Active" },
    { id: "2", employeeId: "EMP-002", name: "Sarah Connor", email: "sarah@ebci.co.th", department: "IT", position: "Senior Developer", status: "Active" },
    { id: "3", employeeId: "EMP-003", name: "John Doe", email: "john@ebci.co.th", department: "Marketing", position: "Marketing Specialist", status: "On Leave" },
    { id: "4", employeeId: "EMP-004", name: "Suriya Pond", email: "pond@ebci.co.th", department: "Management", position: "CEO", status: "Active" },
    { id: "5", employeeId: "EMP-005", name: "Jane Smith", email: "jane@ebci.co.th", department: "Accounting", position: "Accountant", status: "Active" },
    { id: "6", employeeId: "EMP-008", name: "Robert Brown", email: "robert@ebci.co.th", department: "IT", position: "System Admin", status: "Inactive" },
    { id: "7", employeeId: "EMP-012", name: "Emily White", email: "emily@ebci.co.th", department: "Sales", position: "Sales Manager", status: "Active" },
    { id: "8", employeeId: "EMP-015", name: "Michael Green", email: "michael@ebci.co.th", department: "IT", position: "DevOps Engineer", status: "Active" },
    { id: "9", employeeId: "EMP-020", name: "Linda Black", email: "linda@ebci.co.th", department: "Human Resources", position: "Recruiter", status: "On Leave" },
    { id: "10", employeeId: "EMP-022", name: "David Gray", email: "david@ebci.co.th", department: "Sales", position: "Sales Executive", status: "Inactive" },
]

export default function EmployeesPage() {
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
            <EmployeesTable initialData={MOCK_EMPLOYEES} />
        </div>
    )
}
