'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { FileText, Clock, Calendar, MapPin, User, Bell, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { AnnouncementItem } from './page'

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

interface LeaveBalance {
    leaveType: string
    entitledDays: number
    usedDays: number
    remainingDays: number
}

interface Props {
    sessionName: string
    employee: Employee | null
    announcements: AnnouncementItem[]
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

function isFemale(gender: string | null): boolean {
    if (!gender) return false
    const g = gender.toLowerCase()
    return g === 'หญิง' || g === 'female' || g === 'f'
}

// ─── Welcome Section ──────────────────────────────────────────────────────────
function WelcomeSection({ employee, sessionName }: { employee: Employee | null; sessionName: string }) {
    const firstName = employee?.firstNameTH ?? sessionName
    const lastName  = employee?.lastNameTH ?? ''
    const nickname  = employee?.nickname ?? null
    const position  = employee?.position ?? ''
    const department = employee?.department ?? ''
    const avatarUrl  = employee?.avatarUrl ?? null

    const displayName = nickname
        ? `${firstName} (${nickname})`
        : `${firstName} ${lastName}`.trim()

    const initials = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase()

    return (
        <div style={glass} className="p-4 flex items-center gap-3">
            {/* Avatar */}
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt=""
                    className="rounded-full object-cover shrink-0"
                    style={{ width: 48, height: 48, border: '2px solid rgba(255,255,255,0.2)' }}
                />
            ) : (
                <div
                    className="rounded-full shrink-0 flex items-center justify-center font-black text-white select-none"
                    style={{
                        width: 48, height: 48,
                        background: 'linear-gradient(135deg, #882136, #c0392b)',
                        border: '2px solid rgba(255,255,255,0.15)',
                        fontSize: '18px',
                    }}
                >
                    {initials}
                </div>
            )}

            {/* Name + Position */}
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate" style={{ fontSize: '15px' }}>
                    {displayName}
                </p>
                {(position || department) && (
                    <p className="text-white/50 truncate mt-0.5" style={{ fontSize: '11.5px' }}>
                        {position}
                        {position && department && <span className="text-white/25 mx-1">•</span>}
                        {department}
                    </p>
                )}
            </div>

            {/* Greeting bubble */}
            <div
                className="shrink-0 text-right px-3 py-2 rounded-xl"
                style={{ background: 'rgba(136,33,54,0.25)', border: '1px solid rgba(173,95,108,0.25)' }}
            >
                <p className="text-white/40" style={{ fontSize: '10px' }}>สวัสดี</p>
                <p className="text-white font-semibold leading-snug" style={{ fontSize: '12.5px' }}>
                    วันนี้เป็นอย่างไรบ้าง? 👋
                </p>
            </div>
        </div>
    )
}

// ─── Announcement Slideshow ───────────────────────────────────────────────────
function AnnouncementSlideshow({ announcements }: { announcements: AnnouncementItem[] }) {
    const [current, setCurrent] = useState(0)
    const [modalAnn, setModalAnn] = useState<AnnouncementItem | null>(null)
    const touchStartX = useRef<number | null>(null)
    const total = announcements.length

    useEffect(() => {
        if (total <= 1) return
        const id = setInterval(() => {
            setCurrent(c => (c + 1) % total)
        }, 7000)
        return () => clearInterval(id)
    }, [current, total])

    function goTo(idx: number) {
        setCurrent(((idx % total) + total) % total)
    }

    function handleTouchStart(e: React.TouchEvent) {
        touchStartX.current = e.touches[0].clientX
    }
    function handleTouchEnd(e: React.TouchEvent) {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(dx) < 40) return
        goTo(dx < 0 ? current + 1 : current - 1)
    }

    const ann = announcements[current]

    return (
        <>
            <div style={{ ...glass, overflow: 'hidden', position: 'relative' }}>
                <button
                    className="w-full text-left focus:outline-none block"
                    onClick={() => ann && setModalAnn(ann)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div style={{ aspectRatio: '16/9', overflow: 'hidden', position: 'relative' }}>
                        {ann?.imagePath ? (
                            <img
                                key={current}
                                src={ann.imagePath}
                                alt={ann.headline}
                                className="w-full h-full object-cover"
                                style={{ animation: 'fadeIn 0.4s ease' }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #882136 0%, #561e23 100%)' }}>
                                <span className="text-white/30 text-sm">ไม่มีข่าวสารในขณะนี้</span>
                            </div>
                        )}
                    </div>
                </button>

                {total > 1 && (
                    <>
                        <button
                            onClick={() => goTo(current - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.35)', marginTop: -12 }}
                        >
                            <ChevronLeft size={16} className="text-white" />
                        </button>
                        <button
                            onClick={() => goTo(current + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.35)', marginTop: -12 }}
                        >
                            <ChevronRight size={16} className="text-white" />
                        </button>
                    </>
                )}

                {total > 1 && (
                    <div className="flex justify-center items-center gap-1.5 py-2.5">
                        {announcements.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                className="rounded-full transition-all duration-300"
                                style={{
                                    width: i === current ? 18 : 6,
                                    height: 6,
                                    background: i === current ? '#fff' : 'rgba(255,255,255,0.3)',
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

            {modalAnn && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                    onClick={() => setModalAnn(null)}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        style={{ ...glass, background: 'rgba(15,4,7,0.94)', borderRadius: '20px' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {modalAnn.imagePath && (
                            <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9', borderRadius: '20px 20px 0 0' }}>
                                <img src={modalAnn.imagePath} alt={modalAnn.headline} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <h2 className="text-white font-bold" style={{ fontSize: '18px', lineHeight: 1.3 }}>
                                    {modalAnn.headline}
                                </h2>
                                <button onClick={() => setModalAnn(null)} className="text-white/50 hover:text-white transition-colors shrink-0 mt-0.5">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-white/70 leading-relaxed whitespace-pre-wrap" style={{ fontSize: '14px' }}>
                                {modalAnn.content}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Mini SVG Donut ───────────────────────────────────────────────────────────
function MiniDonut({
    remaining, entitled, color, label,
}: {
    remaining: number
    entitled: number
    color: string
    label: string
}) {
    const r = 34
    const cx = 46
    const cy = 46
    const sw = 9
    const circ = 2 * Math.PI * r
    const pct = entitled > 0 ? Math.max(0, Math.min(remaining / entitled, 1)) : 0
    const remainingDash = pct * circ

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: 92, height: 92 }}>
                <svg width={92} height={92} viewBox="0 0 92 92">
                    {/* Used (gray track) */}
                    <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke="rgba(255,255,255,0.12)" strokeWidth={sw} />
                    {/* Remaining (colored) */}
                    {remainingDash > 0.5 && (
                        <circle cx={cx} cy={cy} r={r} fill="none"
                            stroke={color} strokeWidth={sw} strokeLinecap="round"
                            strokeDasharray={`${remainingDash} ${circ}`}
                            transform={`rotate(-90, ${cx}, ${cy})`} />
                    )}
                </svg>
                {/* Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-white font-black leading-none" style={{ fontSize: '20px' }}>
                        {remaining}
                    </span>
                    <span className="font-semibold" style={{ fontSize: '9.5px', color: color + 'cc' }}>
                        {label}
                    </span>
                </div>
            </div>
        </div>
    )
}

// ──────────────────────────────────────────────────────────────────────────────
export function PortalDashboardClient({ sessionName, employee, announcements, leaveBalances }: Props) {
    const female = employee ? isFemale(employee.gender) : false
    const genderType = female ? 'maternity' : 'ordination'
    const genderBalance = leaveBalances.find(b => b.leaveType === genderType && b.entitledDays > 0) ?? null

    return (
        <div className="max-w-lg mx-auto space-y-4 pb-4">

            {/* 1. Welcome Section */}
            <WelcomeSection employee={employee} sessionName={sessionName} />

            {/* 2. Announcement Slideshow (banner ประกาศ) */}
            <AnnouncementSlideshow announcements={announcements} />

            {/* 3. Leave Balance Card — 2 Donut Charts */}
            {(() => {
                const annual = leaveBalances.find(b => b.leaveType === 'annual')
                const sick   = leaveBalances.find(b => b.leaveType === 'sick')
                const annualRemaining = annual?.remainingDays ?? 6
                const annualEntitled  = annual?.entitledDays  ?? 6
                const sickRemaining   = sick?.remainingDays   ?? 30
                const sickEntitled    = sick?.entitledDays    ?? 30

                return (
                    <div style={glass} className="p-4">
                        <p className="text-white/40 font-bold uppercase tracking-wider mb-3" style={{ fontSize: '10px' }}>
                            วันลา — ปี {new Date().getFullYear()}
                        </p>
                        <div className="flex items-center justify-around">
                            <MiniDonut
                                remaining={annualRemaining}
                                entitled={annualEntitled}
                                color="#34D399"
                                label="พักร้อน"
                            />
                            <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />
                            <MiniDonut
                                remaining={sickRemaining}
                                entitled={sickEntitled}
                                color="#60A5FA"
                                label="ป่วย"
                            />
                        </div>

                        {/* Gender-specific leave row */}
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
                )
            })()}

            {/* 4. เมนูด่วน */}
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
        </div>
    )
}
