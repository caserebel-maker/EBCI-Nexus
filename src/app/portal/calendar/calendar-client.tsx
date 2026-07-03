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

// Holiday/WFH types — kept for the day-detail modal (chips + labels).
// The CALENDAR GRID itself no longer uses these; cells get a solid
// bg color from CELL_PALETTE below (Mod's 4 May call: emoji-row was
// hard to scan because some emojis blend into the maroon page bg
// and the icons stretched cell heights inconsistently).
const HOLIDAY_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
    public:    { label: 'นักขัตฤกษ์',      color: '#F87171', emoji: '🇹🇭' },
    religious: { label: 'วันสำคัญทางศาสนา', color: '#F472B6', emoji: '🛕' },
    company:   { label: 'บริษัทกำหนด',     color: '#60A5FA', emoji: '📌' },
    wfh:       { label: 'WFH',             color: '#60A5FA', emoji: '🏠' },
    work:      { label: 'วันทำงาน (ออฟฟิศ)', color: '#C084FC', emoji: '🏢' },
}

// Leave types — same as above, used by the modal not the grid.
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

// CELL palette — what shows in the calendar GRID (cell bg color).
// Mod-defined colour scheme:
//   public    → ขาว     (highest priority, all-company off day)
//   religious → เหลือง
//   company   → ส้ม
//   wfh       → น้ำเงิน
//   leave     → เขียว    (any leave type the user has)
//   booking   → ชมพู
//
// Priority: when a cell has multiple kinds, the FIRST one in
// CELL_PRIORITY wins as the bg. The others render as small accent
// dots in the cell's bottom-right corner so the user still sees
// "this day has multiple things going on".
type CellKind = 'public' | 'religious' | 'company' | 'wfh' | 'work' | 'leave' | 'booking'

const CELL_PALETTE: Record<CellKind, { bg: string; text: string; label: string }> = {
    public:    { bg: '#F4F4F5', text: '#000000', label: 'นักขัตฤกษ์' },     // white / black
    religious: { bg: '#FBBF24', text: '#000000', label: 'วันสำคัญทางศาสนา' }, // yellow / black
    company:   { bg: '#10B981', text: '#FFFFFF', label: 'บริษัทกำหนด' },     // green / white
    wfh:       { bg: '#2563EB', text: '#FFFFFF', label: 'WFH' },             // rich blue / white
    work:      { bg: '#9333EA', text: '#FFFFFF', label: 'วันทำงาน (ออฟฟิศ)' }, // vibrant purple / white
    leave:     { bg: '#10B981', text: '#FFFFFF', label: 'ใบลา' },            // green / white
    booking:   { bg: '#EC4899', text: '#FFFFFF', label: 'จองห้องประชุม' },   // pink / white
}

const CELL_PRIORITY: CellKind[] = ['public', 'religious', 'company', 'wfh', 'work', 'leave', 'booking']

/** Map a holidays.type value to a CellKind (or null if not a calendar
 *  bg-painter — defensive for legacy/imported types we don't render). */
function holidayTypeToCellKind(holidayType: string): CellKind | null {
    if (holidayType === 'public') return 'public'
    if (holidayType === 'religious') return 'religious'
    if (holidayType === 'company') return 'company'
    if (holidayType === 'wfh') return 'wfh'
    if (holidayType === 'work') return 'work'
    return 'company'  // unknown → treat as "company-set" so it still paints
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

function getShortCellLabel(
    dayHolidays: Holiday[],
    dayLeaves: LeaveDay[],
    dayBookings: CalendarBooking[],
): string {
    if (dayHolidays.length > 0) {
        const h = dayHolidays[0]
        if (h.name.includes('วันทำงานครึ่งวัน (ออฟฟิศ)')) return 'งานออฟฟิศ'
        if (h.name.includes('วันทำงานครึ่งวัน (WFH)')) return 'งาน WFH'
        if (h.name.includes('วันหยุดประจำสัปดาห์')) return 'วันหยุด'
        return h.name.length > 10 ? h.name.slice(0, 8) + '..' : h.name
    }
    if (dayLeaves.length > 0) {
        const config = LEAVE_CONFIG[dayLeaves[0].leaveType]
        return config ? config.label : 'ใบลา'
    }
    if (dayBookings.length > 0) {
        return 'ห้องประชุม'
    }
    return ''
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

    const weekCount = cells.length / 7

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-8 lg:h-[calc(100vh-260px)] lg:min-h-[560px] lg:pb-0 xl:h-[calc(100vh-245px)]">
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ad5f6c]/20 bg-[#882136]/60 text-[#ad5f6c] lg:h-8 lg:w-8">
                    <CalendarIcon size={18} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white lg:text-lg">ปฏิทิน</h1>
                    <p className="text-sm text-white/50 lg:text-xs">วันหยุดบริษัท · ใบลาของฉัน · ห้องประชุมที่จอง</p>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-2xl p-3 sm:p-4 lg:p-3"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>

                {/* Month nav */}
                <div className="flex shrink-0 items-center justify-between">
                    <button
                        onClick={goPrev}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-white hover:bg-white/10 lg:h-8 lg:w-8"
                        aria-label="เดือนก่อนหน้า"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <p className="text-base font-bold text-white lg:text-sm">
                        {THAI_MONTHS[viewMonth]} {viewYear + 543}
                    </p>
                    <button
                        onClick={goNext}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-white hover:bg-white/10 lg:h-8 lg:w-8"
                        aria-label="เดือนถัดไป"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* Weekday headers */}
                <div className="grid shrink-0 grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wider text-white/70">
                    {DAY_HEADERS.map((d, i) => (
                        <div key={i} className={`py-1 lg:py-0.5 ${i === 0 || i === 6 ? 'text-amber-200' : ''}`}>{d}</div>
                    ))}
                </div>

                {/* Cells */}
                <div
                    className="grid min-h-0 flex-1 grid-cols-7 gap-1.5 lg:gap-1"
                    style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
                >
                    {cells.map((d, i) => {
                        if (d === null) {
                            return <div key={i} className="aspect-square rounded-lg bg-white/[0.02] lg:aspect-auto lg:min-h-0" />
                        }
                        const dateStr = toDateStr(viewYear, viewMonth, d)
                        const dayHolidays = holidayMap.get(dateStr) ?? []
                        const dayLeaves = leaveMap.get(dateStr) ?? []
                        const dayBookings = bookingMap.get(dateStr) ?? []
                        const isToday = dateStr === todayStr
                        const dow = (firstDow + d - 1) % 7
                        const isWeekend = dow === 0 || dow === 6

                        // Collect every CellKind present on this day (deduped).
                        // Grid bg = highest-priority kind in CELL_PRIORITY order;
                        // remaining kinds render as accent dots in the bottom-
                        // right corner so multi-event days are still legible at
                        // a glance.
                        const kindsSet = new Set<CellKind>()
                        for (const h of dayHolidays) {
                            const k = holidayTypeToCellKind(h.type)
                            if (k) kindsSet.add(k)
                        }
                        if (dayLeaves.length > 0) kindsSet.add('leave')
                        if (dayBookings.length > 0) kindsSet.add('booking')

                        const kindsByPriority = CELL_PRIORITY.filter(k => kindsSet.has(k))
                        const dominantKind = kindsByPriority[0] ?? null
                        const accentKinds = kindsByPriority.slice(1)
                        const hasEvents = dominantKind !== null

                        const tooltip = [
                            ...dayHolidays.map(h => `${getHolidayConfig(h.type).emoji} ${h.name}`),
                            ...dayLeaves.map(l => `${getLeaveConfig(l.leaveType).emoji} ${getLeaveConfig(l.leaveType).label} (${LEAVE_STATUS_LABEL[l.status] ?? l.status})`),
                            ...dayBookings.map(b => `🚪 ${b.title} ${formatBangkokTime(b.startsAt)}`),
                        ].join('\n')

                        // Cell = square (1:1 aspect) — Mod's 4 May call:
                        // rectangular cells made the top + bottom rows look
                        // taller than the middle ones (because adjacent
                        // months have different number of weeks). Square
                        // forces every row to the same height.
                        // Day number is centered inside the cell; accent
                        // dots overlay absolutely at the bottom-right so
                        // they don't push the number off-center.
                        const palette = dominantKind ? CELL_PALETTE[dominantKind] : null
                        const isLeave = dominantKind === 'leave'
                        const cellStyle: React.CSSProperties = palette
                            ? isLeave
                                ? { border: '2px solid #10B981', background: 'rgba(16, 185, 129, 0.08)', color: '#10B981' }
                                : { background: palette.bg, color: palette.text }
                            : {}
                        const cellClass = palette
                            ? 'relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg p-1 transition-all hover:brightness-110 lg:aspect-auto lg:min-h-0 lg:rounded-md'
                            : `relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg p-1 transition-all lg:aspect-auto lg:min-h-0 lg:rounded-md ${
                                isToday
                                    ? 'bg-amber-400/15 border border-amber-400/60'
                                    : 'bg-white/[0.04] border border-white/10 cursor-default'
                            }`

                        const dayNumberColor = palette
                            ? isLeave ? '#10B981' : palette.text
                            : isToday ? '#FCD34D'
                            : isWeekend ? '#FCD34D'
                            : 'rgba(255,255,255,0.55)'

                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => hasEvents && setSelected(dateStr)}
                                title={tooltip || undefined}
                                disabled={!hasEvents}
                                className={cellClass}
                                style={{
                                    ...cellStyle,
                                    ...(isToday ? { boxShadow: 'inset 0 0 0 2px #FCD34D' } : {}),
                                }}
                            >
                                <span
                                    className="text-sm font-bold leading-none tabular-nums sm:text-base lg:text-sm"
                                    style={{ color: dayNumberColor }}
                                >
                                    {d}
                                </span>
                                {hasEvents && (
                                    <span
                                        className="mt-0.5 max-w-full select-none truncate px-0.5 text-center text-[8px] font-semibold leading-tight opacity-90 sm:text-[9px] md:text-[10px] lg:text-[9px]"
                                        style={{ color: dayNumberColor }}
                                    >
                                        {getShortCellLabel(dayHolidays, dayLeaves, dayBookings)}
                                    </span>
                                )}
                                {accentKinds.length > 0 && (
                                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
                                        {accentKinds.slice(0, 3).map(k => (
                                            <span
                                                key={k}
                                                className="block h-1.5 w-1.5 rounded-full ring-1 ring-black/20"
                                                style={{ background: CELL_PALETTE[k].bg }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Legend — color swatches mirror the cell-bg palette so
                    the user can read "yellow square = วันสำคัญทางศาสนา"
                    by glance, not by hovering for tooltips. Order matches
                    CELL_PRIORITY so the most-dominant colour reads first. */}
                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-sm lg:pt-1 lg:text-xs">
                    {CELL_PRIORITY.map(k => {
                        const c = CELL_PALETTE[k]
                        const isLeaveLegend = k === 'leave'
                        return (
                            <span key={k} className="inline-flex items-center gap-1.5">
                                <span
                                    className="block h-3.5 w-3.5 rounded ring-1 ring-black/20 lg:h-2.5 lg:w-2.5"
                                    style={isLeaveLegend 
                                        ? { border: '2.5px solid #10B981', background: 'rgba(16, 185, 129, 0.08)' } 
                                        : { background: c.bg }
                                    }
                                />
                                <span className="text-white/85 font-medium">{c.label}</span>
                            </span>
                        )
                    })}
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
