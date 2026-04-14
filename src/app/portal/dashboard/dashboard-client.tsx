'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Clock, Calendar, MapPin, User, Bell, X } from 'lucide-react'

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

const LEAVE_CONFIG: Record<string, { label: string; color: string }> = {
    annual:       { label: 'พักร้อน', color: '#60A5FA' },
    sick:         { label: 'ป่วย',    color: '#34D399' },
    personal:     { label: 'กิจ',     color: '#FBBF24' },
    compensation: { label: 'ชดเชย',   color: '#FB923C' },
    maternity:    { label: 'คลอด',    color: '#F472B6' },
    ordination:   { label: 'บวช',     color: '#A78BFA' },
}

const SHORTCUTS = [
    { label: 'โปรไฟล์',   icon: User,     href: '/portal/profile' },
    { label: 'ยื่นใบลา',   icon: FileText,  href: '/portal/leave' },
    { label: 'ดูสถานะลา', icon: Clock,     href: '/portal/leave' },
    { label: 'ปฏิทิน',    icon: Calendar,  href: '/portal/calendar' },
    { label: 'ลงเวลา',    icon: MapPin,    href: '/portal/checkin' },
    { label: 'แจ้งเตือน', icon: Bell,      href: '/portal/notifications' },
]

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
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

function CircleChart({ leaveType, remaining, total }: {
    leaveType: string
    remaining: number
    total: number
}) {
    const cfg = LEAVE_CONFIG[leaveType]
    const r = 17
    const size = 48
    const cx = size / 2
    const cy = size / 2
    const circumference = 2 * Math.PI * r
    const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
    const offset = circumference * (1 - pct)
    const isWarn = total > 0 && remaining <= 3
    const strokeColor = isWarn ? '#EF4444' : (cfg?.color ?? '#fff')

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                    <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke={strokeColor} strokeWidth="5"
                        strokeDasharray={circumference}
                        strokeDashoffset={total === 0 ? circumference : offset}
                        strokeLinecap="round"
                        style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px` }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold" style={{ fontSize: '12px' }}>
                        {remaining}
                    </span>
                </div>
            </div>
            <p className="text-white/75 font-medium text-center" style={{ fontSize: '11px', lineHeight: 1.2 }}>
                {cfg?.label ?? leaveType}
            </p>
            <p className="text-white/35" style={{ fontSize: '10px' }}>/{total} วัน</p>
        </div>
    )
}

function isFemale(gender: string | null): boolean {
    if (!gender) return false
    const g = gender.toLowerCase()
    return g === 'หญิง' || g === 'female' || g === 'f'
}

export function PortalDashboardClient({ sessionName, employee, announcement, leaveBalances }: Props) {
    const [modalOpen, setModalOpen] = useState(false)

    const displayName = employee
        ? `${employee.firstNameTH} ${employee.lastNameTH}`
        : sessionName
    const initials = employee
        ? `${employee.firstNameTH.charAt(0)}${employee.lastNameTH.charAt(0)}`
        : sessionName.charAt(0)

    const mainTypes = ['annual', 'sick', 'personal', 'compensation']
    const mainBalances = mainTypes.map(t => leaveBalances.find(b => b.leaveType === t) ?? { leaveType: t, entitledDays: 0, usedDays: 0, remainingDays: 0 })

    const female = employee ? isFemale(employee.gender) : false
    const genderType = female ? 'maternity' : 'ordination'
    const genderBalance = leaveBalances.find(b => b.leaveType === genderType)
        ?? { leaveType: genderType, entitledDays: 0, usedDays: 0, remainingDays: 0 }

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

            {/* 2. การ์ด Profile + วันลา รวม */}
            <div style={glass} className="p-4 space-y-4">
                {/* Profile row */}
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 text-lg font-bold text-white select-none"
                        style={{ background: 'linear-gradient(135deg, #882136, #c0392b)' }}>
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold leading-tight truncate" style={{ fontSize: '17px' }}>
                            {displayName}
                            {employee?.nickname && (
                                <span className="text-white/45 font-normal text-sm ml-1.5">({employee.nickname})</span>
                            )}
                        </p>
                        {employee && (
                            <>
                                <p className="text-white/65 truncate" style={{ fontSize: '13px' }}>
                                    {employee.position} • {employee.department}
                                </p>
                                <p className="text-white/40" style={{ fontSize: '12px' }}>
                                    อายุงาน {calcTenure(employee.startDate)}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />

                {/* Leave section header */}
                <p className="text-white font-semibold" style={{ fontSize: '14px' }}>วันลาคงเหลือ</p>

                {/* 4 main circles */}
                <div className="grid grid-cols-4 gap-2">
                    {mainBalances.map(b => (
                        <CircleChart
                            key={b.leaveType}
                            leaveType={b.leaveType}
                            remaining={b.remainingDays}
                            total={b.entitledDays}
                        />
                    ))}
                </div>

                {/* Gender-specific circle */}
                <div className="flex justify-center pt-1">
                    <div className="flex flex-col items-center gap-1">
                        <CircleChart
                            leaveType={genderBalance.leaveType}
                            remaining={genderBalance.remainingDays}
                            total={genderBalance.entitledDays}
                        />
                    </div>
                </div>
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
                                <h2 className="text-white font-bold" style={{ fontSize: '18px', lineHeight: 1.3 }}>{announcement.headline}</h2>
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
