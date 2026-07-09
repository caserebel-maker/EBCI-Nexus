'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Users, CalendarDays, Clock, AlertTriangle, TrendingUp,
    CheckCircle, XCircle, Cake, Building2, Loader2, Megaphone, Gift, X, UserX
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts'
import { UrgentBanners } from '@/components/dashboard/urgent-banners'
import { AttendanceWidget } from '@/components/dashboard/attendance-widget'
import { cn } from '@/lib/utils'

// ─── Styles ───────────────────────────────────────────────────────────────────
const glassStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderTop: '1px solid rgba(255,255,255,0.30)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
}

const metricCardStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(200,200,220,0.08) 50%, rgba(255,255,255,0.13) 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderTop: '1px solid rgba(255,255,255,0.30)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAVE_LABELS: Record<string, string> = {
    sick: 'ลาป่วย', personal: 'ลากิจ', annual: 'ลาพักร้อน',
    maternity: 'ลาคลอด', ordination: 'ลาบวช',
}
// hex โดยตรง — ไม่ใช้ CSS variable เพื่อให้ recharts render ได้ถูกต้อง
const LEAVE_COLORS: Record<string, string> = {
    sick:      '#A78BFA', // ม่วง lavender
    personal:  '#F472B6', // ชมพู
    annual:    '#60A5FA', // ฟ้า
    maternity: '#34D399', // เขียว mint
    ordination:'#FBBF24', // เหลืองทอง
}
const CHART_PALETTE = [
    '#60A5FA', '#34D399', '#FBBF24', '#F472B6', '#A78BFA',
    '#FB923C', '#22D3EE', '#F87171', '#C084FC', '#4ADE80',
]
const DEPT_COLORS = CHART_PALETTE

// ─── Types ────────────────────────────────────────────────────────────────────
interface Metrics {
    totalEmployees: number
    activeEmployees: number
    leavingToday: number
    pendingLeaves: number
    expiringContracts: number
}

interface DeptEmployee {
    id: string
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    title: string | null
    start_date: string | null
}

interface DeptDatum {
    name: string
    value: number
    employees?: DeptEmployee[]
}

interface Props {
    metrics: Metrics
    attendanceStats?: {
        officeCount: number
        wfhCount: number
        checkedInCount: number
        totalActive: number
    }
    leaveChartData: any[]
    deptData: DeptDatum[]
    attendanceData: any[]
    pendingLeaves: any[]
    contractsExpiring: any[]
    anniversaries: any[]
    weekDays: string[]
    leavesToday: any[]
    urgentBanners: any[]
    newsAnnouncements: any[]
    birthdays: any[]
    canViewAttendanceInsights?: boolean
}

async function handleLeaveAction(id: string, action: 'approve' | 'reject') {
    await fetch(`/api/leave/requests/${id}/${action}`, { method: 'POST' })
}

function fullName(firstName: string, lastName: string, nickname?: string | null) {
    return (
        <>
            {firstName} {lastName}
            {nickname && <span className="font-normal opacity-60"> ({nickname})</span>}
        </>
    )
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ title, value, sub, icon: Icon, accent, href }: {
    title: string; value: string | number; sub?: string; icon: any; accent: string; href: string
}) {
    const router = useRouter()
    return (
        <div
            style={metricCardStyle}
            className="overflow-hidden cursor-pointer transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.99] flex"
            onClick={() => router.push(href)}
        >
            <div className={cn('w-1.5 shrink-0', accent)} />
            <div className="flex-1 flex flex-col items-center justify-center px-3 py-4 text-center gap-1.5">
                <p className="text-xs font-semibold text-white/70 leading-tight text-center line-clamp-2">{title}</p>
                <p className="text-3xl font-black text-white leading-none">{value}</p>
                {sub && <p className="text-xs text-white/50 leading-tight text-center line-clamp-2">{sub}</p>}
            </div>
        </div>
    )
}

// ─── Bar chart tooltip ────────────────────────────────────────────────────────
function LeaveTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: 'rgba(20,5,8,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px' }}>
            <p className="text-white/60 text-sm mb-2 font-bold">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="text-sm" style={{ color: p.color }}>
                    {LEAVE_LABELS[p.dataKey] ?? p.dataKey}: {p.value} ครั้ง
                </p>
            ))}
        </div>
    )
}

// ─── Donut chart with center label & right legend ─────────────────────────────
function employeeDisplayName(employee: DeptEmployee) {
    const name = `${employee.first_name_th ?? ''} ${employee.last_name_th ?? ''}`.trim()
    return name || employee.nickname || employee.employee_code || 'ไม่ระบุชื่อ'
}

function tenureLabel(startDate: string | null) {
    if (!startDate) return null
    const start = new Date(startDate)
    if (isNaN(start.getTime())) return null
    const now = new Date()
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    if (now.getDate() < start.getDate()) months -= 1
    if (months < 0) return null
    const years = Math.floor(months / 12)
    const remMonths = months % 12
    if (years > 0 && remMonths > 0) return `อายุงาน ${years} ปี ${remMonths} เดือน`
    if (years > 0) return `อายุงาน ${years} ปี`
    return `อายุงาน ${remMonths} เดือน`
}

function DeptEmployeesModal({ dept, total, onClose }: { dept: DeptDatum; total: number; onClose: () => void }) {
    const pct = total > 0 ? Math.round(dept.value / total * 100) : 0

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: 'rgba(20,5,8,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-3xl max-h-[84vh] overflow-hidden border border-white/15 shadow-2xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(111,39,48,0.96), rgba(78,22,30,0.96))',
                    borderRadius: 16,
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-white/45">รายชื่อพนักงานในฝ่าย</p>
                        <h3 className="text-xl font-black text-white leading-snug mt-1">{dept.name}</h3>
                        <p className="text-sm text-white/55 mt-1">{dept.value} คน · {pct}% ของพนักงานทั้งหมด</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/18 text-white/70 hover:text-white flex items-center justify-center transition-colors shrink-0"
                        aria-label="ปิด"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[62vh] overflow-y-auto p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(dept.employees ?? []).map(employee => {
                            const tenure = tenureLabel(employee.start_date)
                            return (
                                <div
                                    key={employee.id}
                                    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="font-bold text-white leading-snug min-w-0 break-words">
                                                {employeeDisplayName(employee)}
                                                {employee.nickname && (
                                                    <span className="font-semibold text-white/55"> ({employee.nickname})</span>
                                                )}
                                            </p>
                                            {employee.employee_code && (
                                                <span className="text-[11px] font-bold tabular-nums text-white/70 bg-white/10 rounded-md px-2 py-1 shrink-0">
                                                    {employee.employee_code}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-white/50 leading-snug break-words">{employee.title ?? 'ไม่ระบุตำแหน่ง'}</p>
                                    </div>
                                    {tenure && <p className="text-[11px] text-white/35 mt-2">{tenure}</p>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

function DeptDonut({ data, total }: { data: DeptDatum[]; total: number }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [selectedDept, setSelectedDept] = useState<DeptDatum | null>(null)

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Pie — ใช้ fixed px height แทน "100%" เพื่อให้ recharts render bars/cells ถูกต้อง */}
            <div className="shrink-0 relative" style={{ width: 180, height: 180 }}>
                <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%" cy="50%"
                            innerRadius={58} outerRadius={82}
                            paddingAngle={3}
                            dataKey="value"
                            onMouseEnter={(_, i) => setActiveIndex(i)}
                            onMouseLeave={() => setActiveIndex(null)}
                            onClick={(_, i) => setSelectedDept(data[i])}
                            strokeWidth={0}
                            isAnimationActive={false}
                        >
                            {data.map((_, i) => (
                                <Cell
                                    key={i}
                                    fill={DEPT_COLORS[i % DEPT_COLORS.length]}
                                    opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
                                    style={{ cursor: 'pointer' }}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(v, name) => {
                                const num = Number(v ?? 0)
                                const pct = total > 0 ? Math.round(num / total * 100) : 0
                                return [`${num} คน (${pct}%)`, String(name ?? '')]
                            }}
                            contentStyle={{ background: 'rgba(20,5,8,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 13 }}
                            itemStyle={{ color: '#fff' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center label — absolute overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-white">{total}</span>
                    <span className="text-xs text-white/45 font-bold mt-0.5 text-center leading-tight">พนักงาน<br />ทั้งหมด</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex-1 min-w-0 space-y-1.5 overflow-hidden">
                {data.map((d, i) => {
                    const pct = total > 0 ? Math.round(d.value / total * 100) : 0
                    return (
                        <button
                            key={i}
                            type="button"
                            className={cn('w-full flex items-center gap-2 rounded-lg px-2 py-1 transition-colors text-left',
                                activeIndex === i ? 'bg-white/10' : 'hover:bg-white/5')}
                            onMouseEnter={() => setActiveIndex(i)}
                            onMouseLeave={() => setActiveIndex(null)}
                            onClick={() => setSelectedDept(d)}
                            aria-label={`ดูรายชื่อ${d.name}`}
                        >
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                            <span className="text-sm text-white/70 truncate flex-1">{d.name}</span>
                            <span className="text-sm font-bold text-white shrink-0">{d.value}</span>
                            <span className="text-xs text-white/40 shrink-0 w-8 text-right">{pct}%</span>
                        </button>
                    )
                })}
            </div>

            {selectedDept && (
                <DeptEmployeesModal
                    dept={selectedDept}
                    total={total}
                    onClose={() => setSelectedDept(null)}
                />
            )}
        </div>
    )
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, icon: Icon, warn, className }: { title: string; icon: any; warn?: boolean; className?: string }) {
    return (
        <div className={cn('flex items-center gap-2 mb-4', className)}>
            <div className={warn ? 'h-7 w-7 rounded-lg bg-amber-500/20 ring-1 ring-amber-400/40 flex items-center justify-center' : 'h-7 w-7 rounded-lg bg-white/15 ring-1 ring-white/25 flex items-center justify-center'}>
                <Icon size={14} className={warn ? 'text-amber-300' : 'text-amber-300'} />
            </div>
            <h2 className="text-xs 2xl:text-sm lg:text-base font-semibold text-white/80 tracking-wide">{title}</h2>
        </div>
    )
}

// ─── News Modal ───────────────────────────────────────────────────────────────
const newsModalOverlayStyle: React.CSSProperties = {
    background: 'rgba(20,5,8,0.72)',
    backdropFilter: 'blur(4px)',
}
const newsModalStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(200,180,190,0.14) 40%, rgba(255,255,255,0.16) 100%), linear-gradient(145deg, rgba(86,30,35,0.72) 0%, rgba(60,15,20,0.88) 60%, rgba(100,35,45,0.72) 100%)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
    borderRadius: '1.25rem',
}
function NewsModal({ news, onClose }: { news: any; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={newsModalOverlayStyle}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[80vh] flex flex-col animate-[fadeInScale_0.2s_ease-out]"
                style={newsModalStyle}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-6 pb-4 border-b border-white/10">
                    <div className="flex-1 min-w-0">
                        <span className={cn(
                            'inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border mb-2',
                            PRIORITY_COLOR[news.priority] ?? 'bg-white/10 text-white/50 border-white/10'
                        )}>
                            {PRIORITY_LABEL[news.priority] ?? news.priority}
                        </span>
                        <h2 className="text-xl font-semibold text-white leading-snug">{news.headline}</h2>
                        <p className="text-sm text-white/45 mt-1">
                            {new Date(news.publish_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors text-lg leading-none"
                        aria-label="ปิด"
                    >×</button>
                </div>
                {/* Body */}
                <div className="overflow-y-auto p-6 pt-4 space-y-4">
                    {news.image_url && (
                        <img
                            src={news.image_url}
                            alt={news.headline}
                            className="w-full rounded-lg object-cover"
                        />
                    )}
                    {news.content
                        ? <p className="text-base text-white/80 leading-relaxed whitespace-pre-wrap">{news.content}</p>
                        : <p className="text-sm text-white/35 italic">ไม่มีเนื้อหาเพิ่มเติม</p>
                    }
                </div>
            </div>
        </div>
    )
}

// ─── Day Leave Modal ──────────────────────────────────────────────────────────
const LEAVE_BADGE: Record<string, string> = {
    sick:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
    personal:   'bg-pink-500/20 text-pink-300 border-pink-500/30',
    annual:     'bg-blue-500/20 text-blue-300 border-blue-500/30',
    maternity:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    ordination: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

function DayLeaveModal({ date, onClose }: { date: Date; onClose: () => void }) {
    const router = useRouter()
    const [leaves, setLeaves] = useState<any[] | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const iso = date.toISOString().split('T')[0]
        fetch(`/api/leave/by-date?date=${iso}`)
            .then(r => r.json())
            .then(data => { setLeaves(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => { setLeaves([]); setLoading(false) })
    }, [date])

    const dateStr = date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ animation: 'fadeInModal 0.18s ease' }}
            onClick={onClose}
        >
            <style>{`
                @keyframes fadeInModal {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes slideUpModal {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />

            {/* Panel */}
            <div
                style={{
                    ...newsModalStyle,
                    animation: 'slideUpModal 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                    maxHeight: '80vh',
                }}
                className="relative w-full max-w-md flex flex-col z-10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div>
                        <p className="text-[10px] uppercase font-black text-white/35 tracking-[0.2em] mb-0.5">รายชื่อผู้ลา</p>
                        <h3 className="text-base font-black text-white leading-snug">{dateStr}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-colors ml-4 shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={22} className="animate-spin text-white/40" />
                        </div>
                    ) : !leaves || leaves.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-white/35">
                            <CalendarDays size={36} className="mb-3 opacity-50" />
                            <p className="text-sm font-bold">ไม่มีพนักงานลาวันนี้</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {leaves.map(lr => {
                                const emp = lr.employees
                                if (!emp) return null
                                return (
                                    <button
                                        key={lr.id}
                                        onClick={() => { router.push(`/hradmin/employees/${emp.id}`); onClose() }}
                                        className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/10 transition-colors text-left group"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-[#561e23]/80 border border-[#ad5f6c]/40 flex items-center justify-center text-white font-black text-sm shrink-0">
                                            {emp.first_name_th?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold text-sm truncate">
                                                {fullName(emp.first_name_th, emp.last_name_th, emp.nickname)}
                                            </p>
                                            <p className="text-white/45 text-xs truncate">{emp.department}</p>
                                        </div>
                                        <span className={cn(
                                            'text-xs font-bold px-2.5 py-1 rounded-full border shrink-0',
                                            LEAVE_BADGE[lr.leave_type] ?? 'bg-white/10 text-white/60 border-white/15'
                                        )}>
                                            {LEAVE_LABELS[lr.leave_type] ?? lr.leave_type}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {leaves && leaves.length > 0 && (
                    <div className="px-5 py-3 border-t border-white/10 text-xs text-white/30 font-bold uppercase tracking-widest text-center">
                        {leaves.length} คน · คลิกชื่อเพื่อดูโปรไฟล์
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Week Calendar ────────────────────────────────────────────────────────────
function WeekCalendar({ weekDays, leavesToday, onDayClick }: {
    weekDays: string[]
    leavesToday: any[]
    onDayClick: (date: Date) => void
}) {
    const DAY_NAMES = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return (
        <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((iso, i) => {
                const d = new Date(iso)
                const isToday = d.toDateString() === today.toDateString()
                return (
                    <button
                        key={i}
                        onClick={() => onDayClick(d)}
                        className={cn(
                            'flex flex-col items-center py-2.5 px-1 rounded-xl text-center transition-colors cursor-pointer',
                            'hover:bg-white/10 active:scale-95',
                            isToday ? 'bg-[#882136]/70 ring-1 ring-[#ad5f6c]' : 'bg-white/5',
                            i >= 5 && 'opacity-40',
                        )}
                    >
                        <span className="text-xs font-bold text-white/40">{DAY_NAMES[i]}</span>
                        <span className={cn('text-lg font-black mt-0.5', isToday ? 'text-white' : 'text-white/70')}>
                            {d.getDate()}
                        </span>
                        {isToday && leavesToday.length > 0 && (
                            <span className="mt-1 text-xs font-bold bg-[#ad5f6c] text-white rounded-full px-1.5 py-0.5 leading-none">
                                {leavesToday.length}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

// ─── Pending Leave Row ────────────────────────────────────────────────────────
function PendingRow({ lr, onDone }: { lr: any; onDone: (id: string) => void }) {
    const router = useRouter()
    const [isPending, start] = useTransition()
    const [done, setDone] = useState<'approve' | 'reject' | null>(null)
    const detailHref = `/hradmin/leave?tab=requests&status=pending&request=${encodeURIComponent(lr.id)}`
    const act = (action: 'approve' | 'reject') => {
        start(async () => {
            await handleLeaveAction(lr.id, action)
            setDone(action)
            onDone(lr.id)
        })
    }
    const name = lr.employee
        ? fullName(lr.employee.first_name_th, lr.employee.last_name_th, lr.employee.nickname)
        : lr.employee_id
    if (done) {
        return (
            <div className="flex items-center gap-2 py-2 px-3 rounded-xl text-sm text-white/45 italic">
                {done === 'approve'
                    ? <><CheckCircle size={15} className="text-emerald-400" /> อนุมัติแล้ว</>
                    : <><XCircle size={15} className="text-red-400" /> ปฏิเสธแล้ว</>}
            </div>
        )
    }
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => router.push(detailHref)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(detailHref)
                }
            }}
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 transition-colors cursor-pointer group"
            title="เปิดรายละเอียดใบลา"
        >
            <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white truncate group-hover:text-amber-100">{name}</p>
                <p className="text-sm text-white/50">
                    {LEAVE_LABELS[lr.leave_type] ?? lr.leave_type} · {lr.total_days} วัน ·{' '}
                    {new Date(lr.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[11px] font-semibold text-amber-200/70 mt-0.5">ดูรายละเอียด →</p>
            </div>
            <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={(e) => { e.stopPropagation(); act('approve') }} disabled={isPending}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-sm font-bold transition-colors disabled:opacity-40">
                    {isPending ? <Loader2 size={13} className="animate-spin" /> : 'อนุมัติ'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); act('reject') }} disabled={isPending}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-sm font-bold transition-colors disabled:opacity-40">
                    ปฏิเสธ
                </button>
            </div>
        </div>
    )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
// ─── Priority label + color ───────────────────────────────────────────────────
const PRIORITY_LABEL: Record<string, string> = {
    emergency: 'ฉุกเฉิน', urgent: 'ด่วน', promote: 'กิจกรรม', internal: 'ทั่วไป',
}
const PRIORITY_COLOR: Record<string, string> = {
    emergency: 'bg-red-500/25 text-red-300 border-red-500/30',
    urgent: 'bg-amber-500/25 text-amber-300 border-amber-500/30',
    promote: 'bg-purple-500/25 text-purple-300 border-purple-500/30',
    internal: 'bg-blue-500/20 text-blue-300 border-blue-500/25',
}

// ─── Month names Thai ─────────────────────────────────────────────────────────
const MONTHS_TH = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export function HRDashboard({
    metrics, attendanceStats, leaveChartData, deptData, attendanceData,
    pendingLeaves, contractsExpiring, anniversaries,
    weekDays, leavesToday, urgentBanners, newsAnnouncements, birthdays,
    canViewAttendanceInsights = false,
}: Props) {
    const router = useRouter()
    const [pending, setPending] = useState(pendingLeaves)
    const removePending = (id: string) => setPending(prev => prev.filter(r => r.id !== id))
    const [selectedNews, setSelectedNews] = useState<any>(null)
    const [selectedDay, setSelectedDay] = useState<Date | null>(null)

    return (
        <div className="space-y-6">
            {selectedNews && <NewsModal news={selectedNews} onClose={() => setSelectedNews(null)} />}
            {selectedDay && <DayLeaveModal date={selectedDay} onClose={() => setSelectedDay(null)} />}

            {/* Urgent Banners */}
            <UrgentBanners banners={urgentBanners} />

            {/* ── 2-column layout: left 2/3, right 1/3 ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* ══ LEFT COL (2/3) ══ */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 2xl:grid-cols-4 gap-3 lg:gap-4">
                        {/* Headline = active count (the actionable number — HR
                            decisions are about people who are still here).
                            Inactive count goes to the subtitle so the data
                            isn't lost, and only renders when there's at least
                            one inactive row to keep the card clean for fresh
                            companies. */}
                        <MetricCard title="พนักงาน" value={metrics.activeEmployees}
                            sub={
                                metrics.totalEmployees > metrics.activeEmployees
                                    ? `พ้นสภาพ ${metrics.totalEmployees - metrics.activeEmployees} คน`
                                    : 'ปฏิบัติงานทุกคน'
                            }
                            icon={Users} accent="bg-gradient-to-br from-blue-500 to-blue-700"
                            href="/hradmin/employees" />
                        <MetricCard title="ลาวันนี้" value={metrics.leavingToday}
                            sub="ได้รับอนุมัติแล้ว" icon={CalendarDays} accent="bg-gradient-to-br from-emerald-500 to-emerald-700"
                            href="/hradmin/leave/admin?filter=today" />
                        <MetricCard title="รออนุมัติใบลา" value={metrics.pendingLeaves}
                            sub="รายการ" icon={Clock} accent="bg-gradient-to-br from-amber-500 to-amber-700"
                            href="/hradmin/leave/admin?status=pending" />
                        <MetricCard title="สัญญาหมดใน 30 วัน" value={metrics.expiringContracts}
                            sub="คน" icon={AlertTriangle} accent="bg-gradient-to-br from-rose-500 to-rose-700"
                            href="/hradmin/employees?filter=contract-expiring" />
                    </div>

                    {/* Attendance widget */}
                    {attendanceStats && <AttendanceWidget stats={attendanceStats} />}

                    {canViewAttendanceInsights && (
                        <button
                            type="button"
                            onClick={() => router.push('/hradmin/attendance/insights')}
                            className="w-full rounded-2xl border border-amber-300/20 bg-amber-300/10 hover:bg-amber-300/14 px-4 py-3 text-left transition-colors flex items-center justify-between gap-4"
                        >
                            <span className="flex items-center gap-3 min-w-0">
                                <span className="h-10 w-10 rounded-xl bg-amber-300/14 border border-amber-300/22 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={19} className="text-amber-200" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold text-white">สถิติขาด ลา มาสาย</span>
                                    <span className="block text-xs text-white/48 mt-0.5 truncate">ดูรายชื่อพนักงานที่ควรติดตามและตักเตือน</span>
                                </span>
                            </span>
                            <span className="text-sm font-bold text-amber-200 shrink-0">เปิดดู →</span>
                        </button>
                    )}

                    {/* Bar chart – monthly leave */}
                    <div style={glassStyle} className="p-6">
                        <SectionHeader title="สถิติการลารายเดือน (12 เดือนย้อนหลัง)" icon={TrendingUp} />
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={leaveChartData} barSize={9} barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 13 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 13 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<LeaveTooltip />} />
                                <Legend formatter={v => <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{LEAVE_LABELS[v] ?? v}</span>} />
                                {Object.keys(LEAVE_LABELS).map(k => (
                                    <Bar key={k} dataKey={k} stackId="a"
                                        fill={LEAVE_COLORS[k]}
                                        opacity={1}
                                        fillOpacity={1}
                                        isAnimationActive={false}
                                        radius={k === 'ordination' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Donut + Line side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Donut – dept distribution */}
                        <div style={glassStyle} className="p-6">
                            <SectionHeader title="สัดส่วนพนักงานแยกฝ่าย" icon={Building2} />
                            <DeptDonut data={deptData} total={metrics.activeEmployees} />
                        </div>

                        {/* Line chart – weekly attendance */}
                        <div style={glassStyle} className="p-6">
                            <SectionHeader title="อัตราการมาทำงาน (30 วัน)" icon={TrendingUp} />
                            <ResponsiveContainer width="100%" height={210}>
                                <LineChart data={attendanceData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: 'rgba(20,5,8,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 13 }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(v, name) => [`${Number(v ?? 0)} คน`, String(name) === 'present' ? 'มาทำงาน' : 'ลา/ขาด']}
                                    />
                                    <Legend formatter={v => <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{v === 'present' ? 'มาทำงาน' : 'ลา/ขาด'}</span>} />
                                    <Line type="monotone" dataKey="present" stroke="#60A5FA" strokeWidth={2.5} dot={{ r: 4, fill: '#60A5FA' }} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="absent" stroke="#F472B6" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: '#F472B6' }} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* ══ RIGHT COL (1/3) ══ */}
                <div className="space-y-5">

                    {/* ── ประกาศข่าวสาร ── */}
                    <div style={glassStyle} className="p-5">
                        <div className="flex flex-col gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <Megaphone size={16} className="text-[#ad5f6c]" />
                                <h2 className="text-xs 2xl:text-sm lg:text-base font-semibold text-white/80 tracking-wide whitespace-nowrap">ประกาศข่าวสาร</h2>
                            </div>
                            <button
                                onClick={() => router.push('/hradmin/hr/announcements')}
                                className="text-xs font-bold text-white/40 hover:text-white/80 transition-colors self-end -order-1"
                            >
                                ดูทั้งหมด →
                            </button>
                        </div>
                        {newsAnnouncements.length === 0 ? (
                            <p className="text-sm text-white/30 italic text-center py-4">ยังไม่มีประกาศ</p>
                        ) : (
                            <div className="divide-y divide-white/10">
                                {newsAnnouncements.map(a => (
                                    <div key={a.id} className="py-1 first:pt-0 last:pb-0 cursor-pointer group" onClick={() => setSelectedNews(a)}>
                                        <span className={cn(
                                            'inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full border mb-1',
                                            PRIORITY_COLOR[a.priority] ?? 'bg-white/10 text-white/50 border-white/10'
                                        )}>
                                            {PRIORITY_LABEL[a.priority] ?? a.priority}
                                        </span>
                                        <p className="text-xs 2xl:text-sm font-bold text-white/85 group-hover:text-white leading-snug transition-colors">{a.headline}</p>
                                        <p className="text-xs 2xl:text-sm font-semibold text-white mt-1">
                                            {new Date(a.publish_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Week calendar */}
                    <div style={glassStyle} className="p-5">
                        <SectionHeader title={`ปฏิทินสัปดาห์นี้ · ลาวันนี้ ${leavesToday.length} คน`} icon={CalendarDays} />
                        <WeekCalendar weekDays={weekDays} leavesToday={leavesToday} onDayClick={setSelectedDay} />
                    </div>

                    {/* ใครไม่อยู่วันนี้ (Who is out today) */}
                    <div style={glassStyle} className="p-5">
                        <SectionHeader title={`ใครไม่อยู่วันนี้ (${leavesToday.length})`} icon={UserX} />
                        {leavesToday.length === 0 ? (
                            <p className="text-sm text-white/30 italic text-center py-4">ไม่มีพนักงานลาวันนี้</p>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {leavesToday.map(lr => {
                                    const emp = lr.employees
                                    if (!emp) return null
                                    const name = fullName(emp.first_name_th, emp.last_name_th, emp.nickname)
                                    return (
                                        <div 
                                            key={lr.id} 
                                            onClick={() => router.push(`/hradmin/employees/${emp.id}`)}
                                            className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                                        >
                                            {emp.photo_url ? (
                                                <img 
                                                    src={emp.photo_url} 
                                                    alt={emp.first_name_th ?? ''} 
                                                    className="h-9 w-9 rounded-full object-cover border border-white/10 shrink-0"
                                                />
                                            ) : (
                                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-rose-500/80 to-purple-600/80 flex items-center justify-center text-xs font-black text-white border border-white/10 shrink-0">
                                                    {emp.first_name_th?.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white group-hover:text-amber-200 transition-colors truncate">
                                                    {name}
                                                </p>
                                                <p className="text-[10px] text-white/45 truncate mt-0.5">{emp.department}</p>
                                            </div>
                                            <span className={cn(
                                                'text-[10px] font-black px-2.5 py-0.5 rounded-full border shrink-0',
                                                LEAVE_BADGE[lr.leave_type] ?? 'bg-white/10 text-white/60 border-white/15'
                                            )}>
                                                {LEAVE_LABELS[lr.leave_type] ?? lr.leave_type}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pending approvals */}
                    <div style={glassStyle} className="p-5">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <SectionHeader title={`รออนุมัติใบลา (${pending.length})`} icon={Clock} className="mb-0" />
                            <button
                                type="button"
                                onClick={() => router.push('/hradmin/leave?tab=requests&status=pending')}
                                className="text-xs font-bold text-amber-200/70 hover:text-amber-100 transition-colors shrink-0"
                            >
                                ดูทั้งหมด →
                            </button>
                        </div>
                        {pending.length === 0 ? (
                            <p className="text-sm text-white/30 italic text-center py-4">ไม่มีใบลารออนุมัติ</p>
                        ) : (
                            <div className="space-y-1">
                                {pending.map(lr => <PendingRow key={lr.id} lr={lr} onDone={removePending} />)}
                            </div>
                        )}
                    </div>

                    {/* Anniversaries */}
                    {anniversaries.length > 0 && (
                        <div style={glassStyle} className="p-5">
                            <SectionHeader title="ครบรอบปีในเดือนนี้" icon={Cake} />
                            <div className="space-y-2">
                                {anniversaries.slice(0, 5).map(e => (
                                    <div key={e.id} className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-orange-900/30 shrink-0">
                                            {e.first_name_th?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs 2xl:text-sm font-bold text-white leading-tight">
                                                <Link href={`/hradmin/employees/${e.id}`} className="hover:underline hover:text-amber-200 transition-colors">
                                                    {fullName(e.first_name_th, e.last_name_th, e.nickname)}
                                                </Link>
                                            </p>
                                            <p className="text-xs 2xl:text-sm font-semibold text-white mt-1">{e.department}</p>
                                        </div>
                                        <span className="text-xs 2xl:text-sm font-black text-amber-300 shrink-0">{e.years} ปี</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expiring contracts */}
                    {contractsExpiring.length > 0 && (
                        <div style={glassStyle} className="p-5">
                            <SectionHeader title={`สัญญาใกล้หมด (${contractsExpiring.length} คน)`} icon={AlertTriangle} warn />
                            <div className="space-y-2">
                                {contractsExpiring.slice(0, 4).map(e => {
                                    const daysLeft = Math.ceil((new Date(e.end_date).getTime() - Date.now()) / 86400000)
                                    return (
                                        <div key={e.id} className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-white/5 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base font-bold text-white truncate">{fullName(e.first_name_th, e.last_name_th, e.nickname)}</p>
                                                <p className="text-sm text-white/40 truncate">{e.department}</p>
                                            </div>
                                            <span className={cn('text-sm font-black px-2.5 py-0.5 rounded-full shrink-0',
                                                daysLeft <= 7 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300')}>
                                                {daysLeft} วัน
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── วันเกิดเดือนนี้ ── */}
                    {birthdays.length > 0 && (
                        <div style={glassStyle} className="p-5">
                            <div className="flex items-center gap-2 mb-4"><div className="h-7 w-7 rounded-lg bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><Gift size={14} className="text-amber-300" /></div><h2 className="text-xs 2xl:text-sm lg:text-base font-semibold text-white/80 tracking-wide">วันเกิดเดือนนี้ ({birthdays.length} คน)</h2></div>
                            <div className="space-y-2">
                                {birthdays.slice(0, 6).map(e => (
                                    <div key={e.id} className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#561e23] to-[#882136] flex items-center justify-center text-xs font-black text-white shadow-lg shadow-black/40 ring-1 ring-white/20 shrink-0">
                                            {e.first_name_th?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs 2xl:text-sm font-bold text-white leading-tight">
                                                <Link href={`/hradmin/employees/${e.id}`} className="hover:underline hover:text-amber-200 transition-colors">
                                                    {fullName(e.first_name_th, e.last_name_th, e.nickname)}
                                                </Link>
                                            </p>
                                            <p className="text-xs 2xl:text-sm font-semibold text-white mt-1">{e.dobDay} {MONTHS_TH[e.dobMonth]}</p>
                                        </div>
                                        <span className="text-xs 2xl:text-sm font-black text-white/90 shrink-0">{e.age} ปี</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
