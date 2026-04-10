"use client"

import { useState } from "react"
import { Search, User, Building, Briefcase, ArrowUpDown, UserPlus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/contexts/language-context"

const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
}
const silverOverlay: React.CSSProperties = {
    ...glassCard,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(200,200,220,0.04) 50%, rgba(255,255,255,0.07) 100%)',
}

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
    status: string
    email: string
    phone?: string | null
    startDate: Date
    photoPath?: string | null
}

type SortKey = "name_asc" | "name_desc" | "status" | "tenure_desc" | "tenure_asc" | "dept_asc"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "name_asc",    label: "ชื่อ (ก → ฮ)" },
    { value: "name_desc",   label: "ชื่อ (ฮ → ก)" },
    { value: "status",      label: "สถานะ (ปฏิบัติงานก่อน)" },
    { value: "tenure_desc", label: "อายุงาน (มากไปน้อย)" },
    { value: "tenure_asc",  label: "อายุงาน (น้อยไปมาก)" },
    { value: "dept_asc",    label: "ฝ่าย (ก → ฮ)" },
]

function sortEmployees(data: Employee[], key: SortKey): Employee[] {
    const sorted = [...data]
    switch (key) {
        case "name_asc":
            return sorted.sort((a, b) =>
                `${a.firstNameTH}${a.lastNameTH}`.localeCompare(`${b.firstNameTH}${b.lastNameTH}`, 'th'))
        case "name_desc":
            return sorted.sort((a, b) =>
                `${b.firstNameTH}${b.lastNameTH}`.localeCompare(`${a.firstNameTH}${a.lastNameTH}`, 'th'))
        case "status":
            return sorted.sort((a, b) => {
                const order: Record<string, number> = { active: 0, on_leave: 1, inactive: 2 }
                return (order[a.status] ?? 9) - (order[b.status] ?? 9)
            })
        case "tenure_desc":
            return sorted.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        case "tenure_asc":
            return sorted.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        case "dept_asc":
            return sorted.sort((a, b) => a.department.localeCompare(b.department, 'th'))
        default:
            return sorted
    }
}

function tenureText(startDate: Date): string {
    const start = new Date(startDate)
    const now = new Date()
    const years = now.getFullYear() - start.getFullYear()
    const months = now.getMonth() - start.getMonth() + years * 12
    const y = Math.floor(months / 12)
    const m = months % 12
    if (y > 0 && m > 0) return `${y} ปี ${m} เดือน`
    if (y > 0) return `${y} ปี`
    return `${m} เดือน`
}

interface EmployeesTableProps {
    initialData: Employee[]
    isHrAdmin?: boolean
}

export function EmployeesTable({ initialData, isHrAdmin }: EmployeesTableProps) {
    const router = useRouter()
    const { t } = useTranslation()
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [deptFilter, setDeptFilter] = useState<string>("all")
    const [sortKey, setSortKey] = useState<SortKey>("name_asc")

    const departments = Array.from(new Set(initialData.map(e => e.department))).sort((a, b) =>
        a.localeCompare(b, 'th'))

    const filtered = initialData.filter((e) => {
        const fullTH = `${e.firstNameTH} ${e.lastNameTH}`.toLowerCase()
        const fullEN = `${e.firstNameEN || ""} ${e.lastNameEN || ""}`.toLowerCase()
        const matchSearch =
            fullTH.includes(searchTerm.toLowerCase()) ||
            fullEN.includes(searchTerm.toLowerCase()) ||
            e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchStatus = statusFilter === "all" || e.status === statusFilter
        const matchDept = deptFilter === "all" || e.department === deptFilter
        return matchSearch && matchStatus && matchDept
    })

    const displayData = sortEmployees(filtered, sortKey)

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div style={silverOverlay} className="flex flex-col gap-3 p-4 shadow-xl">
                {/* Row 1: Search + Add button */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                        <input
                            type="text"
                            placeholder={t('employees.searchPlaceholder')}
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-white/10 bg-black/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 font-sans"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {isHrAdmin && (
                        <Link
                            href="/dashboard/employees/new"
                            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold bg-[#882136]/70 hover:bg-[#882136] text-white border border-[#ad5f6c]/30 hover:border-[#ad5f6c]/60 transition-all whitespace-nowrap shrink-0"
                        >
                            <UserPlus size={15} /> + เพิ่มพนักงาน
                        </Link>
                    )}
                </div>
                {/* Row 2: Filters + Sort */}
                <div className="flex flex-wrap gap-2">
                    {/* Department filter */}
                    <select
                        className="h-10 px-3 rounded-lg border border-white/10 bg-black/20 text-white text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer flex-1 min-w-[140px]"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="all" className="bg-slate-900">ทุกฝ่าย</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept} className="bg-slate-900">{dept}</option>
                        ))}
                    </select>

                    {/* Status filter */}
                    <select
                        className="h-10 px-3 rounded-lg border border-white/10 bg-black/20 text-white text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer flex-1 min-w-[120px]"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all" className="bg-slate-900">ทุกสถานะ</option>
                        <option value="active" className="bg-slate-900">ปฏิบัติงาน</option>
                        <option value="on_leave" className="bg-slate-900">ลา</option>
                        <option value="inactive" className="bg-slate-900">ลาออก/พักงาน</option>
                    </select>

                    {/* Sort */}
                    <div className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-white/10 bg-black/20 flex-1 min-w-[180px]">
                        <ArrowUpDown className="h-3.5 w-3.5 text-white/40 shrink-0" />
                        <select
                            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer w-full appearance-none"
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value as SortKey)}
                        >
                            {SORT_OPTIONS.map(o => (
                                <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div style={glassCard} className="overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-white/70 font-medium uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">{t('employees.table.name')}</th>
                                <th className="px-6 py-4">{t('employees.table.position')}</th>
                                <th className="px-6 py-4">อายุงาน</th>
                                <th className="px-6 py-4">{t('employees.table.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {displayData.length > 0 ? (
                                displayData.map((employee) => (
                                    <tr
                                        key={employee.id}
                                        onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
                                        className="hover:bg-white/5 transition-colors cursor-pointer text-white/90"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold border border-white/10 overflow-hidden text-lg shrink-0">
                                                    {employee.photoPath ? (
                                                        <img src={employee.photoPath} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        (employee.firstNameEN?.charAt(0) ?? employee.firstNameTH.charAt(0))
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white">
                                                        {employee.firstNameTH} {employee.lastNameTH}
                                                        {employee.nickname && <span className="text-white/45 font-normal ml-1">({employee.nickname})</span>}
                                                    </div>
                                                    <div className="text-xs text-white/50 font-mono">{employee.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-white">
                                                <Briefcase className="h-3.5 w-3.5 text-white/50 shrink-0" />
                                                <span className="truncate max-w-[160px]">{employee.position}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-white/50 text-xs mt-1">
                                                <Building className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate max-w-[160px]">{employee.department}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px] border border-white/10 shrink-0">
                                                    {employee.employeeCode}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-white/70 text-xs whitespace-nowrap">
                                            {tenureText(employee.startDate)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={employee.status} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-white/40">
                                            <User className="h-12 w-12 mb-4 opacity-50" />
                                            <p className="text-lg font-medium">ไม่พบพนักงาน</p>
                                            <p className="text-sm opacity-70">ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-xs text-white/40 text-center pt-2">
                แสดง {displayData.length} จาก {initialData.length} คน
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        "active":   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        "inactive": "bg-slate-500/15 text-slate-400 border-slate-500/20",
        "on_leave": "bg-amber-500/15 text-amber-400 border-amber-500/20",
    }
    const labels: Record<string, string> = {
        "active":   "ปฏิบัติงาน",
        "inactive": "ลาออก/พักงาน",
        "on_leave": "ลา",
    }
    return (
        <span className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1.5",
            styles[status] ?? "bg-primary/10 text-primary border-primary/20"
        )}>
            <span className={cn("h-1.5 w-1.5 rounded-full bg-current",
                status === "on_leave" && "animate-pulse"
            )} />
            {labels[status] ?? status}
        </span>
    )
}
