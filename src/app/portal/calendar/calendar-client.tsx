'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X, DoorOpen, Calendar as CalendarIcon } from 'lucide-react'
import type { Holiday, LeaveDay, CalendarBooking } from './page'
import { formatBangkokTime } from '@/lib/datetime'

interface Props {
    holidays: Holiday[]
    leaveDays: LeaveDay[]
    bookings: CalendarBooking[]
}

const DAY_HEADERS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_MONTHS = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน',
    'พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม',
    'กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]
const THAI_DOWS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']

// Holiday/WFH types — same emojis as /hradmin/holidays for visual
// continuity. If you change one side, sync the other.
const HOLIDAY_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
    public:    { label: 'นักขัตฤกษ์',      color: '#F87171', emoji: '🇹🇭' },
    religious: { label: 'วันสำคัญทางศาสนา', color: '#F472B6', emoji: '🛕' },
    company:   { label: 'บริษัทกำหนด',     color: '#60A5FA', emoji: '📌' },
    wfh:       { label: 'WFH',             color: '#34D399', emoji: '🏠' },
}

// Leave types — different palette from holidays so the user can scan
// "this is my leave" vs "this is a company day-off" at a glance.
const LEAVE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
    annual:       { label: 'ลาพักร้อน',  color: '#60A5FA', emoji: '🏖️' },
    sick:         { label: 'ลาป่วย',     color: '#34D399', emoji: '🤒' },
    personal:     { label: 'ลากิจ',      color: '#FBBF24', emoji: '📋' },
    compensation: { label: 'ลาชดเชย',    color: '#FB923C', emoji: '🔄' },
    maternity:    { label: 'ลาคลอด',     color: '#F472B6', emoji: '🤰' },
    ordination:   { label: 'ลาบวช',      color: '#A78BFA', emoji: '🧘' },
    marriage:     { label: 'ลาสมรส',     color: '#F9A8D4', emoji: '💍' },
    bereavement:  { label: 'ลาพ่อ-แม่เสียชีวิต', color: '#9CA3AF', emoji: '🕯️' },
    training:     { label: 'ลาพัฒนาความรู้', color: '#67E8F9', emoji: '🎓' },
}

const LEAVE_STATUS_LABEL: Record<string, string> = {
    approved: 'อนุมัติแล้ว',
    pending:  'รออนุมัติ',
}

function getHolidayConfig(type: string) {
    return HOLIDAY_CONFIG[type] ?? HOLIDAY_CONFIG.company
}
function getLeaveConfig(type: string) {
    return LEAVE_CONFIG[type] ?? { label: type, color: '#9CA3AF', emoji: '📅' }
}

function toDateStr(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function formatThaiFull(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return `${THAI_DOWS[date.getDay()]} · ${d} ${THAI_MONTHS[m - 1]} ${y + 543}`
}

export function CalendarClient({ holidays, leaveDays, bookings }: Props) {
    const today = new Date()
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [selected, setSelected] = useState<string | null>(null)

    // Build lookup maps once per render — small data so re-running is fine.
    const holidayMap = useMemo(() => {
        const m = new Map<string, Holiday[]>()
        for (const h of holidays) {
            const arr = m.get(h.date) ?? []
            arr.push(h)
            m.set(h.date, arr)
        }
        return m
    }, [holidays])

    const leaveMap = useMemo(() => {
        const m = new Map<string, LeaveDay[]>()
        for (const l of leaveDays) {
            const arr = m.get(l.date) ?? []
            arr.push(l)
            m.set(l.date, arr)
        }
        return m
    }, [leaveDays])

    const bookingMap = useMemo(() => {
        const m = new Map<string, CalendarBooking[]>()
        for (const b of bookings) {
            const arr = m.get(b.date) ?? []
            arr.push(b)
            m.set(b.date, arr)
        }
        return m
    }, [bookings])

    // Build the month grid (leading + trailing nulls so weeks line up).
    const firstDow = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: Array<number | null> = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

    const goPrev = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
        else setViewMonth(m => m - 1)
    }
    const goNext = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
        else setViewMonth(m => m + 1)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                    <CalendarIcon size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">ปฏิทิน</h1>
                    <p className="text-sm text-white/50">วันหยุดบริษัท · ใบลาของฉัน · ห้องประชุมที่จอง</p>
                </div>
            </div>

            <div className="rounded-2xl p-3 sm:p-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>

                {/* Month nav */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={goPrev}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white"
                        aria-label="เดือนก่อนหน้า"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <p className="text-white font-bold text-base">
                        {THAI_MONTHS[viewMonth]} {viewYear + 543}
                    </p>
                    <button
                        onClick={goNext}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white"
                        aria-label="เดือนถัดไป"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wider text-white/70 font-bold">
                    {DAY_HEADERS.map((d, i) => (
                        <div key={i} className={`py-1.5 ${i === 0 || i === 6 ? 'text-amber-200' : ''}`}>{d}</div>
                    ))}
                </div>

                {/* Cells */}
                <div className="grid grid-cols-7 gap-1.5">
                    {cells.map((d, i) => {
                        if (d === null) {
                            return <div key={i} className="min-h-[80px] rounded-md bg-white/[0.02]" />
                        }
                        const dateStr = toDateStr(viewYear, viewMonth, d)
                        const dayHolidays = holidayMap.get(dateStr) ?? []
                        const dayLeaves = leaveMap.get(dateStr) ?? []
                        const dayBookings = bookingMap.get(dateStr) ?? []
                        const isToday = dateStr === todayStr
                        const dow = (firstDow + d - 1) % 7
                        const isWeekend = dow === 0 || dow === 6
                        const totalEvents = dayHolidays.length + dayLeaves.length + dayBookings.length
                        const hasEvents = totalEvents > 0

                        // Build the icon row — combine all three event types
                        // in a single visual row, max 4 then collapse.
                        const icons: Array<{ key: string; emoji: string; bg: string; border: string }> = []
                        for (const h of dayHolidays) {
                            const cfg = getHolidayConfig(h.type)
                            icons.push({ key: `h-${h.id}`, emoji: cfg.emoji, bg: `${cfg.color}40`, border: `${cfg.color}80` })
                        }
                        for (let li = 0; li < dayLeaves.length; li++) {
                            const cfg = getLeaveConfig(dayLeaves[li].leaveType)
                            const isPending = dayLeaves[li].status === 'pending'
                            icons.push({
                                key: `l-${li}`,
                                emoji: cfg.emoji,
                                bg: `${cfg.color}40`,
                                border: isPending ? '#FCD34D' : `${cfg.color}80`,
                            })
                        }
                        for (const b of dayBookings) {
                            icons.push({ key: `b-${b.id}`, emoji: '🚪', bg: '#A78BFA40', border: '#A78BFA80' })
                        }

                        const tooltip = [
                            ...dayHolidays.map(h => `${getHolidayConfig(h.type).emoji} ${h.name}`),
                            ...dayLeaves.map(l => `${getLeaveConfig(l.leaveType).emoji} ${getLeaveConfig(l.leaveType).label} (${LEAVE_STATUS_LABEL[l.status] ?? l.status})`),
                            ...dayBookings.map(b => `🚪 ${b.title} ${formatBangkokTime(b.startsAt)}`),
                        ].join('\n')

                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => hasEvents && setSelected(dateStr)}
                                title={tooltip || undefined}
                                disabled={!hasEvents}
                                className={`min-h-[80px] rounded-md p-2 flex flex-col gap-1.5 transition-all text-left ${
                                    isToday
                                        ? 'bg-amber-400/15 border border-amber-400/60'
                                        : hasEvents
                                            ? 'bg-white/[0.07] border border-white/15 hover:bg-white/[0.13] hover:border-white/30 cursor-pointer'
                                            : 'bg-white/[0.04] border border-white/10 cursor-default'
                                }`}
                            >
                                <span className={`text-base font-bold tabular-nums leading-none ${
                                    isToday ? 'text-amber-200'
                                        : isWeekend ? 'text-amber-200'
                                        : hasEvents ? 'text-white' : 'text-white/55'
                                }`}>
                                    {d}
                                </span>
                                {hasEvents && (
                                    <div className="flex flex-wrap items-center gap-1 mt-auto">
                                        {icons.slice(0, 4).map(it => (
                                            <span
                                                key={it.key}
                                                className="inline-flex items-center justify-center h-6 w-6 rounded text-sm leading-none"
                                                style={{ background: it.bg, border: `1px solid ${it.border}` }}
                                            >
                                                {it.emoji}
                                            </span>
                                        ))}
                                        {icons.length > 4 && (
                                            <span className="text-xs font-semibold text-white/75 px-1">
                                                +{icons.length - 4}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Legend */}
                <div className="pt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    {Object.entries(HOLIDAY_CONFIG).map(([t, cfg]) => (
                        <span key={t} className="inline-flex items-center gap-1.5">
                            <span className="text-base leading-none">{cfg.emoji}</span>
                            <span className="text-white/85 font-medium">{cfg.label}</span>
                        </span>
                    ))}
                    <span className="inline-flex items-center gap-1.5">
                        <span className="text-base leading-none">🏖️</span>
                        <span className="text-white/85 font-medium">ใบลา</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="text-base leading-none">🚪</span>
                        <span className="text-white/85 font-medium">จองห้องประชุม</span>
                    </span>
                </div>
            </div>

            {selected && (
                <DayDetailModal
                    dateIso={selected}
                    holidays={holidayMap.get(selected) ?? []}
                    leaves={leaveMap.get(selected) ?? []}
                    bookings={bookingMap.get(selected) ?? []}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    )
}

/**
 * Read-only modal showing every event on the picked date — holidays at
 * the top (org-level), leaves in the middle (personal), bookings at the
 * bottom (room schedule). Each section deep-links to the source page so
 * the user can act there without us duplicating the edit UI here.
 */
function DayDetailModal({
    dateIso, holidays, leaves, bookings, onClose,
}: {
    dateIso: string
    holidays: Holiday[]
    leaves: LeaveDay[]
    bookings: CalendarBooking[]
    onClose: () => void
}) {
    const headline = useMemo(() => formatThaiFull(dateIso), [dateIso])

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-2xl overflow-hidden"
                style={{ background: 'rgba(20,5,8,0.96)', border: '1px solid rgba(255,255,255,0.15)' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h2 className="text-white font-bold text-base">{headline}</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="ปิด">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-4">
                    {/* Holidays / WFH */}
                    {holidays.length > 0 && (
                        <Section title="วันหยุด / WFH">
                            {holidays.map(h => {
                                const cfg = getHolidayConfig(h.type)
                                return (
                                    <EventCard
                                        key={`h-${h.id}`}
                                        emoji={cfg.emoji}
                                        chipLabel={cfg.label}
                                        chipColor={cfg.color}
                                        title={h.name}
                                    />
                                )
                            })}
                        </Section>
                    )}

                    {/* Leaves */}
                    {leaves.length > 0 && (
                        <Section title="ใบลาของฉัน">
                            {leaves.map((l, idx) => {
                                const cfg = getLeaveConfig(l.leaveType)
                                const isPending = l.status === 'pending'
                                return (
                                    <EventCard
                                        key={`l-${idx}`}
                                        emoji={cfg.emoji}
                                        chipLabel={cfg.label}
                                        chipColor={cfg.color}
                                        title={LEAVE_STATUS_LABEL[l.status] ?? l.status}
                                        statusBadge={isPending
                                            ? { label: 'รออนุมัติ', color: '#FCD34D' }
                                            : { label: 'อนุมัติแล้ว', color: '#34D399' }}
                                        link={{ href: '/portal/leave', label: 'ดูใบลาของฉัน' }}
                                    />
                                )
                            })}
                        </Section>
                    )}

                    {/* Bookings */}
                    {bookings.length > 0 && (
                        <Section title="ห้องประชุมที่จอง">
                            {bookings.map(b => (
                                <EventCard
                                    key={`b-${b.id}`}
                                    emoji="🚪"
                                    chipLabel="จองห้องประชุม"
                                    chipColor="#A78BFA"
                                    title={b.title}
                                    subtitle={`${formatBangkokTime(b.startsAt)} – ${formatBangkokTime(b.endsAt)} · จองโดย ${b.bookedByName}`}
                                    link={{ href: '/portal/meeting-room', label: 'ดูตารางห้องประชุม' }}
                                />
                            ))}
                        </Section>
                    )}
                </div>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold mb-2">{title}</p>
            <div className="space-y-2">{children}</div>
        </div>
    )
}

function EventCard({
    emoji, chipLabel, chipColor, title, subtitle, statusBadge, link,
}: {
    emoji: string
    chipLabel: string
    chipColor: string
    title: string
    subtitle?: string
    statusBadge?: { label: string; color: string }
    link?: { href: string; label: string }
}) {
    return (
        <div
            className="rounded-xl p-3.5 border"
            style={{ background: `${chipColor}1a`, borderColor: `${chipColor}55` }}
        >
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-lg leading-none">{emoji}</span>
                <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: `${chipColor}30`, color: chipColor }}
                >
                    {chipLabel}
                </span>
                {statusBadge && (
                    <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ background: `${statusBadge.color}25`, color: statusBadge.color }}
                    >
                        {statusBadge.label}
                    </span>
                )}
            </div>
            <p className="text-base font-semibold text-white leading-snug">{title}</p>
            {subtitle && <p className="text-sm text-white/60 mt-0.5">{subtitle}</p>}
            {link && (
                <Link
                    href={link.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold mt-2 text-white/70 hover:text-white"
                >
                    {link.label} →
                </Link>
            )}
        </div>
    )
}

// Re-export for any consumer that imports the old icon (keeps build green).
export { DoorOpen }
