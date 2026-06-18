'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
    AlertTriangle, BarChart3, CalendarDays, Clock, Download, Search,
    ShieldAlert, Stethoscope, UserRoundSearch, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AttendanceInsightsData {
    monthIso: string
    monthLabel: string
    generatedAt: string
    policyNote: string
    summary: {
        activeEmployees: number
        workdaysElapsed: number
        absentDays: number
        lateCount: number
        leaveDays: number
        sickDays: number
        personalDays: number
        annualDays: number
        watchEmployees: number
        highRiskEmployees: number
    }
    employees: Array<{
        employeeId: string
        employeeCode: string | null
        name: string
        nickname: string | null
        department: string | null
        position: string | null
        absentDays: number
        absentDates: string[]
        lateCount: number
        lateMinutes: number
        leaveDays: number
        sickDays: number
        personalDays: number
        annualDays: number
        wfhDays: number
        riskScore: number
        riskLevel: 'normal' | 'watch' | 'high'
    }>
    departments: Array<{
        department: string
        employees: number
        absentDays: number
        lateCount: number
        leaveDays: number
    }>
}

type RiskFilter = 'all' | 'watch' | 'high'

const GLASS: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 18,
}

const RISK_META = {
    normal: {
        label: 'ปกติ',
        className: 'bg-emerald-500/14 text-emerald-200 border-emerald-300/20',
    },
    watch: {
        label: 'ควรติดตาม',
        className: 'bg-amber-500/16 text-amber-200 border-amber-300/25',
    },
    high: {
        label: 'ควรคุยเร่งด่วน',
        className: 'bg-rose-500/18 text-rose-200 border-rose-300/30',
    },
}

function fmt(n: number) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function thaiDate(dateKey: string) {
    const d = new Date(`${dateKey}T00:00:00+07:00`)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function absentDateSummary(dates: string[]) {
    if (dates.length === 0) return ''
    const shown = dates.slice(0, 3).map(thaiDate).join(', ')
    return dates.length > 3 ? `${shown} และอีก ${dates.length - 3} วัน` : shown
}

function updatedLabel(iso: string) {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
}

export function AttendanceInsightsView({ data }: { data: AttendanceInsightsData }) {
    const [month, setMonth] = useState(data.monthIso)
    const [query, setQuery] = useState('')
    const [department, setDepartment] = useState('all')
    const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')

    const departments = useMemo(() => {
        return Array.from(new Set(data.employees.map(e => e.department ?? 'ไม่ระบุแผนก'))).sort((a, b) => a.localeCompare(b, 'th'))
    }, [data.employees])

    const filteredEmployees = useMemo(() => {
        const q = query.trim().toLowerCase()
        return data.employees.filter(e => {
            if (department !== 'all' && (e.department ?? 'ไม่ระบุแผนก') !== department) return false
            if (riskFilter === 'high' && e.riskLevel !== 'high') return false
            if (riskFilter === 'watch' && e.riskLevel === 'normal') return false
            if (!q) return true
            const haystack = [
                e.name, e.nickname, e.employeeCode, e.department, e.position,
            ].filter(Boolean).join(' ').toLowerCase()
            return haystack.includes(q)
        })
    }, [data.employees, department, query, riskFilter])

    const exportCsv = () => {
        const header = [
            'employee_code', 'name', 'nickname', 'department', 'position',
            'absent_days', 'late_count', 'late_minutes', 'leave_days',
            'sick_days', 'personal_days', 'annual_days', 'wfh_days', 'risk_level',
        ]
        const rows = filteredEmployees.map(e => [
            e.employeeCode ?? '', e.name, e.nickname ?? '', e.department ?? '', e.position ?? '',
            e.absentDays, e.lateCount, e.lateMinutes, e.leaveDays,
            e.sickDays, e.personalDays, e.annualDays, e.wfhDays, RISK_META[e.riskLevel].label,
        ])
        const csv = [header, ...rows]
            .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n')
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance-insights-${data.monthIso}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-rose-500/15 border border-rose-300/20 flex items-center justify-center shrink-0">
                        <ShieldAlert size={22} className="text-rose-200" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                            สถิติขาด ลา มาสาย
                        </h1>
                        <p className="text-sm text-white/55 mt-1">
                            ภาพรวมสำหรับ HR ใช้ติดตามและตักเตือนพนักงาน เดือน {data.monthLabel}
                        </p>
                        <p className="text-xs text-white/35 mt-1">
                            อัปเดต {updatedLabel(data.generatedAt)} · {data.policyNote}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => {
                            const next = e.target.value
                            setMonth(next)
                            window.location.href = `/hradmin/attendance/insights?month=${next}`
                        }}
                        className="h-10 rounded-xl bg-white/8 border border-white/10 px-3 text-sm text-white"
                    />
                    <button
                        type="button"
                        onClick={exportCsv}
                        className="h-10 inline-flex items-center gap-2 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 px-3 text-sm font-semibold text-white/80 transition-colors"
                    >
                        <Download size={16} />
                        CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <SummaryCard icon={Users} label="พนักงาน active" value={data.summary.activeEmployees} sub={`${data.summary.workdaysElapsed} วันทำงานที่ผ่านมา`} tone="white" />
                <SummaryCard icon={AlertTriangle} label="ขาดงาน" value={data.summary.absentDays} sub="ไม่เช็คอิน/ไม่มีลา/WFH" tone="rose" />
                <SummaryCard icon={Clock} label="มาสาย" value={data.summary.lateCount} sub="ครั้งในเดือนนี้" tone="amber" />
                <SummaryCard icon={CalendarDays} label="วันลาอนุมัติ" value={fmt(data.summary.leaveDays)} sub={`ป่วย ${fmt(data.summary.sickDays)} · กิจ ${fmt(data.summary.personalDays)}`} tone="sky" />
                <SummaryCard icon={UserRoundSearch} label="ควรติดตาม" value={data.summary.watchEmployees} sub={`เร่งด่วน ${data.summary.highRiskEmployees} คน`} tone="violet" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 space-y-4">
                    <div className="p-3 sm:p-4" style={GLASS}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="relative min-w-0 lg:w-80">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                                <input
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="ค้นหาชื่อ รหัส แผนก"
                                    className="w-full h-10 rounded-xl bg-black/18 border border-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/25"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={department}
                                    onChange={e => setDepartment(e.target.value)}
                                    className="h-10 rounded-xl bg-black/18 border border-white/10 px-3 text-sm text-white"
                                >
                                    <option value="all" className="bg-[#1a0608]">ทุกแผนก</option>
                                    {departments.map(dep => (
                                        <option key={dep} value={dep} className="bg-[#1a0608]">{dep}</option>
                                    ))}
                                </select>
                                <SegmentedButton active={riskFilter === 'all'} onClick={() => setRiskFilter('all')}>ทั้งหมด</SegmentedButton>
                                <SegmentedButton active={riskFilter === 'watch'} onClick={() => setRiskFilter('watch')}>ควรติดตาม</SegmentedButton>
                                <SegmentedButton active={riskFilter === 'high'} onClick={() => setRiskFilter('high')}>เร่งด่วน</SegmentedButton>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden" style={GLASS}>
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="font-bold text-white">รายชื่อพนักงานที่ต้องติดตาม</h2>
                                <p className="text-xs text-white/40 mt-0.5">เรียงตามคะแนนความเสี่ยง ขาดงานมีน้ำหนักมากกว่ามาสาย</p>
                            </div>
                            <span className="text-xs text-white/45 shrink-0">{filteredEmployees.length} คน</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.04] text-left">
                                        <Th>พนักงาน</Th>
                                        <Th right>ขาด</Th>
                                        <Th right>มาสาย</Th>
                                        <Th right>ลารวม</Th>
                                        <Th right>ป่วย</Th>
                                        <Th right>กิจ</Th>
                                        <Th right>พักร้อน</Th>
                                        <Th right>WFH</Th>
                                        <Th>สถานะ</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-4 py-12 text-center text-white/40">
                                                ไม่พบข้อมูลตามตัวกรองนี้
                                            </td>
                                        </tr>
                                    ) : filteredEmployees.map(e => (
                                        <tr key={e.employeeId} className="border-t border-white/[0.07] hover:bg-white/[0.04]">
                                            <td className="px-4 py-3">
                                                <Link href={`/hradmin/employees/${e.employeeId}`} className="font-bold text-white hover:text-amber-200 transition-colors">
                                                    {e.name}
                                                </Link>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-white/42">
                                                    {e.employeeCode && <span>{e.employeeCode}</span>}
                                                    {e.nickname && <span>({e.nickname})</span>}
                                                    {e.position && <span className="truncate max-w-[220px]">{e.position}</span>}
                                                </div>
                                                <div className="mt-1 text-xs text-white/55 leading-snug">
                                                    {e.department ?? 'ไม่ระบุแผนก'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                <AbsentCell days={e.absentDays} dates={e.absentDates} />
                                            </td>
                                            <Td right tone={e.lateCount >= 3 ? 'amber' : undefined}>{e.lateCount}</Td>
                                            <Td right>{fmt(e.leaveDays)}</Td>
                                            <Td right tone={e.sickDays >= 3 ? 'sky' : undefined}>{fmt(e.sickDays)}</Td>
                                            <Td right>{fmt(e.personalDays)}</Td>
                                            <Td right>{fmt(e.annualDays)}</Td>
                                            <Td right>{fmt(e.wfhDays)}</Td>
                                            <td className="px-4 py-3">
                                                <span className={cn('inline-flex rounded-full border px-2 py-1 text-xs font-bold', RISK_META[e.riskLevel].className)}>
                                                    {RISK_META[e.riskLevel].label}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4" style={GLASS}>
                        <SectionTitle icon={BarChart3} title="สรุปตามแผนก" />
                        <div className="space-y-3 mt-4">
                            {data.departments.slice(0, 8).map(dep => {
                                const max = Math.max(1, ...data.departments.map(d => d.absentDays + d.lateCount))
                                const score = dep.absentDays + dep.lateCount
                                return (
                                    <div key={dep.department}>
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="font-semibold text-white truncate">{dep.department}</span>
                                            <span className="text-white/55 shrink-0">
                                                ขาด {dep.absentDays} · สาย {dep.lateCount}
                                            </span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-white/8 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-300"
                                                style={{ width: `${Math.max(4, Math.round(score / max * 100))}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="p-4" style={GLASS}>
                        <SectionTitle icon={Stethoscope} title="สัญญาณที่ควรดู" />
                        <div className="mt-4 space-y-3 text-sm text-white/70 leading-relaxed">
                            <InsightLine tone="rose" text="ขาดงานนับเฉพาะวันทำงานที่ผ่านมาแล้ว และไม่นับวันที่มีใบลา/WFH อนุมัติ" />
                            <InsightLine tone="amber" text="มาสาย 3 ครั้งขึ้นไปในเดือนเดียว เหมาะกับการคุยเชิงเตือนก่อนเป็นลายลักษณ์อักษร" />
                            <InsightLine tone="sky" text="ลาป่วยถี่ควรดู pattern และถามด้วยน้ำเสียงดูแล ไม่ใช่กล่าวหา" />
                            <InsightLine tone="emerald" text="WFH แสดงเพื่อให้เห็นสถานะการทำงาน แต่ไม่ถูกนับเป็นวันลา" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ icon: Icon, label, value, sub, tone }: {
    icon: typeof Users
    label: string
    value: string | number
    sub: string
    tone: 'white' | 'rose' | 'amber' | 'sky' | 'violet'
}) {
    const toneClass = {
        white: 'text-white bg-white/8 border-white/12',
        rose: 'text-rose-200 bg-rose-500/12 border-rose-300/20',
        amber: 'text-amber-200 bg-amber-500/12 border-amber-300/20',
        sky: 'text-sky-200 bg-sky-500/12 border-sky-300/20',
        violet: 'text-violet-200 bg-violet-500/12 border-violet-300/20',
    }[tone]

    return (
        <div className={cn('rounded-2xl border p-4', toneClass)}>
            <div className="flex items-center gap-2 text-xs font-semibold opacity-80">
                <Icon size={15} />
                {label}
            </div>
            <div className="text-3xl font-black mt-3 leading-none">{value}</div>
            <div className="text-xs text-white/45 mt-2 leading-snug">{sub}</div>
        </div>
    )
}

function SegmentedButton({ active, onClick, children }: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'h-10 rounded-xl px-3 text-sm font-semibold transition-colors',
                active ? 'bg-amber-300 text-[#4b1018]' : 'bg-white/7 text-white/62 hover:bg-white/12 hover:text-white',
            )}
        >
            {children}
        </button>
    )
}

function AbsentCell({ days, dates }: { days: number; dates: string[] }) {
    const [open, setOpen] = useState(false)
    const hasAbsence = days > 0
    const summary = absentDateSummary(dates)

    if (!hasAbsence) {
        return <span className="text-sm text-white/72">0</span>
    }

    return (
        <div className="group relative inline-flex min-w-[5.5rem] flex-col items-end gap-1 whitespace-nowrap">
            <span className="text-sm font-black leading-none text-rose-200">{days}</span>
            {summary && (
                <button
                    type="button"
                    onClick={() => setOpen(value => !value)}
                    onBlur={() => window.setTimeout(() => setOpen(false), 150)}
                    title={dates.map(thaiDate).join(', ')}
                    className="rounded-full border border-rose-300/15 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-rose-100/75 transition-colors hover:bg-rose-500/18 hover:text-rose-50"
                >
                    {dates.length === 1 ? summary : `ดูรายละเอียด ${dates.length} วัน`}
                </button>
            )}
            {summary && (
                <div
                    className={cn(
                        'pointer-events-none absolute right-0 top-[calc(100%+0.4rem)] z-30 w-44 rounded-xl border border-white/12 bg-[#3b1118]/95 p-2 text-left shadow-2xl shadow-black/30 opacity-0 transition-opacity group-hover:opacity-100',
                        open && 'opacity-100',
                    )}
                >
                    <div className="mb-1 border-b border-white/10 pb-1 text-[10px] font-bold text-white/55">
                        วันที่ขาดงาน
                    </div>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                        {dates.map(date => (
                            <div key={date} className="rounded-lg bg-white/6 px-2 py-1 text-[11px] font-semibold text-white/80">
                                {thaiDate(date)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function SectionTitle({ icon: Icon, title }: { icon: typeof BarChart3; title: string }) {
    return (
        <div className="flex items-center gap-2">
            <Icon size={16} className="text-amber-200" />
            <h2 className="font-bold text-white">{title}</h2>
        </div>
    )
}

function InsightLine({ tone, text }: { tone: 'rose' | 'amber' | 'sky' | 'emerald'; text: string }) {
    const dot = {
        rose: 'bg-rose-300',
        amber: 'bg-amber-300',
        sky: 'bg-sky-300',
        emerald: 'bg-emerald-300',
    }[tone]
    return (
        <div className="flex items-start gap-2">
            <span className={cn('mt-2 h-2 w-2 rounded-full shrink-0', dot)} />
            <p>{text}</p>
        </div>
    )
}

function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
    return (
        <th className={cn('px-4 py-2.5 text-xs font-bold text-white/45', right && 'text-right')}>
            {children}
        </th>
    )
}

function Td({ children, right = false, tone }: {
    children: React.ReactNode
    right?: boolean
    tone?: 'rose' | 'amber' | 'sky'
}) {
    const toneClass = tone === 'rose'
        ? 'text-rose-200 font-bold'
        : tone === 'amber'
            ? 'text-amber-200 font-bold'
            : tone === 'sky'
                ? 'text-sky-200 font-bold'
                : 'text-white/72'

    return (
        <td className={cn('px-4 py-3 text-sm', right && 'text-right tabular-nums', toneClass)}>
            {children}
        </td>
    )
}
