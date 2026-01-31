"use client"

import { useState } from "react"
import { Search, Filter, MoreHorizontal, User, Building, Briefcase, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

// Real Data Type (Matches Prisma)
export type Employee = {
    id: string
    employeeCode: string
    firstNameTH: string
    lastNameTH: string
    firstNameEN?: string | null
    lastNameEN?: string | null
    nickname?: string | null
    department: string
    position: string
    status: string // active, inactive, on_leave
    email: string
    phone?: string | null
    startDate: Date
    photoPath?: string | null
}

interface EmployeesTableProps {
    initialData: Employee[]
}

export function EmployeesTable({ initialData }: EmployeesTableProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [deptFilter, setDeptFilter] = useState<string>("all")

    // Filtering Logic
    const filteredData = initialData.filter((employee) => {
        const fullNameTH = `${employee.firstNameTH} ${employee.lastNameTH}`.toLowerCase()
        const fullNameEN = `${employee.firstNameEN || ""} ${employee.lastNameEN || ""}`.toLowerCase()

        const matchesSearch =
            fullNameTH.includes(searchTerm.toLowerCase()) ||
            fullNameEN.includes(searchTerm.toLowerCase()) ||
            employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || employee.status === statusFilter
        const matchesDept = deptFilter === "all" || employee.department === deptFilter

        return matchesSearch && matchesStatus && matchesDept
    })

    // Group unique departments for filter dropdown
    const departments = Array.from(new Set(initialData.map(e => e.department)))

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-4 rounded-lg border border-border shadow-sm">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or email..."
                        className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        className="h-10 px-3 rounded-md border border-input bg-card text-foreground text-sm focus:outline-none focus:border-primary"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="all">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>

                    <select
                        className="h-10 px-3 rounded-md border border-input bg-card text-foreground text-sm focus:outline-none focus:border-primary"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Table Content */}
            <div className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredData.length > 0 ? (
                                filteredData.map((employee) => (
                                    <tr
                                        key={employee.id}
                                        onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
                                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 overflow-hidden">
                                                    {employee.photoPath ? (
                                                        <img src={employee.photoPath} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        employee.firstNameEN ? employee.firstNameEN.charAt(0) : employee.firstNameTH.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground">{employee.firstNameTH} {employee.lastNameTH}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{employee.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-foreground">
                                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>{employee.position}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                    <Building className="h-3.5 w-3.5" />
                                                    <span>{employee.department}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] border border-border">
                                                        {employee.employeeCode}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={employee.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <User className="h-12 w-12 mb-4 opacity-20" />
                                            <p className="text-lg font-medium">No employees found</p>
                                            <p className="text-sm">Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-4">
                Showing {filteredData.length} of {initialData.length} employees
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    // DB status is lowercase, map to styles
    const styles: Record<string, string> = {
        "active": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        "inactive": "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
        "on_leave": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    }

    // Display labels
    const labels: Record<string, string> = {
        "active": "Active",
        "inactive": "Inactive",
        "on_leave": "On Leave"
    }

    const defaultStyle = "bg-primary/10 text-primary border-primary/20"

    return (
        <span className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1.5",
            styles[status] || defaultStyle
        )}>
            <span className={cn("h-1.5 w-1.5 rounded-full",
                status === 'active' ? 'bg-current' :
                    status === 'inactive' ? 'bg-current opacity-50' : 'bg-current animate-pulse'
            )} />
            {labels[status] || status}
        </span>
    )
}
