'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Clock, Calendar, MapPin, User, Bell, X, ChevronRight } from 'lucide-react'

interface Employee {
    firstNameTH: string
    lastNameTH: string
    position: string
    department: string
    startDate: string
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
    annual: { label: 'ลาพักร้อน', color: 'from-cyan-400 to-blue-500' },
    sick: { label: 'ลาป่วย', color: 'from-orange-400 to-amber-400' },
    personal: { label: 'ลากิจ', color: 'from-violet-400 to-purple-500' },
}

const SHORTCUTS = [
    { label: 'ยื่นใบลา', icon: FileText, href: '/portal/leave' },
    { label: 'ดูสถานะลา', icon: Clock, href: '/portal/leave' },
    { label: 'ปฏิทิน', icon: Calendar, href: '/portal/calendar' },
    { label: 'ลงเวลา', icon: MapPin, href: '/portal/checkin' },
    { label: 'โปรไฟล์', icon: User, href: '/portal/profile' },
    { label: 'แจ้งเตือน', icon: Bell, href: '/portal/notifications' },
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

export function PortalDashboardClient({ sessionName, employee, announcement, leaveBalances }: Props) {
    const [modalOpen, setModalOpen] = useState(false)

    const displayName = employee
        ? `${employee.firstNameTH} ${employee.lastNameTH}`
        : sessionName
    const initials = employee
        ? `${employee.firstNameTH.charAt(0)}${employee.lastNameTH.charAt(0)}`
        : sessionName.charAt(0)

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
                        <div
                            className="w-full flex flex-col items-center justify-center gap-2"
                            style={{
                                aspectRatio: '16/9',
                                background: 'linear-gradient(135deg, #882136 0%, #561e23 100%)',
                            }}
                        >
                            <span className="text-white/30 text-sm">ไม่มีข่าวสารในขณะนี้</span>
                        </div>
                    )}
                </div>
            </button>

            {/* 2. การ์ด Profile */}
            <div style={glass} className="p-4">
                <div className="flex items-center gap-4">
                    <div
                        className="h-14 w-14 rounded-full flex items-center justify-center shrink-0 text-xl font-bold text-white select-none"
                        style={{ background: 'linear-gradient(135deg, #882136, #c0392b)' }}
                    >
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-lg leading-tight truncate">{displayName}</p>
                        {employee && (
                            <>
                                <p className="text-white/70 text-sm truncate">
                                    {employee.position} • {employee.department}
                                </p>
                                <p className="text-white/45 text-xs mt-0.5">
                                    อายุงาน {calcTenure(employee.startDate)}
                                </p>
                            </>
                        )}
                    </div>
                </div>
                <Link
                    href="/portal/profile"
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-white/75 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)' }}
                >
                    ดูโปรไฟล์เต็ม <ChevronRight size={14} />
                </Link>
            </div>

            {/* 3. การ์ดสถิติวันลา */}
            <div style={glass} className="p-4 space-y-3">
                <p className="text-white font-bold text-base">วันลาคงเหลือ</p>
                {leaveBalances.length > 0 ? (
                    leaveBalances.map((b) => {
                        const cfg = LEAVE_CONFIG[b.leaveType]
                        const pct = b.entitledDays > 0
                            ? Math.max(0, Math.min(100, (b.remainingDays / b.entitledDays) * 100))
                            : 0
                        return (
                            <div key={b.leaveType}>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-white/80">{cfg?.label ?? b.leaveType}</span>
                                    <span className="text-white font-semibold">
                                        {b.remainingDays} <span className="text-white/50 font-normal">/ {b.entitledDays} วัน</span>
                                    </span>
                                </div>
                                <div
                                    className="h-2 rounded-full w-full"
                                    style={{ background: 'rgba(255,255,255,0.1)' }}
                                >
                                    <div
                                        className={`h-2 rounded-full bg-gradient-to-r ${cfg?.color ?? 'from-white to-white/60'}`}
                                        style={{ width: `${pct}%`, transition: 'width 0.6s ease' }}
                                    />
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <p className="text-white/40 text-sm">ไม่พบข้อมูลวันลา</p>
                )}
            </div>

            {/* 4. เมนูทางลัด 2x3 */}
            <div style={glass} className="p-4">
                <p className="text-white font-bold text-base mb-3">เมนูด่วน</p>
                <div className="grid grid-cols-3 gap-3">
                    {SHORTCUTS.map(({ label, icon: Icon, href }) => (
                        <Link
                            key={label}
                            href={href}
                            className="flex flex-col items-center gap-2 py-4 rounded-2xl text-center transition-all active:scale-95"
                            style={{
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.12)',
                            }}
                        >
                            <Icon size={30} className="text-white/90" />
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
                                <img
                                    src={announcement.imagePath}
                                    alt={announcement.headline}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <div className="p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <h2 className="text-white font-bold text-lg leading-snug">{announcement.headline}</h2>
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="text-white/50 hover:text-white transition-colors shrink-0 mt-0.5"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                                {announcement.content}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
