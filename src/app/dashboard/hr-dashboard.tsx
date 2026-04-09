'use client'

import { useState, useTransition } from 'react'
import {
    Users, CalendarDays, Clock, AlertTriangle, TrendingUp,
    CheckCircle, XCircle, Cake, Building2, ChevronRight, Loader2
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts'
import { UrgentBanners } from '@/components/dashboard/urgent-banners'
import { cn } from '@/lib/utils'

// ─── Glass card style ───────────────────────────────────────────────────────
const glass = {
    style: {
        background: 'rgba(86,30,35,0.28)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
    } as React.CSSProperties,
}

// ─── Leave type labels ────────────────────────────────────────────────────
const LEAVE_LABELS: Record<string, string> = {
    sick: 'ลาป่วย', personal: 'ลากิจ', annual: 'ลาพักร้อน',
    maternity: 'ลาคลอด', ordination: 'ลาบวช',
}
const LEAVE_COLORS: Record<string, string> = {
    sick: '#e07a7a', personal: '#e0b87a', annual: '#7ab5e0',
    maternity: '#c47ae0', ordination: '#7ae0c4',
}
const DEPT_COLORS = [
    '#ad5f6c', '#882136', '#c47a88', '#561e23',
    '#d4a0aa', '#6b3040', '#f0c4cb', '#9e4a58',
]

// ─── Types ────────────────────────────────────────────────────────────────
interface Metrics {
    totalEmployees: number
    activeEmployees: number
    leavingToday: number
    pendingLeaves: number
    expiringContracts: number
}

interface Props {
    metrics: Metrics
    leaveChartData: any[]
    deptData: any[]
    attendanceData: any[]
    pendingLeaves: any[]
    contractsExpiring: any[]
    anniversaries: any[]
    weekDays: string[]
    leavesToday: any[]
    urgentBanners: any[]
}

// ─── Server action (inline approach via fetch) ────────────────────────────
async function handleLeaveAction(id: string, action: 'approve' | 'reject') {
    await fetch(`/api/leave/requests/${id}/${action}`, { method: 'POST' })
}

// ─── Metric Card ─────────────────────────────────────────────────────────
function MetricCard({ title, value, sub, icon: Icon, accent }: {
    title: string; value: string | number; sub?: string
    icon: any; accent: string
}) {
    return (
        <div style={glass.style} className="p-5 flex items-start gap-4">
            <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', accent)}>
                <Icon size={22} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest truncate">{title}</p>
                <p className="text-3xl font-black text-white mt-0.5">{value}</p>
                {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

// ─── Leave type Thai tooltip ──────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: 'rgba(30,10,12,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
            <p className="text-white/60 text-xs mb-2 font-bold">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="text-xs" style={{ color: p.color }}>
                    {LEAVE_LABELS[p.dataKey] ?? p.dataKey}: {p.value} ครั้ง
                </p>
            ))}
        </div>
    )
}

// ─── Pending Leave Row ────────────────────────────────────────────────────
function PendingRow({ lr, onDone }: { lr: any; onDone: (id: string) => void }) {
    const [isPending, start] = useTransition()
    const [done, setDone] = useState<'approve' | 'reject' | null>(null)

    const act = (action: 'approve' | 'reject') => {
        start(async () => {
            await handleLeaveAction(lr.id, action)
            setDone(action)
            onDone(lr.id)
        })
    }

    const name = lr.employee
        ? `${lr.employee.first_name_th} ${lr.employee.last_name_th}`
        : lr.employee_id

    if (done) {
        return (
            <div className="flex items-center gap-2 py-2 px-3 rounded-xl text-xs text-white/50 italic">
                {done === 'approve'
                    ? <><CheckCircle size={14} className="text-emerald-400" /> อนุมัติแล้ว</>
                    : <><XCircle size={14} className="text-red-400" /> ปฏิเสธแล้ว</>}
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{name}</p>
                <p className="text-xs text-white/50">
                    {LEAVE_LABELS[lr.leave_type] ?? lr.leave_type} · {lr.total_days} วัน ·{' '}
                    {new Date(lr.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                </p>
            </div>
            <div className="flex gap-1 shrink-0">
                <button
                    onClick={() => act('approve')}
                    disabled={isPending}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors disabled:opacity-40"
                >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : 'อนุมัติ'}
                </button>
                <button
                    onClick={() => act('reject')}
                    disabled={isPending}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-bold transition-colors disabled:opacity-40"
                >
                    ปฏิเสธ
                </button>
            </div>
        </div>
    )
}

// ─── Week Calendar ────────────────────────────────────────────────────────
function WeekCalendar({ weekDays, leavesToday }: { weekDays: string[]; leavesToday: any[] }) {
    const dayNames = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
        <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((iso, i) => {
                const d = new Date(iso)
                const isToday = d.toDateString() === today.toDateString()
                const isWeekend = i >= 5
                return (
                    <div
                        key={i}
                        className={cn(
                            'flex flex-col items-center py-2 px-1 rounded-xl text-center transition-colors',
                            isToday ? 'bg-[#882136]/60 ring-1 ring-[#ad5f6c]' : 'bg-white/5',
                            isWeekend && 'opacity-40',
                        )}
                    >
                        <span className="text-[10px] font-bold text-white/40 uppercase">{dayNames[i]}</span>
                        <span className={cn('text-base font-black mt-0.5', isToday ? 'text-white' : 'text-white/70')}>
                            {d.getDate()}
                        </span>
                        {isToday && leavesToday.length > 0 && (
                            <span className="mt-1 text-[9px] font-bold bg-[#ad5f6c] text-white rounded-full px-1.5 py-0.5">
                                {leavesToday.length}
                            </span>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─── Section header ───────────────────────────────────────────────────────
function SectionHeader({ title, icon: Icon }: { title: string; icon: any }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <Icon size={15} className="text-[#ad5f6c]" />
            <h2 className="text-xs font-black text-white/60 uppercase tracking-[0.18em]">{title}</h2>
        </div>
    )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
export function HRDashboard({
    metrics, leaveChartData, deptData, attendanceData,
    pendingLeaves, contractsExpiring, anniversaries,
    weekDays, leavesToday, urgentBanners,
}: Props) {
    const [pending, setPending] = useState(pendingLeaves)
    const removePending = (id: string) => setPending(prev => prev.filter(r => r.id !== id))

    return (
        <div className="space-y-6">
            {/* Urgent Banners */}
            <UrgentBanners banners={urgentBanners} />

            {/* ── Metric Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="พนักงานทั้งหมด"
                    value={metrics.totalEmployees}
                    sub={`ปฏิบัติงาน ${metrics.activeEmployees} คน`}
                    icon={Users}
                    accent="bg-[#882136]"
                />
                <MetricCard
                    title="ลาวันนี้"
                    value={metrics.leavingToday}
                    sub="ได้รับอนุมัติแล้ว"
                    icon={CalendarDays}
                    accent="bg-[#7a3040]"
                />
                <MetricCard
                    title="รออนุมัติใบลา"
                    value={metrics.pendingLeaves}
                    sub="รายการ"
                    icon={Clock}
                    accent="bg-[#9e4050]"
                />
                <MetricCard
                    title="สัญญาหมดใน 30 วัน"
                    value={metrics.expiringContracts}
                    sub="คน"
                    icon={AlertTriangle}
                    accent="bg-[#6b2030]"
                />
            </div>

            {/* ── Main 3-column grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* ── Left col: Charts ── */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Bar chart – monthly leave */}
                    <div style={glass.style} className="p-6">
                        <SectionHeader title="สถิติการลารายเดือน (12 เดือนย้อนหลัง)" icon={TrendingUp} />
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={leaveChartData} barSize={8} barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{LEAVE_LABELS[v] ?? v}</span>} />
                                {Object.keys(LEAVE_LABELS).map(k => (
                                    <Bar key={k} dataKey={k} stackId="a" fill={LEAVE_COLORS[k]} radius={k === 'ordination' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bottom 2 charts side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Donut – dept distribution */}
                        <div style={glass.style} className="p-6">
                            <SectionHeader title="สัดส่วนพนักงานแยกฝ่าย" icon={Building2} />
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={deptData}
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {deptData.map((_, i) => (
                                            <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(v: any, name: string) => [`${v} คน`, name]}
                                        contentStyle={{ background: 'rgba(30,10,12,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend
                                        formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>{v.length > 16 ? v.slice(0, 16) + '…' : v}</span>}
                                        iconSize={8}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Line chart – weekly attendance */}
                        <div style={glass.style} className="p-6">
                            <SectionHeader title="อัตราการมาทำงาน (30 วัน)" icon={TrendingUp} />
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={attendanceData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: 'rgba(30,10,12,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(v: any, name: string) => [
                                            `${v} คน`,
                                            name === 'present' ? 'มาทำงาน' : 'ลา/ขาด'
                                        ]}
                                    />
                                    <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v === 'present' ? 'มาทำงาน' : 'ลา/ขาด'}</span>} />
                                    <Line type="monotone" dataKey="present" stroke="#ad5f6c" strokeWidth={2.5} dot={{ r: 4, fill: '#ad5f6c' }} />
                                    <Line type="monotone" dataKey="absent" stroke="#e07a7a" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: '#e07a7a' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* ── Right col: Cards ── */}
                <div className="space-y-5">

                    {/* Week calendar */}
                    <div style={glass.style} className="p-5">
                        <SectionHeader title={`ปฏิทินสัปดาห์นี้ · ลาวันนี้ ${leavesToday.length} คน`} icon={CalendarDays} />
                        <WeekCalendar weekDays={weekDays} leavesToday={leavesToday} />
                    </div>

                    {/* Pending approvals */}
                    <div style={glass.style} className="p-5">
                        <SectionHeader title={`รออนุมัติใบลา (${pending.length})`} icon={Clock} />
                        {pending.length === 0 ? (
                            <p className="text-xs text-white/30 italic text-center py-4">ไม่มีใบลารออนุมัติ</p>
                        ) : (
                            <div className="space-y-1">
                                {pending.map(lr => (
                                    <PendingRow key={lr.id} lr={lr} onDone={removePending} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Anniversaries */}
                    {anniversaries.length > 0 && (
                        <div style={glass.style} className="p-5">
                            <SectionHeader title="ครบรอบปีในเดือนนี้" icon={Cake} />
                            <div className="space-y-2">
                                {anniversaries.slice(0, 5).map(e => (
                                    <div key={e.id} className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className="h-8 w-8 rounded-full bg-[#882136]/60 flex items-center justify-center text-xs font-black text-white border border-[#ad5f6c]/30 shrink-0">
                                            {e.first_name_th?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">
                                                {e.first_name_th} {e.last_name_th}
                                            </p>
                                            <p className="text-xs text-white/40">{e.department}</p>
                                        </div>
                                        <span className="text-xs font-black text-[#ad5f6c] shrink-0">{e.years} ปี</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expiring contracts */}
                    {contractsExpiring.length > 0 && (
                        <div style={glass.style} className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle size={15} className="text-amber-400" />
                                <h2 className="text-xs font-black text-white/60 uppercase tracking-[0.18em]">
                                    สัญญาใกล้หมด ({contractsExpiring.length} คน)
                                </h2>
                            </div>
                            <div className="space-y-2">
                                {contractsExpiring.slice(0, 4).map(e => {
                                    const daysLeft = Math.ceil(
                                        (new Date(e.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                    )
                                    return (
                                        <div key={e.id} className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-white/5 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">
                                                    {e.first_name_th} {e.last_name_th}
                                                </p>
                                                <p className="text-xs text-white/40 truncate">{e.department}</p>
                                            </div>
                                            <span className={cn(
                                                'text-xs font-black px-2 py-0.5 rounded-full shrink-0',
                                                daysLeft <= 7
                                                    ? 'bg-red-500/20 text-red-300'
                                                    : 'bg-amber-500/20 text-amber-300'
                                            )}>
                                                {daysLeft} วัน
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
