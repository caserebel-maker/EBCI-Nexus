'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Clock, Calendar, MapPin, User, Bell, X } from 'lucide-react'
import { PieChart, Pie, Cell, Sector } from 'recharts'

interface Employee {
    firstNameTH: string
    lastNameTH: string
    position: string
    department: string
    startDate: string
    gender: string | null
    nickname: string | null
    avatarUrl: string | null
}

interface Announcement {
    headline: string
    content: string
    imagePath: string | null
}

interface LeaveBalance {
    leaveType: string
    entitledDays: number
    usedDays: number
    remainingDays: number
}

interface Props {
    sessionName: string
    employee: Employee | null
    announcement: Announcement | null
    leaveBalances: LeaveBalance[]
}

const SHORTCUTS = [
    { label: 'โปรไฟล์',   icon: User,     href: '/portal/profile' },
    { label: 'ยื่นใบลา',   icon: FileText,  href: '/portal/leave' },
    { label: 'ดูสถานะลา', icon: Clock,     href: '/portal/leave' },
    { label: 'ปฏิทิน',    icon: Calendar,  href: '/portal/calendar' },
    { label: 'ลงเวลา',    icon: MapPin,    href: '/portal/checkin' },
    { label: 'แจ้งเตือน', icon: Bell,      href: '/portal/notifications' },
]

const GENDER_LEAVE_LABEL: Record<string, string> = {
    maternity:  'ลาคลอด',
    ordination: 'ลาบวช',
}

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
}

function calcTenure(startDate: string): string {
    const start = new Date(startDate)
    const now = new Date()
    const totalMonths =
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    const y = Math.floor(totalMonths / 12)
    const m = totalMonths % 12
    if (y === 0) return `${m} เดือน`
    return `${y} ปี`
}

function isFemale(gender: string | null): boolean {
    if (!gender) return false
    const g = gender.toLowerCase()
    return g === 'หญิง' || g === 'female' || g === 'f'
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
const PIE_SEGMENTS = [
    { key: 'annual',   valueKey: 'remainingDays', label: 'พักร้อนคงเหลือ', color: '#60A5FA' },
    { key: 'sick',     valueKey: 'usedDays',      label: 'ป่วย (ใช้ไป)',    color: '#F87171' },
    { key: 'personal', valueKey: 'remainingDays', label: 'กิจคงเหลือ',     color: '#FBBF24' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderActiveShape(props: any) {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    return (
        <Sector
            cx={cx} cy={cy}
            innerRadius={innerRadius - 3}
            outerRadius={outerRadius + 6}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
        />
    )
}

function LeavePieChart({ leaveBalances }: { leaveBalances: LeaveBalance[] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null)

    const segments = PIE_SEGMENTS.map(seg => {
        const bal = leaveBalances.find(b => b.leaveType === seg.key)
        const value = seg.valueKey === 'usedDays' ? (bal?.usedDays ?? 0) : (bal?.remainingDays ?? 0)
        return { ...seg, value: Math.max(0, value) }
    })

    const hasData = segments.some(s => s.value > 0)
    const totalRemaining = (leaveBalances.find(b => b.leaveType === 'annual')?.remainingDays ?? 0)
        + (leaveBalances.find(b => b.leaveType === 'personal')?.remainingDays ?? 0)

    const activeSeg = activeIndex !== null ? segments[activeIndex] : null
    const chartSize = 160
    const cx = chartSize / 2
    const cy = chartSize / 2

    return (
        <div className="relative" style={{ width: chartSize, height: chartSize }}>
            {hasData ? (
                <PieChart width={chartSize} height={chartSize}>
                    <Pie
                        data={segments}
                        cx={cx}
                        cy={cy}
                        innerRadius={52}
                        outerRadius={72}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={2}
                        stroke="rgba(0,0,0,0.15)"
                        activeIndex={activeIndex ?? undefined}
                        activeShape={renderActiveShape}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                        onClick={(_, index) => setActiveIndex(activeIndex === index ? null : index)}
                        style={{ cursor: 'pointer' }}
                    >
                        {segments.map((seg, i) => (
                            <Cell key={i} fill={seg.value > 0 ? seg.color : 'rgba(255,255,255,0.06)'} />
                        ))}
                    </Pie>
                </PieChart>
            ) : (
                <svg width={chartSize} height={chartSize}>
                    <circle cx={cx} cy={cy} r={62} fill="none"
                        stroke="rgba(255,255,255,0.1)" strokeWidth={20} />
                </svg>
            )}
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {activeSeg ? (
                    <>
                        <span className="rounded-full mb-1"
                            style={{ width: 8, height: 8, background: activeSeg.color, display: 'inline-block' }} />
                        <span className="text-white font-bold" style={{ fontSize: '22px', lineHeight: 1 }}>
                            {activeSeg.value}
                        </span>
                        <span className="text-white/50 text-center px-2" style={{ fontSize: '9px', maxWidth: 80 }}>
                            {activeSeg.label}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="text-white font-bold" style={{ fontSize: '26px', lineHeight: 1 }}>
                            {totalRemaining}
                        </span>
                        <span className="text-white/50" style={{ fontSize: '10px' }}>วันคงเหลือ</span>
                    </>
                )}
            </div>
        </div>
    )
}
// ──────────────────────────────────────────────────────────────────────────────

export function PortalDashboardClient({ sessionName, employee, announcement, leaveBalances }: Props) {
    const [modalOpen, setModalOpen] = useState(false)

    const displayName = employee
        ? `${employee.firstNameTH} ${employee.lastNameTH}`
        : sessionName

    const female = employee ? isFemale(employee.gender) : false
    const genderType = female ? 'maternity' : 'ordination'
    const genderBalance = leaveBalances.find(b => b.leaveType === genderType && b.entitledDays > 0) ?? null

    return (
        <div className="max-w-lg mx-auto space-y-4 pb-4">

            {/* 1. ภาพข่าวสาร */}
            <button
                className="w-full text-left focus:outline-none"
                onClick={() => announcement && setModalOpen(true)}
                disabled={!announcement}
            >
                <div style={{ ...glass, overflow: 'hidden' }}>
                    {announcement?.imagePath ? (
                        <div className="w-full" style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                            <img
                                src={announcement.imagePath}
                                alt={announcement.headline}
                                className="w-full h-full object-cover transition-transform active:scale-95"
                            />
                        </div>
                    ) : (
                        <div className="w-full flex items-center justify-center"
                            style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #882136 0%, #561e23 100%)' }}>
                            <span className="text-white/30 text-sm">ไม่มีข่าวสารในขณะนี้</span>
                        </div>
                    )}
                </div>
            </button>

            {/* 2. การ์ด Profile 2 คอลัมน์ */}
            <div style={glass} className="p-4">
                <div className="flex items-center gap-4">

                    {/* คอลัมน์ซ้าย: Avatar + ข้อมูล */}
                    <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: '42%' }}>
                        {/* Avatar */}
                        {employee?.avatarUrl ? (
                            <img
                                src={employee.avatarUrl}
                                alt=""
                                className="rounded-full object-cover"
                                style={{ width: 80, height: 80, border: '2px solid rgba(255,255,255,0.2)' }}
                            />
                        ) : (
                            <div style={{
                                width: 80, height: 80,
                                background: 'linear-gradient(135deg, #882136, #c0392b)',
                                borderRadius: '50%',
                                border: '2px solid rgba(255,255,255,0.15)',
                            }} />
                        )}

                        {/* ชื่อ + ข้อมูล */}
                        <div className="text-center w-full">
                            <p className="text-white font-bold leading-snug" style={{ fontSize: '14px' }}>
                                {displayName}
                                {employee?.nickname ? ` (${employee.nickname})` : ''}
                            </p>
                            {employee && (
                                <>
                                    <p className="text-white/60 mt-1" style={{ fontSize: '11px' }}>
                                        {employee.position}
                                    </p>
                                    <p className="text-white/45 mt-0.5" style={{ fontSize: '11px' }}>
                                        ฝ่าย : {employee.department}
                                    </p>
                                    <p className="text-white/35 mt-0.5" style={{ fontSize: '11px' }}>
                                        อายุงาน : {calcTenure(employee.startDate)}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* คอลัมน์ขวา: Donut chart */}
                    <div className="flex flex-1 justify-center items-center">
                        <LeavePieChart leaveBalances={leaveBalances} />
                    </div>
                </div>

                {/* Gender-specific text row */}
                {genderBalance && (
                    <div
                        className="flex items-center justify-between px-1 mt-3 pt-2.5"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        <span className="text-white/55" style={{ fontSize: '12px' }}>
                            {GENDER_LEAVE_LABEL[genderBalance.leaveType] ?? genderBalance.leaveType}
                        </span>
                        <span className="text-white/80 font-medium" style={{ fontSize: '12px' }}>
                            {genderBalance.remainingDays}
                            <span className="text-white/35"> / {genderBalance.entitledDays} วัน</span>
                        </span>
                    </div>
                )}
            </div>

            {/* 3. เมนูด่วน */}
            <div style={glass} className="p-4">
                <p className="text-white font-bold mb-3" style={{ fontSize: '15px' }}>เมนูด่วน</p>
                <div className="grid grid-cols-3 gap-3">
                    {SHORTCUTS.map(({ label, icon: Icon, href }) => (
                        <Link
                            key={label}
                            href={href}
                            className="flex flex-col items-center gap-2 py-4 rounded-2xl text-center transition-all active:scale-95"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                        >
                            <Icon size={28} className="text-white/90" />
                            <span className="text-white/85 font-medium leading-tight" style={{ fontSize: '15px' }}>
                                {label}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {modalOpen && announcement && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                    onClick={() => setModalOpen(false)}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        style={{ ...glass, background: 'rgba(15,4,7,0.94)', borderRadius: '20px' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {announcement.imagePath && (
                            <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9', borderRadius: '20px 20px 0 0' }}>
                                <img src={announcement.imagePath} alt={announcement.headline} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <h2 className="text-white font-bold" style={{ fontSize: '18px', lineHeight: 1.3 }}>
                                    {announcement.headline}
                                </h2>
                                <button onClick={() => setModalOpen(false)} className="text-white/50 hover:text-white transition-colors shrink-0 mt-0.5">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-white/70 leading-relaxed whitespace-pre-wrap" style={{ fontSize: '14px' }}>
                                {announcement.content}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
