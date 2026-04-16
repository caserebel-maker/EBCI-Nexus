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

interface AttendanceData {
    lateCount: number
    workingDays: number
}

interface Props {
    sessionName: string
    employee: Employee | null
    announcements: AnnouncementItem[]
    leaveBalances: LeaveBalance[]
    attendanceData: AttendanceData
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

function WelcomeSection({ employee, sessionName }: { employee: Employee | null; sessionName: string }) {
    const firstName  = employee?.firstNameTH ?? sessionName
    const lastName   = employee?.lastNameTH ?? ''
    const nickname   = employee?.nickname ?? null
    const position   = employee?.position ?? ''
    const department = employee?.department ?? ''
    const avatarUrl  = employee?.avatarUrl ?? null
    const startDate  = employee?.startDate ?? null

    const displayName = nickname
        ? `${firstName} ${lastName} (${nickname})`.trim()
        : `${firstName} ${lastName}`.trim()

    const initials = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase()
    const tenure = startDate ? calcTenure(startDate) : null

    return (
        <>
            {/* Greeting — bare text, no card */}
            <div className="py-3 px-4">
                <p className="text-white font-medium" style={{ fontSize: '15px' }}>
                    สวัสดี 👋 วันนี้เป็นอย่างไรบ้าง?
                </p>
            </div>

            {/* Profile card */}
            <div style={glass} className="p-4 flex items-center gap-3">
                {/* Avatar 56px */}
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt=""
                        className="rounded-full object-cover shrink-0"
                        style={{ width: 56, height: 56, border: '2px solid rgba(255,255,255,0.2)' }}
                    />
                ) : (
                    <div
                        className="rounded-full shrink-0 flex items-center justify-center font-black text-white select-none"
                        style={{
                            width: 56, height: 56,
                            background: 'linear-gradient(135deg, #882136, #c0392b)',
                            border: '2px solid rgba(255,255,255,0.15)',
                            fontSize: '20px',
                        }}
                    >
                        {initials}
                    </div>
                )}

                {/* Name / Position / Tenure */}
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate" style={{ fontSize: '16px' }}>
                        {displayName}
                    </p>
                    {(position || department) && (
                        <p className="text-white/70 truncate mt-0.5" style={{ fontSize: '12px' }}>
                            {position}
                            {position && department && <span className="text-white/30 mx-1">•</span>}
                            {department}
                        </p>
                    )}
                    {tenure && (
                        <p className="text-white/60 mt-0.5" style={{ fontSize: '11px' }}>
                            อายุงาน {tenure}
                        </p>
                    )}
                </div>
            </div>
        </>
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

// ─── SVG Donut + Popup Card ───────────────────────────────────────────────────
const popupGlass: React.CSSProperties = {
    background: 'rgba(20,4,10,0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(173,95,108,0.30)',
    borderRadius: '16px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}

function DonutCard({
    filled, total, color, centerValue, centerLabel, popupContent, isOpen, onOpen, onClose,
}: {
    filled: number      // colored arc value (e.g. lateCount or remainingDays)
    total: number       // full circle basis
    color: string
    centerValue: number
    centerLabel: string
    popupContent: React.ReactNode
    isOpen: boolean
    onOpen: () => void
    onClose: () => void
}) {
    const size = 140
    const cx = size / 2
    const cy = size / 2
    const r = 54
    const sw = 13
    const circ = 2 * Math.PI * r
    const pct = total > 0 ? Math.max(0, Math.min(filled / total, 1)) : 0
    const filledDash = pct * circ

    return (
        <div className="relative flex flex-col items-center">
            {/* Donut — clickable */}
            <button
                onClick={onOpen}
                className="relative focus:outline-none active:scale-95 transition-transform"
                style={{ width: size, height: size }}
                aria-label={centerLabel}
            >
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Gray track */}
                    <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke="rgba(255,255,255,0.12)" strokeWidth={sw} />
                    {/* Colored arc */}
                    {filledDash > 0.5 && (
                        <circle cx={cx} cy={cy} r={r} fill="none"
                            stroke={color} strokeWidth={sw} strokeLinecap="round"
                            strokeDasharray={`${filledDash} ${circ}`}
                            transform={`rotate(-90, ${cx}, ${cy})`} />
                    )}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-white font-black leading-none" style={{ fontSize: '28px' }}>
                        {centerValue}
                    </span>
                    <span className="font-semibold mt-1" style={{ fontSize: '14px', color: color + 'dd' }}>
                        {centerLabel}
                    </span>
                </div>
            </button>

            {/* Popup */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={onClose}
                    />
                    {/* Panel — positioned above the donut */}
                    <div
                        className="absolute z-50 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-52 p-4"
                        style={popupGlass}
                    >
                        {popupContent}
                        {/* Caret */}
                        <div
                            className="absolute left-1/2 -translate-x-1/2 -bottom-[7px]"
                            style={{
                                width: 0, height: 0,
                                borderLeft: '7px solid transparent',
                                borderRight: '7px solid transparent',
                                borderTop: '7px solid rgba(173,95,108,0.30)',
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    )
}

function PopupRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-white/55" style={{ fontSize: '12px' }}>{label}</span>
            <span className="font-bold" style={{ fontSize: '13px', color: color ?? 'white' }}>{value}</span>
        </div>
    )
}

// ──────────────────────────────────────────────────────────────────────────────
export function PortalDashboardClient({ sessionName, employee, announcements, leaveBalances, attendanceData }: Props) {
    const [openPopup, setOpenPopup] = useState<'late' | 'leave' | null>(null)

    // ── Attendance data ───────────────────────────────────────────────────────
    const { lateCount, workingDays } = attendanceData
    const onTimeDays = Math.max(0, workingDays - lateCount)

    // ── Leave data ────────────────────────────────────────────────────────────
    const annual   = leaveBalances.find(b => b.leaveType === 'annual')
    const sick     = leaveBalances.find(b => b.leaveType === 'sick')
    const personal = leaveBalances.find(b => b.leaveType === 'personal')

    const annualRem   = annual?.remainingDays   ?? 6
    const sickRem     = sick?.remainingDays     ?? 30
    const personalRem = personal?.remainingDays ?? 3

    const totalRemaining = annualRem + sickRem + personalRem
    const totalEntitled  = (annual?.entitledDays ?? 6) + (sick?.entitledDays ?? 30) + (personal?.entitledDays ?? 3)

    const female = employee ? isFemale(employee.gender) : false
    const genderType = female ? 'maternity' : 'ordination'
    const genderBalance = leaveBalances.find(b => b.leaveType === genderType && b.entitledDays > 0) ?? null

    return (
        <div className="max-w-lg mx-auto space-y-4 pb-4">

            {/* 1. Welcome Section */}
            <WelcomeSection employee={employee} sessionName={sessionName} />

            {/* 2. Announcement Slideshow */}
            <AnnouncementSlideshow announcements={announcements} />

            {/* 3. Donut Card — Late (left) | Leave remaining (right) */}
            <div style={glass} className="p-4 overflow-visible">
                <div className="flex items-center justify-around">
                    {/* Left: การมาสาย */}
                    <DonutCard
                        filled={lateCount}
                        total={workingDays || 1}
                        color="#F87171"
                        centerValue={lateCount}
                        centerLabel="มาสาย"
                        isOpen={openPopup === 'late'}
                        onOpen={() => setOpenPopup('late')}
                        onClose={() => setOpenPopup(null)}
                        popupContent={
                            <div className="space-y-2">
                                <p className="text-white font-bold mb-2" style={{ fontSize: '13px' }}>การมาสาย</p>
                                <PopupRow label="มาสายในปีนี้"     value={`${lateCount} ครั้ง`}  color="#F87171" />
                                <PopupRow label="วันทำงานทั้งหมด"  value={`${workingDays} วัน`} />
                                <PopupRow label="มาตรงเวลา"       value={`${onTimeDays} วัน`}   color="#34D399" />
                            </div>
                        }
                    />

                    <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />

                    {/* Right: วันลาคงเหลือ */}
                    <DonutCard
                        filled={totalRemaining}
                        total={totalEntitled || 1}
                        color="#34D399"
                        centerValue={totalRemaining}
                        centerLabel="คงเหลือ"
                        isOpen={openPopup === 'leave'}
                        onOpen={() => setOpenPopup('leave')}
                        onClose={() => setOpenPopup(null)}
                        popupContent={
                            <div className="space-y-2">
                                <p className="text-white font-bold mb-2" style={{ fontSize: '13px' }}>วันลาคงเหลือ</p>
                                <PopupRow label="พักร้อน" value={`${annualRem} วัน`}   color="#34D399" />
                                <PopupRow label="ป่วย"    value={`${sickRem} วัน`}     color="#60A5FA" />
                                <PopupRow label="กิจ"     value={`${personalRem} วัน`} color="#FBBF24" />
                            </div>
                        }
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
