'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import {
    Calendar, MapPin, User, Bell, X, ChevronLeft, ChevronRight,
    AlertTriangle, AlertCircle, Info, Megaphone, UserCircle, Home, CalendarOff,
    Palmtree, DoorOpen, FileText, Sparkles,
} from 'lucide-react'
import { DailyGreeting } from '@/components/daily-greeting'
import { WhoIsOutWidget } from '@/components/who-is-out-widget'
import type { AnnouncementItem, TodayCalendarEntry } from './page'
import {
    DEFAULT_CORE_LEAVE_TOTALS,
    emptyCoreLeaveBalance,
    type CoreLeaveType,
    type DashboardLeaveBalance,
} from '@/lib/hr-leave-display'

interface Employee {
    firstNameTH: string
    lastNameTH: string
    position: string
    department: string
    startDate: string
    gender: string | null
    nickname: string | null
    dateOfBirth: string | null
    avatarUrl: string | null
}

interface AttendanceData {
    lateCount: number
    workingDays: number
}

interface Props {
    sessionName: string
    employee: Employee | null
    announcements: AnnouncementItem[]
    leaveBalances: DashboardLeaveBalance[]
    attendanceData: AttendanceData
    /** Set when today's date matches a row in the company calendar
     *  (`holidays` table). Used to render the WFH/holiday banner. */
    todayCalendarEntry: TodayCalendarEntry | null
}

// "ยื่นใบลา" + "ดูสถานะลา" used to be two tiles that pointed at the same
// /portal/leave page — confusing duplicate. Merged into one "การลา" tile
// that's the single entry point for everything leave-related, freeing a
// slot for "จองห้องประชุม" so the new feature is reachable in one tap.
//
// "แจ้งเตือน" tile removed (3 May) because the bell icon in the topbar
// already covers notifications — having a tile-sized shortcut to the
// same destination was clutter. Slot reused for "สลิปของฉัน" which is
// otherwise buried 3 taps deep (More → ของฉัน → สลิป).
const SHORTCUTS = [
    { label: 'โปรไฟล์',       icon: User,     href: '/portal/profile' },
    { label: 'การลา',          icon: Palmtree,  href: '/portal/leave' },
    { label: 'ปฏิทิน',         icon: Calendar,  href: '/portal/calendar' },
    { label: 'เช็คอิน',        icon: MapPin,    href: '/portal/checkin' },
    { label: 'จองห้องประชุม', icon: DoorOpen,  href: '/portal/meeting-room' },
    { label: 'ทายบอลโลก',     icon: Sparkles,  href: '/portal/events/world-cup', isEvent: true },
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
        /* Horizontal card: photo fills left, info on right */
        <div style={{ ...glass, overflow: 'hidden', display: 'flex', minHeight: 110 }}>

            {/* Photo panel — left, fills height */}
            <div className="shrink-0 relative" style={{ width: 110 }}>
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt=""
                        style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    <div
                        className="absolute inset-0 flex items-center justify-center font-black text-white select-none"
                        style={{
                            background: 'linear-gradient(160deg, #882136 0%, #c0392b 100%)',
                            fontSize: '32px',
                        }}
                    >
                        {initials}
                    </div>
                )}
                {/* Subtle right-edge fade so photo blends into card */}
                <div className="absolute inset-y-0 right-0 w-6"
                    style={{ background: 'linear-gradient(to right, transparent, rgba(30,6,12,0.45))' }} />
            </div>

            {/* Info panel — right */}
            <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3 gap-1">
                <p className="text-white/55 font-medium" style={{ fontSize: '12px' }}>
                    สวัสดี 👋
                </p>
                <p className="text-white font-bold leading-snug truncate" style={{ fontSize: '17px' }}>
                    {displayName}
                </p>
                {(position || department) && (
                    <p className="text-white/65 truncate" style={{ fontSize: '12px' }}>
                        {position}
                        {position && department && <span className="text-white/30 mx-1.5">·</span>}
                        {department}
                    </p>
                )}
                {tenure && (
                    <p className="text-white/45 mt-0.5" style={{ fontSize: '11px' }}>
                        อายุงาน {tenure}
                    </p>
                )}
            </div>
        </div>
    )
}

// ─── Announcement Carousel (Embla) ────────────────────────────────────────────
const PRIORITY_META: Record<string, { label: string; icon: typeof AlertTriangle; chipBg: string; chipText: string }> = {
    emergency: { label: 'ฉุกเฉิน', icon: AlertTriangle, chipBg: 'rgba(239,68,68,0.9)',  chipText: '#fff' },
    urgent:    { label: 'ด่วน',    icon: AlertCircle,   chipBg: 'rgba(245,158,11,0.9)', chipText: '#1a0f00' },
    promote:   { label: 'กิจกรรม', icon: Megaphone,     chipBg: 'rgba(168,85,247,0.9)', chipText: '#fff' },
    internal:  { label: 'ทั่วไป',  icon: Info,          chipBg: 'rgba(59,130,246,0.9)', chipText: '#fff' },
}

function formatThaiDate(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}

function AnnouncementModal({ ann, onClose }: { ann: AnnouncementItem; onClose: () => void }) {
    const meta = PRIORITY_META[ann.priority] ?? PRIORITY_META.internal
    const Icon = meta.icon

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[85vh] overflow-y-auto relative shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                style={{
                    ...glass,
                    background: 'rgba(86,30,35,0.77)',
                    borderRadius: '20px',
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all"
                    style={{ background: 'rgba(0,0,0,0.35)' }}
                    aria-label="ปิด"
                >
                    <X size={18} />
                </button>

                {ann.imagePath && (
                    <div className="w-full bg-black/30 flex justify-center" style={{ borderRadius: '20px 20px 0 0' }}>
                        <img src={ann.imagePath} alt={ann.headline} className="object-contain" style={{ maxHeight: '70vh', maxWidth: '100%' }} />
                    </div>
                )}

                <div className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                            style={{ background: meta.chipBg, color: meta.chipText }}
                        >
                            <Icon size={12} />
                            {meta.label}
                        </span>
                        <span className="text-[11px] text-white/50 inline-flex items-center gap-1">
                            <Calendar size={11} />
                            {formatThaiDate(ann.publishDate)}
                        </span>
                        {ann.expiresAt && (
                            <span className="text-[11px] text-white/40">
                                หมดอายุ {formatThaiDate(ann.expiresAt)}
                            </span>
                        )}
                    </div>
                    <h2 className="text-white font-bold leading-snug" style={{ fontSize: '18px' }}>
                        {ann.headline}
                    </h2>
                    <p className="text-[11px] text-white/55 inline-flex items-center gap-1.5">
                        <UserCircle size={13} />
                        โพสโดย: <span className="text-white/75 font-medium">{ann.creatorName ?? 'ระบบ'}</span>
                    </p>
                    <p className="text-white/85 leading-relaxed whitespace-pre-wrap" style={{ fontSize: '16px' }}>
                        {ann.content}
                    </p>
                </div>
            </div>
        </div>
    )
}

function AnnouncementsCarousel({ announcements }: { announcements: AnnouncementItem[] }) {
    const autoplay = useMemoAutoplay()
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [autoplay])
    const [selected, setSelected] = useState(0)
    const [modalAnn, setModalAnn] = useState<AnnouncementItem | null>(null)

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setSelected(emblaApi.selectedScrollSnap())
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return
        const frame = window.requestAnimationFrame(onSelect)
        emblaApi.on('select', onSelect)
        emblaApi.on('reInit', onSelect)
        return () => window.cancelAnimationFrame(frame)
    }, [emblaApi, onSelect])

    const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])
    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

    if (!announcements.length) return null
    const total = announcements.length

    return (
        <>
            <div
                style={{ ...glass, overflow: 'hidden', position: 'relative' }}
                onMouseEnter={() => autoplay.stop()}
                onMouseLeave={() => autoplay.play()}
            >
                <div ref={emblaRef} className="overflow-hidden">
                    <div className="flex">
                        {announcements.map((ann) => {
                            const meta = PRIORITY_META[ann.priority] ?? PRIORITY_META.internal
                            const Icon = meta.icon
                            return (
                                <button
                                    key={ann.id}
                                    type="button"
                                    onClick={() => setModalAnn(ann)}
                                    className="relative flex-[0_0_100%] min-w-0 text-left focus:outline-none"
                                >
                                    <div
                                        className="carousel-slide w-full relative overflow-hidden"
                                        style={{ background: 'linear-gradient(135deg, #561e23 0%, #882136 100%)' }}
                                    >
                                        {ann.imagePath ? (
                                            <img
                                                src={ann.imagePath}
                                                alt={ann.headline}
                                                className="absolute inset-0 w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div
                                                className="absolute inset-0 flex items-center justify-center"
                                                style={{ background: 'linear-gradient(135deg, #882136 0%, #561e23 100%)' }}
                                            >
                                                <Megaphone size={48} className="text-white/25" />
                                            </div>
                                        )}
                                        {/* Bottom gradient overlay — EBCI maroon, shorter + softer */}
                                        <div
                                            className="absolute inset-x-0 bottom-0 pointer-events-none"
                                            style={{
                                                height: '30%',
                                                background: 'linear-gradient(to top, rgba(86,30,35,0.75) 0%, rgba(86,30,35,0) 80%)',
                                            }}
                                        />
                                        {/* Priority badge — top left */}
                                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                                            <span
                                                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                                                style={{ background: meta.chipBg, color: meta.chipText }}
                                            >
                                                <Icon size={11} />
                                                {meta.label}
                                            </span>
                                        </div>
                                        {/* Text overlay bottom — compact */}
                                        <div className="absolute inset-x-0 bottom-0 px-3 py-2 sm:px-4 sm:py-2.5 text-left">
                                            <h3 className="text-white font-bold leading-tight line-clamp-2" style={{ fontSize: '15px', lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.45)' }}>
                                                {ann.headline}
                                            </h3>
                                            <p className="text-white/80 text-[11px] inline-flex items-center gap-1 mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                                                <Calendar size={11} />
                                                {formatThaiDate(ann.publishDate)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {total > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={scrollPrev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                            style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                            aria-label="Previous"
                        >
                            <ChevronLeft size={18} className="text-white" />
                        </button>
                        <button
                            type="button"
                            onClick={scrollNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                            style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                            aria-label="Next"
                        >
                            <ChevronRight size={18} className="text-white" />
                        </button>
                        <div
                            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5"
                            style={{ bottom: 6 }}
                        >
                            {announcements.map((_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => scrollTo(i)}
                                    className="rounded-full transition-all duration-300"
                                    style={{
                                        width: i === selected ? 18 : 6,
                                        height: 6,
                                        background: i === selected ? '#fff' : 'rgba(255,255,255,0.45)',
                                    }}
                                    aria-label={`Slide ${i + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
            <style>{`
                .carousel-slide { aspect-ratio: 16 / 9; }
            `}</style>
            {modalAnn && <AnnouncementModal ann={modalAnn} onClose={() => setModalAnn(null)} />}
        </>
    )
}

// Stable Autoplay plugin instance for the carousel
function useMemoAutoplay() {
    const [plugin] = useState(() => Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }))
    return plugin
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
            {isOpen && typeof document !== 'undefined' && createPortal(
                <>
                    <div className="fixed inset-0 z-[9998] bg-black/25" onClick={onClose} />
                    <div
                        className="fixed left-1/2 top-1/2 z-[9999] max-h-[75dvh] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-4 pt-10"
                        style={popupGlass}
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                            onClick={onClose}
                            aria-label="ปิด"
                        >
                            <X size={16} />
                        </button>
                        {popupContent}
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}

function PopupRow({ label, value, color }: { label: string; value: string; color?: string }) {
    // Bumped 12/13 → 15/16 for older staff (Mod's note: บริษัทนี้คนแก่
    // เยอะ). text-white/55 also pushed up to /75 so the label isn't
    // washed out at the larger size. py-1 between rows so the popup
    // doesn't feel cramped after the size bump.
    return (
        <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-white/75" style={{ fontSize: '15px' }}>{label}</span>
            <span className="font-bold" style={{ fontSize: '16px', color: color ?? 'white' }}>{value}</span>
        </div>
    )
}

const CORE_LEAVE_UI: Record<CoreLeaveType, {
    label: string
    shortLabel: string
    color: string
    bg: string
}> = {
    annual: {
        label: 'พักร้อนคงเหลือ',
        shortLabel: 'พักร้อน',
        color: '#34D399',
        bg: 'rgba(52,211,153,0.12)',
    },
    personal: {
        label: 'ลากิจคงเหลือ',
        shortLabel: 'ลากิจ',
        color: '#FBBF24',
        bg: 'rgba(251,191,36,0.13)',
    },
    sick: {
        label: 'ลาป่วยตามสิทธิ์คงเหลือ',
        shortLabel: 'ลาป่วยตามสิทธิ์',
        color: '#93C5FD',
        bg: 'rgba(147,197,253,0.12)',
    },
}

function LeaveBalanceSummaryRow({ type, balance, featured = false }: {
    type: CoreLeaveType
    balance: DashboardLeaveBalance
    featured?: boolean
}) {
    const ui = CORE_LEAVE_UI[type]

    return (
        <div
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
            style={{
                background: featured ? ui.bg : 'rgba(255,255,255,0.045)',
                border: `1px solid ${featured ? ui.color + '55' : 'rgba(255,255,255,0.08)'}`,
            }}
        >
            <span className="text-white/80 font-medium leading-snug" style={{ fontSize: featured ? '15px' : '14px' }}>
                {ui.label}
            </span>
            <span className="font-black tabular-nums whitespace-nowrap" style={{ fontSize: featured ? '21px' : '18px', color: ui.color }}>
                {balance.remainingDays}
                <span className="ml-1 font-semibold" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.58)' }}>วัน</span>
            </span>
        </div>
    )
}

function LeaveBalanceDetailTable({ balances }: { balances: Record<CoreLeaveType, DashboardLeaveBalance> }) {
    const rows: CoreLeaveType[] = ['annual', 'personal', 'sick']

    return (
        <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
            <table className="w-full border-collapse">
                <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <th className="text-left text-white/55 font-semibold px-2 py-1.5" style={{ fontSize: '11px' }}>ประเภท</th>
                        <th className="text-right text-white/55 font-semibold px-1 py-1.5" style={{ fontSize: '11px' }}>สิทธิ์</th>
                        <th className="text-right text-white/55 font-semibold px-1 py-1.5" style={{ fontSize: '11px' }}>ใช้แล้ว</th>
                        <th className="text-right text-white/55 font-semibold px-1 py-1.5" style={{ fontSize: '11px' }}>รอ</th>
                        <th className="text-right text-white/55 font-semibold px-2 py-1.5" style={{ fontSize: '11px' }}>คงเหลือ</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((type) => {
                        const balance = balances[type]
                        const ui = CORE_LEAVE_UI[type]
                        return (
                            <tr key={type} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                                <td className="px-2 py-1.5 font-medium" style={{ fontSize: '12px', color: ui.color }}>
                                    {ui.shortLabel}
                                </td>
                                <td className="px-1 py-1.5 text-right text-white/75 tabular-nums" style={{ fontSize: '12px' }}>{balance.entitledDays}</td>
                                <td className="px-1 py-1.5 text-right text-white/75 tabular-nums" style={{ fontSize: '12px' }}>{balance.usedDays}</td>
                                <td className="px-1 py-1.5 text-right text-white/75 tabular-nums" style={{ fontSize: '12px' }}>{balance.pendingDays}</td>
                                <td className="px-2 py-1.5 text-right font-bold tabular-nums" style={{ fontSize: '12px', color: ui.color }}>{balance.remainingDays}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// ──────────────────────────────────────────────────────────────────────────────
// ─── Today calendar banner (WFH / Holiday) ───────────────────────────────────
function TodayCalendarBanner({ entry }: { entry: TodayCalendarEntry }) {
    const isWfh = entry.type === 'wfh'
    const isWork = entry.type === 'work'
    
    let Icon = CalendarOff
    let headline = '🎌 วันนี้เป็นวันหยุดบริษัท'
    let bg = 'linear-gradient(135deg, rgba(248,113,113,0.18), rgba(239,68,68,0.10))'
    let border = 'rgba(248,113,113,0.35)'
    let accent = '#F87171'

    if (isWfh) {
        Icon = Home
        headline = '🏠 วันนี้ทำงานที่บ้าน (WFH)'
        bg = 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(52,211,153,0.10))'
        border = 'rgba(52,211,153,0.35)'
        accent = '#34D399'
    } else if (isWork) {
        Icon = MapPin
        headline = '🏢 วันนี้ทำงานครึ่งวัน (ออฟฟิศ)'
        bg = 'linear-gradient(135deg, rgba(147,51,234,0.18), rgba(168,85,247,0.10))'
        border = 'rgba(168,85,247,0.35)'
        accent = '#C084FC'
    }

    return (
        <div
            className="flex items-center gap-3 p-3.5 rounded-2xl"
            style={{ background: bg, border: `1px solid ${border}` }}
            role="status"
        >
            <div
                className="shrink-0 flex items-center justify-center rounded-full"
                style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.12)' }}
            >
                <Icon size={18} style={{ color: accent }} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight" style={{ color: accent, fontSize: '14px' }}>
                    {headline}
                </p>
                {entry.name && (
                    <p className="text-white/75 truncate" style={{ fontSize: '12px', marginTop: 2 }}>
                        {entry.name}
                    </p>
                )}
            </div>
        </div>
    )
}

// ──────────────────────────────────────────────────────────────────────────────
export function PortalDashboardClient({ sessionName, employee, announcements, leaveBalances, attendanceData, todayCalendarEntry }: Props) {
    const [openPopup, setOpenPopup] = useState<'late' | 'leave' | null>(null)

    // ── Attendance data ───────────────────────────────────────────────────────
    const { lateCount, workingDays } = attendanceData
    const onTimeDays = Math.max(0, workingDays - lateCount)

    // ── Leave data ────────────────────────────────────────────────────────────
    const annual   = leaveBalances.find(b => b.leaveType === 'annual')   ?? emptyCoreLeaveBalance('annual')
    const personal = leaveBalances.find(b => b.leaveType === 'personal') ?? emptyCoreLeaveBalance('personal')
    const sick     = leaveBalances.find(b => b.leaveType === 'sick')     ?? emptyCoreLeaveBalance('sick')
    const coreLeaveBalances: Record<CoreLeaveType, DashboardLeaveBalance> = { annual, personal, sick }

    const annualRem = annual.remainingDays
    const annualTotal = annual.entitledDays || DEFAULT_CORE_LEAVE_TOTALS.annual

    const female = employee ? isFemale(employee.gender) : false
    const genderType = female ? 'maternity' : 'ordination'
    const genderBalance = leaveBalances.find(b => b.leaveType === genderType && b.entitledDays > 0) ?? null

    return (
        <div className="max-w-lg mx-auto space-y-4 pb-4">

            {/* 1. Daily greeting — desktop only (mobile shell header already shows it) */}
            <div className="hidden lg:block">
                <DailyGreeting
                    variant="desktop"
                    nickname={employee?.nickname}
                    dateOfBirth={employee?.dateOfBirth}
                />
            </div>

            {/* 1b. Today calendar banner (WFH / holiday) — shown only when the
                   `holidays` table has a row for today. Sits above announcements
                   so a "today is WFH" notice is the first thing staff see. */}
            {todayCalendarEntry && <TodayCalendarBanner entry={todayCalendarEntry} />}

            {/* 2. Announcement Carousel (top 5 active, hides when empty) */}
            {announcements.length > 0 && (
                <AnnouncementsCarousel announcements={announcements} />
            )}

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
                                <p className="text-white font-bold mb-3" style={{ fontSize: '17px' }}>การมาสาย</p>
                                <PopupRow label="มาสายในปีนี้"     value={`${lateCount} ครั้ง`}  color="#F87171" />
                                <PopupRow label="วันทำงานทั้งหมด"  value={`${workingDays} วัน`} />
                                <PopupRow label="มาตรงเวลา"       value={`${onTimeDays} วัน`}   color="#34D399" />
                            </div>
                        }
                    />

                    <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />

                    {/* Right: วันลาคงเหลือ */}
                    <DonutCard
                        filled={annualRem}
                        total={annualTotal || 1}
                        color={CORE_LEAVE_UI.annual.color}
                        centerValue={annualRem}
                        centerLabel="พักร้อน"
                        isOpen={openPopup === 'leave'}
                        onOpen={() => setOpenPopup('leave')}
                        onClose={() => setOpenPopup(null)}
                        popupContent={
                            <div className="space-y-3">
                                <div>
                                    <p className="text-white font-bold" style={{ fontSize: '17px' }}>วันลาคงเหลือ</p>
                                    <p className="text-white/45 mt-0.5" style={{ fontSize: '11px' }}>
                                        ไม่รวม WFH ซึ่งเป็นสถานะการทำงาน
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <LeaveBalanceSummaryRow type="annual" balance={annual} featured />
                                    <LeaveBalanceSummaryRow type="personal" balance={personal} />
                                    <LeaveBalanceSummaryRow type="sick" balance={sick} />
                                </div>

                                <LeaveBalanceDetailTable balances={coreLeaveBalances} />

                                <p className="text-[11px] text-white/45 leading-snug">
                                    คำนวณจากสิทธิ์ประจำปีและรายการลาที่อนุมัติแล้ว/รออนุมัติ
                                </p>
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

            {/* 3b. "ใครไม่อยู่วันนี้" widget — self-fetches, auto-hides when zero.
                    Two beta-tester ask (4 May): "ก่อนเดินไปหา/โทรหา ขอเช็คก่อน".
                    Mod's 16 May tweak: ย้ายลงล่างก่อนถึงเมนูลัด + เปิด popup
                    แทน navigate ออกหน้า — เพื่อให้ flow ของ dashboard ไม่ขาด. */}
            <WhoIsOutWidget />

            {/* 4. เมนูลัด */}
            <div style={glass} className="p-4">
                <p className="text-white font-bold mb-3" style={{ fontSize: '15px' }}>เมนูลัด</p>
                <div className="grid grid-cols-3 gap-3">
                    {SHORTCUTS.map((shortcut) => {
                        const { label, icon: Icon, href } = shortcut
                        const isEvent = 'isEvent' in shortcut && shortcut.isEvent
                        return (
                            <Link
                                key={label}
                                href={href}
                                className={[
                                    'flex flex-col items-center gap-2 py-4 rounded-2xl text-center transition-all active:scale-95',
                                    isEvent ? 'relative overflow-hidden ring-2 ring-yellow-400/90 shadow-[0_0_15px_rgba(250,204,21,0.5)] border-yellow-400 bg-gradient-to-b from-yellow-500/15 via-white/5 to-white/5 animate-pulse' : ''
                                ].join(' ')}
                                style={{ 
                                    background: isEvent ? undefined : 'rgba(255,255,255,0.07)', 
                                    border: isEvent ? '1px solid rgba(250,204,21,0.4)' : '1px solid rgba(255,255,255,0.12)' 
                                }}
                            >
                                <Icon 
                                    size={28} 
                                    className={[
                                        isEvent ? 'text-yellow-300 animate-bounce' : 'text-white/90',
                                    ].join(' ')} 
                                />
                                <span className={isEvent ? 'text-yellow-100 font-extrabold leading-tight' : 'text-white/85 font-medium leading-tight'} style={{ fontSize: '15px' }}>
                                    {label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
