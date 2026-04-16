'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { FileText, Clock, Calendar, MapPin, User, Bell, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, Sector } from 'recharts'
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

// ─── Donut Chart (Recharts) ───────────────────────────────────────────────────
const PIE_SEGMENTS = [
    { key: 'annual',   valueKey: 'remainingDays', label: 'พักร้อนคงเหลือ', color: '#60A5FA' },
    { key: 'sick',     valueKey: 'usedDays',      label: 'ป่วย (ใช้ไป)',    color: '#F87171' },
    { key: 'personal', valueKey: 'remainingDays', label: 'กิจคงเหลือ',     color: '#FBBF24' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PieCompat = Pie as any

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
    const annualBalance = leaveBalances.find(b => b.leaveType === 'annual')
    const annualRemaining = annualBalance?.remainingDays ?? 0
    const annualUsed = annualBalance?.usedDays ?? 0

    const activeSeg = activeIndex !== null ? segments[activeIndex] : null
    const chartSize = 150
    const cx = chartSize / 2
    const cy = chartSize / 2

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: chartSize, height: chartSize }}>
                {hasData ? (
                    <PieChart width={chartSize} height={chartSize}>
                        <PieCompat
                            data={segments}
                            cx={cx} cy={cy}
                            innerRadius={48}
                            outerRadius={67}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            strokeWidth={2}
                            stroke="rgba(0,0,0,0.15)"
                            activeIndex={activeIndex ?? undefined}
                            activeShape={renderActiveShape}
                            onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                            onClick={(_: unknown, index: number) => setActiveIndex(activeIndex === index ? null : index)}
                            style={{ cursor: 'pointer' }}
                        >
                            {segments.map((seg, i) => (
                                <Cell key={i} fill={seg.value > 0 ? seg.color : 'rgba(255,255,255,0.06)'} />
                            ))}
                        </PieCompat>
                    </PieChart>
                ) : (
                    <svg width={chartSize} height={chartSize}>
                        <circle cx={cx} cy={cy} r={57} fill="none"
                            stroke="rgba(255,255,255,0.1)" strokeWidth={18} />
                    </svg>
                )}

                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {activeSeg ? (
                        <>
                            <span className="rounded-full mb-1"
                                style={{ width: 8, height: 8, background: activeSeg.color, display: 'inline-block' }} />
                            <span className="text-white font-bold" style={{ fontSize: '20px', lineHeight: 1 }}>
                                {activeSeg.value}
                            </span>
                            <span className="text-white/50 text-center px-2" style={{ fontSize: '9px', maxWidth: 80 }}>
                                {activeSeg.label}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-white font-bold" style={{ fontSize: '24px', lineHeight: 1 }}>
                                {annualRemaining}
                            </span>
                            <span className="text-white/50" style={{ fontSize: '10px' }}>วันคงเหลือ</span>
                        </>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-1 w-full">
                {segments.map((seg, i) => (
                    <button
                        key={i}
                        className="flex items-center gap-1.5 text-left w-full"
                        onMouseEnter={() => setActiveIndex(i)}
                        onMouseLeave={() => setActiveIndex(null)}
                        onClick={() => setActiveIndex(activeIndex === i ? null : i)}
                    >
                        <span className="rounded-full shrink-0"
                            style={{ width: 7, height: 7, background: seg.color }} />
                        <span className="text-white/50 truncate" style={{ fontSize: '10px' }}>
                            {seg.label}: <span className="text-white/70 font-medium">{seg.value}</span>
                        </span>
                    </button>
                ))}
            </div>

            {/* ใช้ไป / คงเหลือ annual summary */}
            <div className="flex gap-3 mt-1">
                <span className="text-white/40" style={{ fontSize: '10px' }}>
                    ใช้ไป <span className="text-white/65 font-bold">{annualUsed}</span> วัน
                </span>
            </div>
        </div>
    )
}

// ─── Leave Balance Right Panel ────────────────────────────────────────────────
function LeaveRightPanel({ leaveBalances }: { leaveBalances: LeaveBalance[] }) {
    const annual = leaveBalances.find(b => b.leaveType === 'annual')
    const remaining = annual?.remainingDays ?? 0
    const entitled  = annual?.entitledDays  ?? 6
    const used      = annual?.usedDays      ?? 0
    const pct = entitled > 0 ? Math.round((used / entitled) * 100) : 0

    return (
        <div className="flex flex-col justify-center gap-2 flex-1">
            <p className="text-white/40 font-bold uppercase tracking-wider" style={{ fontSize: '10px' }}>
                ลาพักร้อน คงเหลือ
            </p>
            <p className="text-white font-black leading-none" style={{ fontSize: '52px' }}>
                {remaining}
            </p>
            <p className="text-white/45" style={{ fontSize: '11px' }}>
                สิทธิ์ทั้งหมด {entitled} วัน
            </p>
            <p className="text-white/35" style={{ fontSize: '11px' }}>
                ใช้ไปแล้ว {used} วัน
            </p>

            {/* Progress bar */}
            <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)', maxWidth: 140 }}>
                <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: '#882136' }}
                />
            </div>
            <p className="text-white/25" style={{ fontSize: '10px' }}>{pct}% ของสิทธิ์</p>
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

            {/* 3. Leave Balance Card — Donut (left) + Big number (right) */}
            <div style={glass} className="p-4">
                <p className="text-white/40 font-bold uppercase tracking-wider mb-3" style={{ fontSize: '10px' }}>
                    วันลา — ปี {new Date().getFullYear()}
                </p>

                <div className="flex items-start gap-4">
                    {/* Left: Donut chart */}
                    <LeavePieChart leaveBalances={leaveBalances} />

                    {/* Divider */}
                    <div className="self-stretch w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

                    {/* Right: Big remaining days */}
                    <LeaveRightPanel leaveBalances={leaveBalances} />
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
