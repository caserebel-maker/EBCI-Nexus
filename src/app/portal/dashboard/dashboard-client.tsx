'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Clock, Calendar, MapPin, User, Bell, X } from 'lucide-react'
import { PieChart, Pie, Cell } from 'recharts'

interface Employee {
    firstNameTH: string
    lastNameTH: string
    position: string
    department: string
    startDate: string
    gender: string | null
    nickname: string | null
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
    if (m === 0) return `${y} ปี`
    return `${y} ปี ${m} เดือน`
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

function LeavePieChart({ leaveBalances }: { leaveBalances: LeaveBalance[] }) {
    const segments = PIE_SEGMENTS.map(seg => {
        const bal = leaveBalances.find(b => b.leaveType === seg.key)
        const value = seg.valueKey === 'usedDays' ? (bal?.usedDays ?? 0) : (bal?.remainingDays ?? 0)
        return { ...seg, value: Math.max(0, value) }
    })

    const hasData = segments.some(s => s.value > 0)
    const totalRemaining = (leaveBalances.find(b => b.leaveType === 'annual')?.remainingDays ?? 0)
        + (leaveBalances.find(b => b.leaveType === 'personal')?.remainingDays ?? 0)

    const chartSize = 120
    const cx = chartSize / 2
    const cy = chartSize / 2

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: chartSize, height: chartSize }}>
                {hasData ? (
                    <PieChart width={chartSize} height={chartSize}>
                        <Pie
                            data={segments}
                            cx={cx}
                            cy={cy}
                            innerRadius={38}
                            outerRadius={54}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            strokeWidth={2}
                            stroke="rgba(0,0,0,0.15)"
                        >
                            {segments.map((seg, i) => (
                                <Cell key={i} fill={seg.value > 0 ? seg.color : 'rgba(255,255,255,0.06)'} />
                            ))}
                        </Pie>
                    </PieChart>
                ) : (
                    <svg width={chartSize} height={chartSize}>
                        <circle cx={cx} cy={cy} r={46} fill="none"
                            stroke="rgba(255,255,255,0.1)" strokeWidth={16} />
                    </svg>
                )}
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-white font-bold" style={{ fontSize: '22px', lineHeight: 1 }}>
                        {totalRemaining}
                    </span>
                    <span className="text-white/50" style={{ fontSize: '10px' }}>วัน</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-0.5 w-full">
                {PIE_SEGMENTS.map(seg => (
                    <div key={seg.key} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                        <span className="text-white/55 truncate" style={{ fontSize: '10px' }}>{seg.label}</span>
                    </div>
                ))}
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
    const initials = employee
        ? `${employee.firstNameTH.charAt(0)}${employee.lastNameTH.charAt(0)}`
        : sessionName.charAt(0)

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
                <div className="flex items-start gap-3">

                    {/* คอลัมน์ซ้าย 60% */}
                    <div className="flex flex-col gap-2 min-w-0" style={{ flex: '0 0 58%' }}>
                        {/* Avatar + ชื่อ */}
                        <div className="flex items-center gap-2.5">
                            <div
                                className="rounded-full flex items-center justify-center shrink-0 font-bold text-white select-none"
                                style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #882136, #c0392b)', fontSize: '16px' }}
                            >
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white font-bold leading-tight" style={{ fontSize: '16px' }}>
                                    {displayName}
                                </p>
                                {employee?.nickname && (
                                    <p className="text-white/45" style={{ fontSize: '12px' }}>
                                        ({employee.nickname})
                                    </p>
                                )}
                            </div>
                        </div>

                        {employee && (
                            <>
                                <p className="text-white/65 leading-snug" style={{ fontSize: '12px' }}>
                                    {employee.position}
                                </p>
                                <p className="text-white/45" style={{ fontSize: '12px' }}>
                                    {employee.department}
                                </p>
                                <p className="text-white/40 mt-1" style={{ fontSize: '11px' }}>
                                    อายุงาน {calcTenure(employee.startDate)}
                                </p>
                            </>
                        )}
                    </div>

                    {/* คอลัมน์ขวา 40% */}
                    <div className="flex justify-center items-start" style={{ flex: '0 0 42%' }}>
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
