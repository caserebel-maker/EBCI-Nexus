'use client'

import { useState, useTransition, useEffect, useRef, type ComponentType, type SVGProps } from 'react'
import { Calendar, Users, FileDown, Loader2, MapPin, Briefcase, ClipboardList } from 'lucide-react'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts'
import {
    getAttendanceReport, getLeaveReport, getContractReport,
    type AttendanceReport, type LeaveReport, type ContractReport,
} from './actions'

const glassCard = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
} as const

type Tab = 'attendance' | 'leave' | 'contracts'

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function downloadCsv(filename: string, rows: string[][]) {
    const csv = rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

interface Props {
    departments: string[]
}

export function ReportsView({ departments }: Props) {
    const [tab, setTab] = useState<Tab>('attendance')
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [department, setDepartment] = useState<string>('')

    const [attData, setAttData] = useState<AttendanceReport | null>(null)
    const [leaveData, setLeaveData] = useState<LeaveReport | null>(null)
    const [contractData, setContractData] = useState<ContractReport | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const loadedKey = useRef<string>('')

    // Load data whenever filters change. Keyed string so we only fire once per combo.
    const key = `${tab}|${year}|${month}|${department}`
    useEffect(() => {
        if (loadedKey.current === key) return
        loadedKey.current = key
        startTransition(async () => {
            setError(null)
            if (tab === 'attendance') {
                const res = await getAttendanceReport(year, month, department || undefined)
                if ('error' in res) setError(res.error)
                else setAttData(res)
            } else if (tab === 'leave') {
                const res = await getLeaveReport(year, department || undefined)
                if ('error' in res) setError(res.error)
                else setLeaveData(res)
            } else {
                const res = await getContractReport()
                if ('error' in res) setError(res.error)
                else setContractData(res)
            }
        })
    }, [key, tab, year, month, department])

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-1">
                <TabButton active={tab === 'attendance'} onClick={() => setTab('attendance')} icon={MapPin}>
                    สรุปการเข้างาน
                </TabButton>
                <TabButton active={tab === 'leave'} onClick={() => setTab('leave')} icon={ClipboardList}>
                    การใช้วันลา
                </TabButton>
                <TabButton active={tab === 'contracts'} onClick={() => setTab('contracts')} icon={Briefcase}>
                    สัญญาจ้าง
                </TabButton>
            </div>

            {/* Filters */}
            <div className="p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center" style={glassCard}>
                {tab !== 'contracts' && (
                    <>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-white/50" />
                            <label className="text-white/70 text-sm">ปี</label>
                            <select
                                value={year}
                                onChange={e => setYear(parseInt(e.target.value))}
                                className="bg-white/10 text-white text-sm px-3 py-1.5 rounded-lg border border-white/15 focus:outline-none focus:ring-2 focus:ring-amber-300"
                            >
                                {[0, 1, 2].map(i => {
                                    const y = now.getFullYear() - i
                                    return <option key={y} value={y} className="text-black">{y + 543}</option>
                                })}
                            </select>
                        </div>

                        {tab === 'attendance' && (
                            <div className="flex items-center gap-2">
                                <label className="text-white/70 text-sm">เดือน</label>
                                <select
                                    value={month}
                                    onChange={e => setMonth(parseInt(e.target.value))}
                                    className="bg-white/10 text-white text-sm px-3 py-1.5 rounded-lg border border-white/15 focus:outline-none focus:ring-2 focus:ring-amber-300"
                                >
                                    {MONTHS_TH.map((m, i) => (
                                        <option key={i} value={i + 1} className="text-black">{m}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </>
                )}

                {tab !== 'contracts' && (
                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-white/50" />
                        <label className="text-white/70 text-sm">แผนก</label>
                        <select
                            value={department}
                            onChange={e => setDepartment(e.target.value)}
                            className="bg-white/10 text-white text-sm px-3 py-1.5 rounded-lg border border-white/15 focus:outline-none focus:ring-2 focus:ring-amber-300 min-w-[140px]"
                        >
                            <option value="" className="text-black">ทุกแผนก</option>
                            {departments.map(d => (
                                <option key={d} value={d} className="text-black">{d}</option>
                            ))}
                        </select>
                    </div>
                )}

                {isPending && (
                    <span className="text-xs text-white/60 inline-flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        กำลังโหลด…
                    </span>
                )}
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-500/15 border border-red-400/30 text-red-200 text-sm">
                    {error}
                </div>
            )}

            {/* Content */}
            {tab === 'attendance' && attData && <AttendanceTab data={attData} />}
            {tab === 'leave' && leaveData && <LeaveTab data={leaveData} />}
            {tab === 'contracts' && contractData && <ContractsTab data={contractData} />}
        </div>
    )
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: LucideIcon; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                active
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
        >
            <Icon size={16} />
            {children}
        </button>
    )
}

// ─── Attendance Tab ──────────────────────────────────────────────────────────

function AttendanceTab({ data }: { data: AttendanceReport }) {
    const handleExport = () => {
        const header = ['รหัส', 'ชื่อ-นามสกุล', 'แผนก', 'เข้าออฟฟิศ', 'WFH', 'Off-site', 'รวม', 'วันทำงาน']
        const rows = [
            header,
            ...data.rows.map(r => [
                r.employeeCode,
                r.employeeName,
                r.department ?? '',
                String(r.officeDays),
                String(r.wfhDays),
                String(r.offsiteDays),
                String(r.totalDays),
                String(data.workdays),
            ]),
        ]
        downloadCsv(`attendance_${data.year}_${String(data.month).padStart(2, '0')}.csv`, rows)
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="พนักงาน" value={data.rows.length} />
                <StatTile label="วันทำงาน" value={data.workdays} suffix="วัน" />
                <StatTile label="เข้าออฟฟิศ" value={data.typeBreakdown[0]?.count ?? 0} suffix="วัน" color="#60A5FA" />
                <StatTile label="WFH" value={data.typeBreakdown[1]?.count ?? 0} suffix="วัน" color="#34D399" />
            </div>

            {data.typeBreakdown.some(t => t.count > 0) && (
                <div className="p-4 lg:p-6" style={glassCard}>
                    <h3 className="text-white font-semibold mb-3">สัดส่วนประเภทการเข้างาน</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.typeBreakdown}>
                                <XAxis dataKey="type" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                                <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ background: '#1a0a0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="count">
                                    {data.typeBreakdown.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="p-4 lg:p-6" style={glassCard}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-white font-semibold">รายละเอียดรายบุคคล</h3>
                    <button
                        onClick={handleExport}
                        className="text-xs px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-lg inline-flex items-center gap-1.5"
                    >
                        <FileDown size={12} />
                        ดาวน์โหลด CSV
                    </button>
                </div>
                <div className="overflow-x-auto -mx-4 lg:mx-0">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead>
                            <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider">
                                <th className="text-left py-2 px-3">รหัส</th>
                                <th className="text-left py-2 px-3">ชื่อ-นามสกุล</th>
                                <th className="text-left py-2 px-3">แผนก</th>
                                <th className="text-right py-2 px-3">ออฟฟิศ</th>
                                <th className="text-right py-2 px-3">WFH</th>
                                <th className="text-right py-2 px-3">Off-site</th>
                                <th className="text-right py-2 px-3">รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map(r => (
                                <tr key={r.employeeId} className="border-b border-white/5 text-white/90 hover:bg-white/5">
                                    <td className="py-2 px-3 font-mono text-xs text-white/70">{r.employeeCode}</td>
                                    <td className="py-2 px-3">{r.employeeName}</td>
                                    <td className="py-2 px-3 text-white/70">{r.department ?? '—'}</td>
                                    <td className="py-2 px-3 text-right text-blue-300 font-semibold">{r.officeDays}</td>
                                    <td className="py-2 px-3 text-right text-emerald-300 font-semibold">{r.wfhDays}</td>
                                    <td className="py-2 px-3 text-right text-amber-300 font-semibold">{r.offsiteDays}</td>
                                    <td className="py-2 px-3 text-right font-bold text-white">{r.totalDays}</td>
                                </tr>
                            ))}
                            {data.rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-white/50">ไม่มีข้อมูล</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// ─── Leave Tab ────────────────────────────────────────────────────────────────

function LeaveTab({ data }: { data: LeaveReport }) {
    const totalDays = data.typeBreakdown.reduce((s, t) => s + t.count, 0)

    const handleExport = () => {
        const typesInOrder = data.typeBreakdown.map(t => t.type)
        const typeLabels = data.typeBreakdown.map(t => t.label)
        const header = ['รหัส', 'ชื่อ-นามสกุล', 'แผนก', ...typeLabels, 'รวม (วัน)']
        const rows = [
            header,
            ...data.rows.map(r => [
                r.employeeCode,
                r.employeeName,
                r.department ?? '',
                ...typesInOrder.map(t => String(r.byType[t] ?? 0)),
                String(r.total),
            ]),
        ]
        downloadCsv(`leave_${data.year}.csv`, rows)
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="ปี" value={data.year + 543} />
                <StatTile label="พนักงานที่ลา" value={data.rows.length} />
                <StatTile label="รวมวันลา" value={totalDays} suffix="วัน" color="#FBBF24" />
                <StatTile label="ประเภทที่ใช้" value={data.typeBreakdown.length} />
            </div>

            {totalDays > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-4 lg:p-6" style={glassCard}>
                        <h3 className="text-white font-semibold mb-3">สัดส่วนประเภทการลา</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.typeBreakdown}
                                        dataKey="count"
                                        nameKey="label"
                                        cx="50%" cy="50%"
                                        outerRadius={80}
                                        label={({ name, value }) => `${name} ${value}`}
                                    >
                                        {data.typeBreakdown.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#1a0a0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="p-4 lg:p-6" style={glassCard}>
                        <h3 className="text-white font-semibold mb-3">จำนวนวัน per ประเภท</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.typeBreakdown}>
                                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                                    <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a0a0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
                                    />
                                    <Bar dataKey="count">
                                        {data.typeBreakdown.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 lg:p-6" style={glassCard}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-white font-semibold">รายละเอียดรายบุคคล</h3>
                    <button
                        onClick={handleExport}
                        className="text-xs px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-lg inline-flex items-center gap-1.5"
                    >
                        <FileDown size={12} />
                        ดาวน์โหลด CSV
                    </button>
                </div>
                <div className="overflow-x-auto -mx-4 lg:mx-0">
                    <table className="w-full text-sm min-w-[600px]">
                        <thead>
                            <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider">
                                <th className="text-left py-2 px-3">รหัส</th>
                                <th className="text-left py-2 px-3">ชื่อ-นามสกุล</th>
                                <th className="text-left py-2 px-3">แผนก</th>
                                {data.typeBreakdown.map(t => (
                                    <th key={t.type} className="text-right py-2 px-3">{t.label}</th>
                                ))}
                                <th className="text-right py-2 px-3">รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map(r => (
                                <tr key={r.employeeId} className="border-b border-white/5 text-white/90 hover:bg-white/5">
                                    <td className="py-2 px-3 font-mono text-xs text-white/70">{r.employeeCode}</td>
                                    <td className="py-2 px-3">{r.employeeName}</td>
                                    <td className="py-2 px-3 text-white/70">{r.department ?? '—'}</td>
                                    {data.typeBreakdown.map(t => (
                                        <td key={t.type} className="py-2 px-3 text-right" style={{ color: t.color }}>
                                            {r.byType[t.type] ?? 0}
                                        </td>
                                    ))}
                                    <td className="py-2 px-3 text-right font-bold text-white">{r.total}</td>
                                </tr>
                            ))}
                            {data.rows.length === 0 && (
                                <tr>
                                    <td colSpan={data.typeBreakdown.length + 4} className="py-8 text-center text-white/50">ไม่มีข้อมูลการลาในปีนี้</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// ─── Contracts Tab ────────────────────────────────────────────────────────────

function ContractsTab({ data }: { data: ContractReport }) {
    const handleExport = () => {
        const header = ['รหัส', 'ชื่อ-นามสกุล', 'แผนก', 'ตำแหน่ง', 'ประเภท', 'วันเริ่มงาน', 'อายุงาน (เดือน)']
        const rows = [
            header,
            ...data.rows.map(r => [
                r.employeeCode,
                r.employeeName,
                r.department ?? '',
                r.position ?? '',
                r.employmentType,
                r.startDate,
                String(r.tenureMonths),
            ]),
        ]
        downloadCsv(`contracts.csv`, rows)
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {data.byType.map(t => (
                    <StatTile key={t.type} label={t.type} value={t.count} color={t.color} />
                ))}
            </div>

            {data.byType.length > 0 && (
                <div className="p-4 lg:p-6" style={glassCard}>
                    <h3 className="text-white font-semibold mb-3">สัดส่วนประเภทการจ้าง</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.byType}
                                    dataKey="count"
                                    nameKey="type"
                                    cx="50%" cy="50%"
                                    outerRadius={80}
                                    label={({ name, value }) => `${name} ${value}`}
                                >
                                    {data.byType.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1a0a0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="p-4 lg:p-6" style={glassCard}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-white font-semibold">รายชื่อพนักงานทั้งหมด</h3>
                    <button
                        onClick={handleExport}
                        className="text-xs px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-lg inline-flex items-center gap-1.5"
                    >
                        <FileDown size={12} />
                        ดาวน์โหลด CSV
                    </button>
                </div>
                <div className="overflow-x-auto -mx-4 lg:mx-0">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead>
                            <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider">
                                <th className="text-left py-2 px-3">รหัส</th>
                                <th className="text-left py-2 px-3">ชื่อ-นามสกุล</th>
                                <th className="text-left py-2 px-3">แผนก</th>
                                <th className="text-left py-2 px-3">ตำแหน่ง</th>
                                <th className="text-left py-2 px-3">ประเภท</th>
                                <th className="text-right py-2 px-3">เริ่มงาน</th>
                                <th className="text-right py-2 px-3">อายุงาน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map(r => (
                                <tr key={r.employeeId} className="border-b border-white/5 text-white/90 hover:bg-white/5">
                                    <td className="py-2 px-3 font-mono text-xs text-white/70">{r.employeeCode}</td>
                                    <td className="py-2 px-3">{r.employeeName}</td>
                                    <td className="py-2 px-3 text-white/70">{r.department ?? '—'}</td>
                                    <td className="py-2 px-3 text-white/70">{r.position ?? '—'}</td>
                                    <td className="py-2 px-3">
                                        <EmpTypeBadge type={r.employmentType} />
                                    </td>
                                    <td className="py-2 px-3 text-right text-white/70">{r.startDate}</td>
                                    <td className="py-2 px-3 text-right font-semibold text-white">
                                        {r.tenureMonths < 12
                                            ? `${r.tenureMonths} ด.`
                                            : `${Math.floor(r.tenureMonths / 12)} ปี ${r.tenureMonths % 12} ด.`}
                                    </td>
                                </tr>
                            ))}
                            {data.rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-white/50">ไม่มีข้อมูล</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function EmpTypeBadge({ type }: { type: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        'full-time': { label: 'ประจำ', cls: 'bg-blue-500/20 text-blue-200 border-blue-400/30' },
        contract: { label: 'สัญญาจ้าง', cls: 'bg-amber-500/20 text-amber-200 border-amber-400/30' },
        intern: { label: 'ฝึกงาน', cls: 'bg-pink-500/20 text-pink-200 border-pink-400/30' },
    }
    const info = map[type] ?? { label: type, cls: 'bg-white/10 text-white/70 border-white/20' }
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border ${info.cls}`}>
            {info.label}
        </span>
    )
}

function StatTile({ label, value, suffix, color }: { label: string; value: number | string; suffix?: string; color?: string }) {
    return (
        <div className="p-3 lg:p-4" style={glassCard}>
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color: color ?? '#fff' }}>
                {value}
                {suffix && <span className="text-sm text-white/60 font-normal ml-1">{suffix}</span>}
            </p>
        </div>
    )
}
