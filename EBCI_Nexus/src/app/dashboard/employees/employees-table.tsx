"use client"

import { useState } from "react"
import { Search, Filter, MoreHorizontal, User, Building, Briefcase, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/contexts/language-context"

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

    const { t } = useTranslation()

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
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-xl">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                    <input
                        type="text"
                        placeholder={t('employees.searchPlaceholder')}
                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-white/10 bg-black/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        className="h-10 px-3 rounded-lg border border-white/10 bg-black/20 text-white text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="all" className="bg-slate-900 text-white">{t('employees.filter.all')}</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept} className="bg-slate-900 text-white">{dept}</option>
                        ))}
                    </select>

                    <select
                        className="h-10 px-3 rounded-lg border border-white/10 bg-black/20 text-white text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all" className="bg-slate-900 text-white">{t('employees.filter.all')}</option>
                        <option value="active" className="bg-slate-900 text-white">{t('employees.filter.active')}</option>
                        <option value="on_leave" className="bg-slate-900 text-white">{t('employees.filter.active')}</option>
                        <option value="inactive" className="bg-slate-900 text-white">{t('employees.filter.inactive')}</option>
                    </select>
                </div>
            </div>

            {/* Table Content */}
            <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-white/70 font-medium uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">{t('employees.table.name')}</th>
                                <th className="px-6 py-4">{t('employees.table.position')}</th>
                                <th className="px-6 py-4">{t('employees.table.status')}</th>
                                <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredData.length > 0 ? (
                                filteredData.map((employee) => (
                                    <tr
                                        key={employee.id}
                                        onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
                                        className="hover:bg-white/5 transition-colors group cursor-pointer text-white/90"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold border border-white/10 overflow-hidden text-lg">
                                                    {employee.photoPath ? (
                                                        <img src={employee.photoPath} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        employee.firstNameEN ? employee.firstNameEN.charAt(0) : employee.firstNameTH.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white">{employee.firstNameTH} {employee.lastNameTH}</div>
                                                    <div className="text-xs text-white/50 font-mono">{employee.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-white">
                                                    <Briefcase className="h-3.5 w-3.5 text-white/50" />
                                                    <span>{employee.position}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white/50 text-xs">
                                                    <Building className="h-3.5 w-3.5" />
                                                    <span>{employee.department}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px] border border-white/10">
                                                        {employee.employeeCode}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={employee.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-white/40">
                                            <User className="h-12 w-12 mb-4 opacity-50" />
                                            <p className="text-lg font-medium">No employees found</p>
                                            <p className="text-sm opacity-70">Try adjusting your search or filters.</p>
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
    const { t } = useTranslation()
    // DB status is lowercase, map to styles
    const styles: Record<string, string> = {
        "active": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        "inactive": "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
        "on_leave": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    }

    // Display labels
    const labels: Record<string, string> = {
        "active": t('employees.filter.active'),
        "inactive": t('employees.filter.inactive'),
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
