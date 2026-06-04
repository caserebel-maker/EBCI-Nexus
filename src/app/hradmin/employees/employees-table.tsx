"use client"

import { useState } from "react"
import { Search, User, Building, Briefcase, ArrowUpDown, UserPlus, Layers } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/contexts/language-context"
import { LEVEL_BADGE_COLORS, LEVEL_SHORT, EMPLOYEE_LEVELS } from "@/config/employee-levels"
import { DEPARTMENTS } from "@/config/departments"

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
    photoUrl?: string | null
    photoPath?: string | null
    quitDate?: string | null
    quitReason?: string | null
    approvalLevel?: number | null
    workLocation?: string | null
}

type SortKey =
    | "name_asc" | "name_desc"
    | "status" | "tenure_desc" | "tenure_asc" | "dept_asc"
    // Inactive-tab specific — quit_date / quit_reason rather than tenure.
    | "quit_date_desc" | "quit_date_asc" | "quit_reason_asc"

const ACTIVE_SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "name_asc",    label: "ชื่อ (ก → ฮ)" },
    { value: "name_desc",   label: "ชื่อ (ฮ → ก)" },
    { value: "status",      label: "สถานะ (ปฏิบัติงานก่อน)" },
    { value: "tenure_desc", label: "อายุงาน (มากไปน้อย)" },
    { value: "tenure_asc",  label: "อายุงาน (น้อยไปมาก)" },
    { value: "dept_asc",    label: "ฝ่าย (ก → ฮ)" },
]

const INACTIVE_SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "quit_date_desc",  label: "วันที่ออก (ใหม่สุดก่อน)" },
    { value: "quit_date_asc",   label: "วันที่ออก (เก่าสุดก่อน)" },
    { value: "quit_reason_asc", label: "สาเหตุ (ก → ฮ)" },
    { value: "name_asc",        label: "ชื่อ (ก → ฮ)" },
    { value: "dept_asc",        label: "ฝ่าย (ก → ฮ)" },
]

const QUIT_REASON_LABELS: Record<string, string> = {
    resigned:         "ลาออกเอง",
    retired:          "เกษียณอายุ",
    contract_ended:   "สัญญาหมด",
    other:            "อื่นๆ",
}

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
        case "quit_date_desc":
            // Newest quit first; rows missing quit_date sink to the bottom.
            return sorted.sort((a, b) => quitDateMs(b) - quitDateMs(a))
        case "quit_date_asc":
            return sorted.sort((a, b) => quitDateMs(a) - quitDateMs(b))
        case "quit_reason_asc":
            return sorted.sort((a, b) =>
                (QUIT_REASON_LABELS[a.quitReason ?? ''] ?? a.quitReason ?? 'ไม่ระบุ')
                    .localeCompare(QUIT_REASON_LABELS[b.quitReason ?? ''] ?? b.quitReason ?? 'ไม่ระบุ', 'th'))
        default:
            return sorted
    }
}

/** Quit timestamp for sorting; missing dates fall to the end (DESC) /
 *  start (ASC) by virtue of returning a sentinel value. */
function quitDateMs(e: Employee): number {
    if (!e.quitDate) return 0
    const t = new Date(e.quitDate).getTime()
    return Number.isFinite(t) ? t : 0
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
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active')
    const [searchTerm, setSearchTerm] = useState("")
    const [deptFilter, setDeptFilter] = useState<string>("all")
    const [levelFilter, setLevelFilter] = useState<string>("all")
    const [sortKey, setSortKey] = useState<SortKey>("name_asc")
    const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
    // Inactive-tab specific filters — only rendered when activeTab='inactive'.
    const [yearFilter, setYearFilter] = useState<string>("all")
    const [reasonFilter, setReasonFilter] = useState<string>("all")

    const activeEmployees = initialData.filter(e => e.status === 'active' || e.status === 'on_leave')
    const inactiveEmployees = initialData.filter(e => e.status !== 'active' && e.status !== 'on_leave')

    const tabData = activeTab === 'active' ? activeEmployees : inactiveEmployees

    const dbDepts = tabData.map(e => e.department).filter(Boolean)
    const departments = Array.from(new Set([...DEPARTMENTS, ...dbDepts])).sort((a, b) =>
        a.localeCompare(b, 'th'))

    // Year + reason filter dropdowns are only meaningful on the inactive
    // tab. Compute their option lists once from the visible tab data so
    // the dropdowns only show values that actually exist.
    const quitYears = activeTab === 'inactive'
        ? Array.from(new Set(
            inactiveEmployees
                .map(e => e.quitDate ? new Date(e.quitDate).getFullYear() : null)
                .filter((y): y is number => Boolean(y))
        )).sort((a, b) => b - a)  // newest year first
        : []

    const filtered = tabData.filter((e) => {
        const fullTH = `${e.firstNameTH} ${e.lastNameTH}`.toLowerCase()
        const fullEN = `${e.firstNameEN || ""} ${e.lastNameEN || ""}`.toLowerCase()
        const matchSearch =
            fullTH.includes(searchTerm.toLowerCase()) ||
            fullEN.includes(searchTerm.toLowerCase()) ||
            e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchDept = deptFilter === "all" || e.department === deptFilter
        const matchLevel = levelFilter === "all" || String(e.approvalLevel ?? 1) === levelFilter
        const matchYear = activeTab !== 'inactive' || yearFilter === "all"
            || (e.quitDate ? String(new Date(e.quitDate).getFullYear()) === yearFilter : false)
        const matchReason = activeTab !== 'inactive' || reasonFilter === "all"
            || (e.quitReason ?? '') === reasonFilter
        return matchSearch && matchDept && matchLevel && matchYear && matchReason
    })

    const displayData = sortEmployees(filtered, sortKey)
    const sortOptions = activeTab === 'inactive' ? INACTIVE_SORT_OPTIONS : ACTIVE_SORT_OPTIONS

    const handleTabChange = (tab: 'active' | 'inactive') => {
        setActiveTab(tab)
        setSearchTerm("")
        setDeptFilter("all")
        setLevelFilter("all")
        setYearFilter("all")
        setReasonFilter("all")
        // Default sort differs per tab — inactive tab is almost always
        // browsed by "who left most recently?" so newest quit_date wins.
        setSortKey(tab === 'inactive' ? 'quit_date_desc' : 'name_asc')
    }

    const openEmployee = (employeeCode: string) => {
        if (navigatingTo) return
        setNavigatingTo(employeeCode)
        window.dispatchEvent(new Event('nexus:route-progress:start'))
        router.push(`/hradmin/employees/${employeeCode}`)
    }

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => handleTabChange('active')}
                    className={cn(
                        "px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                        activeTab === 'active'
                            ? "bg-[#882136]/70 border-[#ad5f6c]/50 text-white shadow-lg"
                            : "bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8"
                    )}
                >
                    ปฏิบัติงาน
                    <span className={cn(
                        "ml-2 px-1.5 py-0.5 rounded-md text-[11px] font-bold",
                        activeTab === 'active' ? "bg-white/20 text-white" : "bg-white/10 text-white/40"
                    )}>
                        {activeEmployees.length}
                    </span>
                </button>
                <button
                    onClick={() => handleTabChange('inactive')}
                    className={cn(
                        "px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                        activeTab === 'inactive'
                            ? "bg-slate-600/70 border-slate-500/50 text-white shadow-lg"
                            : "bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8"
                    )}
                >
                    พ้นสภาพ
                    <span className={cn(
                        "ml-2 px-1.5 py-0.5 rounded-md text-[11px] font-bold",
                        activeTab === 'inactive' ? "bg-white/20 text-white" : "bg-white/10 text-white/40"
                    )}>
                        {inactiveEmployees.length}
                    </span>
                </button>
            </div>

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
                    {isHrAdmin && activeTab === 'active' && (
                        <Link
                            href="/hradmin/employees/new"
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

                    {/* Level filter */}
                    <div className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-white/10 bg-black/20 flex-1 min-w-[160px]">
                        <Layers className="h-3.5 w-3.5 text-white/40 shrink-0" />
                        <select
                            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer w-full appearance-none"
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                        >
                            <option value="all" className="bg-slate-900">ทุก Level</option>
                            {Object.entries(EMPLOYEE_LEVELS).map(([lvl, { label }]) => (
                                <option key={lvl} value={lvl} className="bg-slate-900">{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort — option list switches per tab so inactive
                        users see quit_date / quit_reason variants and not
                        irrelevant active-tab choices. */}
                    <div className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-white/10 bg-black/20 flex-1 min-w-[180px]">
                        <ArrowUpDown className="h-3.5 w-3.5 text-white/40 shrink-0" />
                        <select
                            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer w-full appearance-none"
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value as SortKey)}
                        >
                            {sortOptions.map(o => (
                                <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Inactive-tab extra filters: year + quit reason.
                    Hidden by default to avoid clutter on the active tab. */}
                {activeTab === 'inactive' && (
                    <div className="flex flex-wrap gap-2">
                        <select
                            className="h-10 px-3 rounded-lg border border-white/10 bg-black/20 text-white text-sm focus:outline-none cursor-pointer flex-1 min-w-[140px] appearance-none"
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                        >
                            <option value="all" className="bg-slate-900">ทุกปี</option>
                            {quitYears.map(y => (
                                <option key={y} value={String(y)} className="bg-slate-900">
                                    {/* Year shown as พ.ศ. for HR familiarity */}
                                    {y + 543} ({y})
                                </option>
                            ))}
                        </select>
                        <select
                            className="h-10 px-3 rounded-lg border border-white/10 bg-black/20 text-white text-sm focus:outline-none cursor-pointer flex-1 min-w-[160px] appearance-none"
                            value={reasonFilter}
                            onChange={(e) => setReasonFilter(e.target.value)}
                        >
                            <option value="all" className="bg-slate-900">ทุกสาเหตุ</option>
                            <option value="resigned"       className="bg-slate-900">ลาออกเอง</option>
                            <option value="retired"        className="bg-slate-900">เกษียณอายุ</option>
                            <option value="contract_ended" className="bg-slate-900">สัญญาหมด</option>
                            <option value="other"          className="bg-slate-900">อื่นๆ</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Table */}
            <div style={glassCard} className="overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    {activeTab === 'active' ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 text-white/70 font-medium uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-4 text-center w-10">#</th>
                                    <th className="px-6 py-4">{t('employees.table.name')}</th>
                                    <th className="px-6 py-4">{t('employees.table.position')}</th>
                                    <th className="px-6 py-4">อายุงาน</th>
                                    <th className="px-6 py-4">{t('employees.table.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {displayData.length > 0 ? (
                                    displayData.map((employee, idx) => (
                                        <tr
                                            key={employee.id}
                                            onClick={() => openEmployee(employee.employeeCode)}
                                            aria-busy={navigatingTo === employee.employeeCode}
                                            className={cn(
                                                "hover:bg-white/5 transition-colors cursor-pointer text-white/90",
                                                navigatingTo && navigatingTo !== employee.employeeCode && "pointer-events-none opacity-65",
                                                navigatingTo === employee.employeeCode && "bg-amber-400/10"
                                            )}
                                        >
                                            <td className="px-4 py-4 text-center text-white/35 font-mono text-xs select-none">
                                                {idx + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <EmployeeNameCell employee={employee} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <EmployeePositionCell employee={employee} />
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
                                    <EmptyRow colSpan={5} />
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 text-white/70 font-medium uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-4 text-center w-10">#</th>
                                    <th className="px-6 py-4">{t('employees.table.name')}</th>
                                    <th className="px-6 py-4">{t('employees.table.position')}</th>
                                    <th className="px-6 py-4">อายุงาน</th>
                                    <th className="px-6 py-4">วันที่พ้นสภาพ</th>
                                    <th className="px-6 py-4">สาเหตุ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {displayData.length > 0 ? (
                                    displayData.map((employee, idx) => (
                                        <tr
                                            key={employee.id}
                                            onClick={() => openEmployee(employee.employeeCode)}
                                            aria-busy={navigatingTo === employee.employeeCode}
                                            className={cn(
                                                "hover:bg-white/5 transition-colors cursor-pointer text-white/90",
                                                navigatingTo && navigatingTo !== employee.employeeCode && "pointer-events-none opacity-65",
                                                navigatingTo === employee.employeeCode && "bg-amber-400/10"
                                            )}
                                        >
                                            <td className="px-4 py-4 text-center text-white/35 font-mono text-xs select-none">
                                                {idx + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <EmployeeNameCell employee={employee} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <EmployeePositionCell employee={employee} />
                                            </td>
                                            <td className="px-6 py-4 text-white/70 text-xs whitespace-nowrap">
                                                {tenureText(employee.startDate)}
                                            </td>
                                            <td className="px-6 py-4 text-white/60 text-xs whitespace-nowrap">
                                                {employee.quitDate
                                                    ? new Date(employee.quitDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : <span className="text-white/25">-</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                {employee.quitReason ? (
                                                    <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/20 text-xs">
                                                        {QUIT_REASON_LABELS[employee.quitReason] ?? employee.quitReason}
                                                    </span>
                                                ) : (
                                                    <span className="text-white/25 text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <EmptyRow colSpan={6} variant="inactive" />
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="text-xs text-white/40 text-center pt-2">
                แสดง {displayData.length} จาก {tabData.length} คน
            </div>
        </div>
    )
}

function EmployeeNameCell({ employee }: { employee: Employee }) {
    const lvl = employee.approvalLevel ?? 1
    const badgeColor = LEVEL_BADGE_COLORS[lvl] ?? LEVEL_BADGE_COLORS[1]
    const badgeLabel = LEVEL_SHORT[lvl] ?? `Lv.${lvl}`
    return (
        <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold border border-white/10 overflow-hidden text-lg shrink-0">
                {(employee.photoUrl || employee.photoPath) ? (
                    <img src={employee.photoUrl ?? employee.photoPath!} alt="" className="w-full h-full object-cover" />
                ) : (
                    (employee.firstNameEN?.charAt(0) ?? employee.firstNameTH.charAt(0))
                )}
            </div>
            <div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">
                        {employee.firstNameTH} {employee.lastNameTH}
                        {employee.nickname && <span className="text-white/45 font-normal ml-1">({employee.nickname})</span>}
                    </span>
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", badgeColor)}>
                        {badgeLabel}
                    </span>
                    {employee.workLocation === 'johnson' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                            จอห์นสัน
                        </span>
                    )}
                    {employee.workLocation === 'saraburi' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                            สระบุรี (WFH)
                        </span>
                    )}
                </div>
                <div className="text-xs text-white/50 font-mono">{employee.email}</div>
            </div>
        </div>
    )
}

function EmployeePositionCell({ employee }: { employee: Employee }) {
    return (
        <>
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
        </>
    )
}

function EmptyRow({ colSpan, variant = 'active' }: { colSpan: number; variant?: 'active' | 'inactive' }) {
    return (
        <tr>
            <td colSpan={colSpan} className="h-64 text-center">
                <div className="flex flex-col items-center justify-center text-white/40">
                    <User className="h-12 w-12 mb-4 opacity-50" />
                    {variant === 'inactive' ? (
                        <>
                            <p className="text-lg font-medium">ยังไม่มีพนักงานพ้นสภาพ</p>
                            <p className="text-sm opacity-70 mt-1">เมื่อมีพนักงานออกจากระบบจะแสดงในแท็บนี้ — เก็บข้อมูลไว้อย่างน้อย 5 ปี</p>
                            <p className="text-xs opacity-50 mt-2">หรือลองเปลี่ยนตัวกรอง ปี / สาเหตุ ด้านบน</p>
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-medium">ไม่พบพนักงาน</p>
                            <p className="text-sm opacity-70">ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง</p>
                        </>
                    )}
                </div>
            </td>
        </tr>
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
