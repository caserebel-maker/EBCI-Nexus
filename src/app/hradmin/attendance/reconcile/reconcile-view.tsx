'use client'

import { useMemo, useState, useTransition } from 'react'
import {
    CheckCircle2, AlertTriangle, Smartphone, CreditCard, XCircle,
    Calendar, RefreshCw, FileDown, Search, Loader2, Users, Palmtree, Sun,
} from 'lucide-react'
import { reconcileDate, type ReconSummary, type ReconStatus } from './actions'
import { formatBangkokTime } from '@/lib/datetime'

const glass = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
} as const

type StatusFilter = 'all' | ReconStatus

const FILTERS: Array<{
    key: StatusFilter
    label: string
    color: string
}> = [
    { key: 'all',         label: 'ทั้งหมด',    color: 'text-white/80' },
    { key: 'matched',     label: 'ตรงกัน',     color: 'text-emerald-200' },
    { key: 'discrepancy', label: 'ต่างกัน',    color: 'text-rose-200' },
    { key: 'card_only',   label: 'บัตรอย่างเดียว',  color: 'text-sky-200' },
    { key: 'mobile_only', label: 'มือถืออย่างเดียว', color: 'text-amber-200' },
    { key: 'on_leave',    label: 'ลา',         color: 'text-amber-300' },
    { key: 'absent',      label: 'ขาด',       color: 'text-white/50' },
]

/**
 * card_scans store Bangkok wall-clock (CSV from reader), while
 * mobile checkins + the derived attendance_logs.official_clock_in
 * store UTC wall-clock (new Date().toISOString() backend). Callers
 * pass the correct `source` so the Bangkok-shown time is the real one.
 */
function formatTime(ts: string | null, source: 'utc' | 'bangkok' = 'utc'): string {
    return formatBangkokTime(ts, source)
}

function formatVariance(v: number | null): string {
    if (v === null) return '—'
    const sign = v >= 0 ? '' : '-'
    const abs = Math.abs(v)
    const mins = Math.floor(abs)
    const secs = Math.round((abs - mins) * 60)
    return `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

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
    initialDate: string
    initialData: ReconSummary | null
}

export function ReconcileView({ initialDate, initialData }: Props) {
    const [date, setDate] = useState(initialDate)
    const [data, setData] = useState<ReconSummary | null>(initialData)
    const [filter, setFilter] = useState<StatusFilter>('all')
    const [search, setSearch] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const filteredRows = useMemo(() => {
        if (!data) return []
        const q = search.trim().toLowerCase()
        return data.rows.filter(r => {
            if (filter !== 'all' && r.status !== filter) return false
            if (q) {
                const hay = `${r.firstNameTh} ${r.nickname ?? ''} ${r.employeeCode}`.toLowerCase()
                if (!hay.includes(q)) return false
            }
            return true
        })
    }, [data, filter, search])

    const refresh = (d: string) => {
        setError(null)
        startTransition(async () => {
            const r = await reconcileDate(d)
            if ('error' in r) {
                setError(r.error)
                setData(null)
                return
            }
            setData(r.summary)
        })
    }

    const handleDateChange = (v: string) => {
        setDate(v)
        refresh(v)
    }

    const handleExport = () => {
        if (!data) return
        const header = ['รหัส', 'ชื่อ-นามสกุล', 'แผนก', 'ตำแหน่ง', 'บัตร', 'มือถือ', 'ต่าง(นาที)', 'สถานะ', 'เวลาอนุมัติ']
        const statusLabel: Record<ReconStatus, string> = {
            matched: 'ตรงกัน', discrepancy: 'ต่างเกิน 10 นาที',
            card_only: 'บัตรอย่างเดียว', mobile_only: 'มือถืออย่างเดียว',
            on_leave: 'ลา', absent: 'ขาด',
        }
        const rows = [
            header,
            ...data.rows.map(r => [
                r.employeeCode,
                `${r.firstNameTh}${r.nickname ? ` (${r.nickname})` : ''}`,
                r.department ?? '',
                r.position ?? '',
                formatTime(r.cardTime, 'bangkok'),
                formatTime(r.mobileTime, 'utc'),
                r.varianceMinutes !== null ? String(r.varianceMinutes) : '',
                `${statusLabel[r.status]}${r.isHalfDayLeave ? ` (ครึ่งวัน${r.halfDayLeavePeriod === 'morning' ? 'เช้า' : 'บ่าย'})` : ''}`,
                // official_clock_in mirrors card when present, mobile otherwise
                formatTime(r.officialClockIn, r.cardTime ? 'bangkok' : 'utc'),
            ]),
        ]
        downloadCsv(`reconcile_${data.date}.csv`, rows)
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Filters row */}
            <div className="p-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3" style={glass}>
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-white/50" />
                    <label className="text-white/75 text-sm">วันที่</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => handleDateChange(e.target.value)}
                        className="bg-white/10 text-white text-sm px-3 py-1.5 rounded-lg border border-white/15 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                </div>
                <button
                    onClick={() => refresh(date)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold disabled:opacity-50"
                >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    คำนวณใหม่
                </button>
                <button
                    onClick={handleExport}
                    disabled={!data}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs font-semibold disabled:opacity-50"
                >
                    <FileDown size={12} />
                    Export CSV
                </button>
                <div className="ml-auto flex items-center gap-2 min-w-[180px]">
                    <Search size={14} className="text-white/50" />
                    <input
                        type="search"
                        placeholder="ค้นหาชื่อ/รหัส"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 bg-white/10 text-white text-sm px-3 py-1.5 rounded-lg border border-white/15 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-400/30 text-red-200 text-sm">{error}</div>
            )}

            {data && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                        <SummaryCard icon={Users}        label="พนักงาน"      value={data.totalEmployees} color="text-white" />
                        <SummaryCard icon={CheckCircle2} label="ตรงกัน"       value={data.matched}       color="text-emerald-300" />
                        <SummaryCard icon={AlertTriangle} label="ต่างกัน"      value={data.discrepancy}   color="text-rose-300" />
                        <SummaryCard icon={CreditCard}   label="บัตรเท่านั้น"  value={data.cardOnly}      color="text-sky-300" />
                        <SummaryCard icon={Smartphone}   label="มือถือเท่านั้น" value={data.mobileOnly}    color="text-amber-300" />
                        <SummaryCard icon={Palmtree}     label="ลา"           value={data.onLeave}       color="text-amber-300" />
                        <SummaryCard icon={XCircle}      label="ขาด"          value={data.absent}        color="text-white/60" />
                    </div>

                    {/* Filter chips */}
                    <div className="flex flex-wrap gap-1.5 p-1.5 rounded-lg border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {FILTERS.map(({ key, label, color }) => {
                            const count =
                                key === 'all' ? data.rows.length :
                                key === 'matched' ? data.matched :
                                key === 'discrepancy' ? data.discrepancy :
                                key === 'card_only' ? data.cardOnly :
                                key === 'mobile_only' ? data.mobileOnly :
                                key === 'on_leave' ? data.onLeave :
                                data.absent
                            const active = filter === key
                            return (
                                <button
                                    key={key}
                                    onClick={() => setFilter(key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                        active ? 'bg-amber-400 text-[#561e23] shadow-md' : `${color} hover:bg-white/10`
                                    }`}
                                >
                                    {label}
                                    <span className="font-mono opacity-70">{count}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Table */}
                    <div className="p-2 lg:p-4" style={glass}>
                        <div className="overflow-x-auto -mx-2 lg:mx-0">
                            <table className="w-full text-sm min-w-[720px]">
                                <thead>
                                    <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider">
                                        <th className="text-left py-2 px-3">รหัส</th>
                                        <th className="text-left py-2 px-3">ชื่อ-นามสกุล</th>
                                        <th className="text-right py-2 px-3">บัตร</th>
                                        <th className="text-right py-2 px-3">มือถือ</th>
                                        <th className="text-right py-2 px-3">ต่าง</th>
                                        <th className="text-left py-2 px-3">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.map(r => (
                                        <tr key={r.employeeId} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-2 px-3 font-mono text-xs text-white/70">{r.employeeCode}</td>
                                            <td className="py-2 px-3 text-white">
                                                {r.firstNameTh}
                                                {r.nickname && <span className="text-white/55"> ({r.nickname})</span>}
                                                <div className="text-[10px] text-white/40">{r.department ?? '—'}</div>
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-xs text-sky-200">{formatTime(r.cardTime, 'bangkok')}</td>
                                            <td className="py-2 px-3 text-right font-mono text-xs text-amber-200">{formatTime(r.mobileTime, 'utc')}</td>
                                            <td className={`py-2 px-3 text-right font-mono text-xs font-semibold ${
                                                r.status === 'discrepancy' ? 'text-rose-300' :
                                                r.status === 'matched' ? 'text-emerald-300' : 'text-white/40'
                                            }`}>
                                                {formatVariance(r.varianceMinutes)}
                                            </td>
                                            <td className="py-2 px-3">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <StatusBadge status={r.status} leaveTypeName={r.leaveTypeName} />
                                                    {r.isHalfDayLeave && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-orange-500/15 text-orange-200 border-orange-400/30">
                                                            <Sun size={9} />
                                                            ครึ่ง{r.halfDayLeavePeriod === 'morning' ? 'เช้า' : 'บ่าย'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRows.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-white/50">ไม่พบข้อมูลในหมวดที่เลือก</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-white/40 text-[11px] italic mt-3 pl-3">
                            💡 เกณฑ์ต่างกัน: เวลาต่างเกิน 10 นาที · บัตรเป็น official record เสมอ
                        </p>
                    </div>
                </>
            )}

            {!data && !error && !isPending && (
                <div className="p-8 text-center text-white/60" style={glass}>ยังไม่มีข้อมูล — กดปุ่มคำนวณใหม่</div>
            )}
        </div>
    )
}

function SummaryCard({
    icon: Icon, label, value, color,
}: { icon: typeof Users; label: string; value: number; color: string }) {
    return (
        <div className="p-3 lg:p-4" style={glass}>
            <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider mb-1">
                <Icon size={14} /> {label}
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    )
}

function StatusBadge({ status, leaveTypeName }: { status: ReconStatus; leaveTypeName?: string | null }) {
    const meta: Record<ReconStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
        matched:     { label: 'ตรงกัน',     cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30', Icon: CheckCircle2 },
        discrepancy: { label: 'ต่างกัน',    cls: 'bg-rose-500/20 text-rose-200 border-rose-400/30',            Icon: AlertTriangle },
        card_only:   { label: 'บัตรอย่างเดียว',  cls: 'bg-sky-500/20 text-sky-200 border-sky-400/30',             Icon: CreditCard },
        mobile_only: { label: 'มือถืออย่างเดียว', cls: 'bg-amber-500/20 text-amber-200 border-amber-400/30',       Icon: Smartphone },
        on_leave:    { label: 'ลา',         cls: 'bg-amber-500/20 text-amber-200 border-amber-400/30',         Icon: Palmtree },
        absent:      { label: 'ขาด',       cls: 'bg-white/10 text-white/60 border-white/20',                  Icon: XCircle },
    }
    const { label, cls, Icon } = meta[status]
    // §1.3 — when status is on_leave, prefer the actual leave type
    // ("ลาป่วย" / "ลากิจ") so HR sees what kind of leave at a glance.
    const display = status === 'on_leave' && leaveTypeName ? leaveTypeName : label
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
            <Icon size={10} /> {display}
        </span>
    )
}
