'use client'

import { useMemo, useState, useEffect, useTransition, type CSSProperties } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    CalendarDays, BarChart3, Users, CalendarRange, FileText,
    ChevronLeft, ChevronRight, X, Filter as FilterIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { YearSelector } from '@/components/hradmin/leave/YearSelector'
import { resolveLeaveColor } from '@/components/hradmin/leave/palette'
import { formatEmployeeName, employeeInitials } from '@/lib/format-employee-name'
import type { LeaveTypeLite } from '@/components/hradmin/leave/types'
import { STATUS_META } from '@/components/hradmin/leave/types'

// ─── Types ────────────────────────────────────────────────────────────────

export interface CalendarEvent {
    request_id: string
    reference_code: string | null
    status: string                   // 'approved' | 'pending' | 'rejected' | 'cancelled'
    is_half_day: boolean
    half_day_period: string | null   // 'morning' | 'afternoon'
    start_date: string               // YYYY-MM-DD (request span start)
    end_date: string                 // YYYY-MM-DD (request span end)
    employee_id: string
    employee_first_name: string | null
    employee_last_name: string | null
    employee_nickname: string | null
    employee_department: string | null
    employee_photo_url: string | null
    leave_type_id: string
    leave_type_name: string
    leave_type_color: string | null
}

export interface CalendarHoliday {
    date: string                    // YYYY-MM-DD
    name: string
}

interface Props {
    year: number
    /** 1-based month from the URL (?month=YYYY-MM). Defaults to current month server-side. */
    month: number
    /** Pre-grouped events for each YYYY-MM-DD that overlaps the month. */
    eventsByDate: Record<string, CalendarEvent[]>
    leaveTypes: LeaveTypeLite[]
    departments: string[]
    holidays: CalendarHoliday[]
    filters: {
        department: string[]
        leave_type: string[]
        status: string[]            // default ['approved','pending'] if empty
    }
}

// ─── Constants ────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'requests' | 'balances' | 'calendar'

const TABS: Array<{ key: TabKey; label: string; Icon: typeof BarChart3; href: string }> = [
    { key: 'overview',  label: 'ภาพรวม',         Icon: BarChart3,     href: '/hradmin/leave' },
    { key: 'requests',  label: 'ใบลาทั้งหมด',     Icon: FileText,      href: '/hradmin/leave?tab=requests' },
    { key: 'balances',  label: 'วันลาพนักงาน',    Icon: Users,         href: '/hradmin/leave?tab=balances' },
    { key: 'calendar',  label: 'ปฏิทิน',          Icon: CalendarRange, href: '/hradmin/leave?tab=calendar' },
]

const DAY_HEADERS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_MONTHS = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน',
    'พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม',
    'กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

const GLASS_STYLE: CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '20px',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function ymd(year: number, monthZero: number, day: number): string {
    return `${year}-${String(monthZero + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function clampMonth(m: number): number {
    return Math.max(1, Math.min(12, m))
}

// ─── Main view ────────────────────────────────────────────────────────────

/**
 * Tab 4 — "ปฏิทิน".
 *
 * Month grid that overlays approved + pending leave requests on top of
 * a Sun-Sat calendar. Click a day → modal with the full list of leaves
 * (Ref + Employee + Type + Status). Filters mirror Tab 2 conventions
 * (department, leave_type) and route through the URL so links can be
 * shared.
 */
export function CalendarView({
    year, month, eventsByDate, leaveTypes, departments, holidays, filters,
}: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [, startTransition] = useTransition()

    // Color lookup keyed by leave_type_id, stable across renders.
    const colorByLeaveType = useMemo(() => {
        const map = new Map<string, string>()
        leaveTypes.forEach((lt, i) => map.set(lt.id, resolveLeaveColor(lt.color, i)))
        return map
    }, [leaveTypes])

    // Holiday lookup keyed by YYYY-MM-DD.
    const holidayByDate = useMemo(() => {
        const map = new Map<string, string>()
        holidays.forEach(h => map.set(h.date, h.name))
        return map
    }, [holidays])

    // Today, recomputed in the browser to avoid SSR/CSR drift on date boundary.
    const [todayStr, setTodayStr] = useState<string | null>(null)
    useEffect(() => {
        const t = new Date()
        setTodayStr(ymd(t.getFullYear(), t.getMonth(), t.getDate()))
    }, [])

    // Month grid cells: leading nulls = padding to align Sunday.
    const monthZero = month - 1
    const firstDow = new Date(year, monthZero, 1).getDay()
    const daysInMonth = new Date(year, monthZero + 1, 0).getDate()
    const cells: Array<number | null> = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    // Modal state — track the selected day as YYYY-MM-DD or null.
    const [selected, setSelected] = useState<string | null>(null)
    const selectedEvents = selected ? (eventsByDate[selected] ?? []) : []

    // ── URL navigation helpers ──
    const updateUrl = (mutate: (sp: URLSearchParams) => void) => {
        const sp = new URLSearchParams(searchParams?.toString() ?? '')
        sp.set('tab', 'calendar')
        mutate(sp)
        startTransition(() => {
            router.replace(`${pathname}?${sp.toString()}`)
        })
    }

    const setMonth = (newYear: number, newMonth1: number) => {
        const m = clampMonth(newMonth1)
        updateUrl(sp => {
            sp.set('month', `${newYear}-${String(m).padStart(2, '0')}`)
            // Year querystring keeps the YearSelector in sync.
            sp.set('year', String(newYear))
        })
    }

    const goPrev = () => {
        if (month === 1) setMonth(year - 1, 12)
        else setMonth(year, month - 1)
    }
    const goNext = () => {
        if (month === 12) setMonth(year + 1, 1)
        else setMonth(year, month + 1)
    }
    const goToday = () => {
        const t = new Date()
        setMonth(t.getFullYear(), t.getMonth() + 1)
    }

    // ── Filter chips (department + leave type) ──
    const toggleDept = (dept: string) => {
        const current = new Set(filters.department)
        if (current.has(dept)) current.delete(dept)
        else current.add(dept)
        updateUrl(sp => {
            const next = Array.from(current)
            if (next.length === 0) sp.delete('department')
            else sp.set('department', next.join(','))
        })
    }
    const toggleLeaveType = (id: string) => {
        const current = new Set(filters.leave_type)
        if (current.has(id)) current.delete(id)
        else current.add(id)
        updateUrl(sp => {
            const next = Array.from(current)
            if (next.length === 0) sp.delete('leave_type')
            else sp.set('leave_type', next.join(','))
        })
    }
    const clearFilters = () => {
        updateUrl(sp => {
            sp.delete('department')
            sp.delete('leave_type')
            sp.delete('status')
        })
    }

    const hasActiveFilters =
        filters.department.length > 0 ||
        filters.leave_type.length > 0 ||
        filters.status.length > 0

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-[#882136]/50 border border-[#ad5f6c]/25 flex items-center justify-center shrink-0">
                        <CalendarDays size={22} className="text-[#f9c5cd]" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">จัดการการลา</h1>
                        <p className="text-sm text-white/60 mt-0.5">ปฏิทินการลาของพนักงานทั้งบริษัท · คลิกวันเพื่อดูรายชื่อ</p>
                    </div>
                </div>
                <YearSelector currentYear={year} />
            </div>

            {/* Tabs */}
            <div
                role="tablist"
                className="flex gap-1 p-1 rounded-xl border border-white/10 overflow-x-auto"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
            >
                {TABS.map(({ key, label, Icon, href }) => {
                    const active = key === 'calendar'
                    return (
                        <Link
                            key={key}
                            href={href}
                            role="tab"
                            aria-selected={active}
                            className={cn(
                                'flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all',
                                active
                                    ? 'bg-amber-400 text-[#561e23] shadow'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                            )}
                        >
                            <Icon size={15} className="shrink-0" />
                            <span className="truncate">{label}</span>
                        </Link>
                    )
                })}
            </div>

            {/* Month nav + filters */}
            <div style={GLASS_STYLE} className="p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={goPrev}
                            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                            aria-label="เดือนก่อน"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="text-center min-w-[150px]">
                            <p className="text-white font-bold text-base sm:text-lg leading-tight">
                                {THAI_MONTHS[monthZero]}
                            </p>
                            <p className="text-white/50 text-xs leading-tight">
                                พ.ศ. {year + 543}
                            </p>
                        </div>
                        <button
                            onClick={goNext}
                            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                            aria-label="เดือนถัดไป"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            onClick={goToday}
                            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/75 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
                        >
                            วันนี้
                        </button>
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                        >
                            <X size={12} />
                            ล้างตัวกรอง
                        </button>
                    )}
                </div>

                {/* Leave type legend / chips (also acts as filter) */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-white/50 mr-1 inline-flex items-center gap-1">
                        <FilterIcon size={11} /> ประเภท:
                    </span>
                    {leaveTypes.map((lt, i) => {
                        const active = filters.leave_type.length === 0 || filters.leave_type.includes(lt.id)
                        const color = resolveLeaveColor(lt.color, i)
                        return (
                            <button
                                key={lt.id}
                                onClick={() => toggleLeaveType(lt.id)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold transition-all border',
                                    active
                                        ? 'bg-white/10 text-white border-white/20'
                                        : 'bg-white/[0.02] text-white/40 border-white/5 hover:text-white/70',
                                )}
                            >
                                <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ background: color }}
                                />
                                {lt.name_th}
                            </button>
                        )
                    })}
                </div>

                {/* Department filter (only show if there are options) */}
                {departments.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-white/50 mr-1 inline-flex items-center gap-1">
                            <Users size={11} /> แผนก:
                        </span>
                        {departments.map(dept => {
                            const active = filters.department.length === 0 || filters.department.includes(dept)
                            return (
                                <button
                                    key={dept}
                                    onClick={() => toggleDept(dept)}
                                    className={cn(
                                        'px-2 py-1 rounded-full text-[11px] font-semibold transition-all border',
                                        active
                                            ? 'bg-white/10 text-white border-white/20'
                                            : 'bg-white/[0.02] text-white/40 border-white/5 hover:text-white/70',
                                    )}
                                >
                                    {dept}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Calendar grid */}
            <div style={GLASS_STYLE} className="p-2 sm:p-3">
                {/* Day-of-week header */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {DAY_HEADERS.map((label, i) => (
                        <div
                            key={i}
                            className={cn(
                                'text-center text-[11px] font-semibold py-1.5',
                                i === 0 || i === 6 ? 'text-rose-300/80' : 'text-white/55',
                            )}
                        >
                            {label}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {cells.map((day, idx) => {
                        if (day === null) {
                            return <div key={idx} className="min-h-[64px] sm:min-h-[96px]" />
                        }
                        const dateStr = ymd(year, monthZero, day)
                        const dow = (firstDow + day - 1) % 7
                        const isWeekend = dow === 0 || dow === 6
                        const isToday = todayStr === dateStr
                        const holidayName = holidayByDate.get(dateStr) ?? null
                        const dayEvents = eventsByDate[dateStr] ?? []

                        return (
                            <DayCell
                                key={idx}
                                day={day}
                                dateStr={dateStr}
                                isWeekend={isWeekend}
                                isToday={isToday}
                                holidayName={holidayName}
                                events={dayEvents}
                                colorByLeaveType={colorByLeaveType}
                                onClick={() => setSelected(dateStr)}
                            />
                        )
                    })}
                </div>
            </div>

            {/* Day detail modal */}
            {selected && (
                <DayDetailModal
                    dateStr={selected}
                    events={selectedEvents}
                    holidayName={holidayByDate.get(selected) ?? null}
                    colorByLeaveType={colorByLeaveType}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    )
}

// ─── Day cell ─────────────────────────────────────────────────────────────

function DayCell({
    day, dateStr, isWeekend, isToday, holidayName, events, colorByLeaveType, onClick,
}: {
    day: number
    dateStr: string
    isWeekend: boolean
    isToday: boolean
    holidayName: string | null
    events: CalendarEvent[]
    colorByLeaveType: Map<string, string>
    onClick: () => void
}) {
    const eventCount = events.length
    const hasEvents = eventCount > 0
    const visibleAvatars = events.slice(0, 3)
    const overflow = eventCount - visibleAvatars.length

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`${day} ${dateStr}${holidayName ? ` — ${holidayName}` : ''}${eventCount > 0 ? ` — ${eventCount} ใบลา` : ''}`}
            className={cn(
                'group relative min-h-[64px] sm:min-h-[96px] p-1 sm:p-1.5 rounded-lg text-left transition-all',
                'border focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70',
                isToday
                    ? 'bg-[#7a2e38] border-amber-300/50 ring-2 ring-amber-300/30 hover:bg-[#8a3641]'
                    : isWeekend
                        ? 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                        : 'bg-white/[0.04] border-white/8 hover:bg-white/8',
                holidayName && !isToday && 'bg-rose-900/20 border-rose-400/20',
            )}
            data-date={dateStr}
        >
            {/* Date number — Buddhist year shown only on hover via title */}
            <div className="flex items-start justify-between gap-1">
                <span
                    className={cn(
                        'text-xs sm:text-sm font-bold tabular-nums',
                        isToday ? 'text-amber-200' : isWeekend ? 'text-rose-200/80' : 'text-white/85',
                    )}
                >
                    {day}
                </span>
                {hasEvents && (
                    <span
                        className={cn(
                            'text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded-full leading-none',
                            isToday
                                ? 'bg-amber-300/30 text-amber-100 border border-amber-300/40'
                                : 'bg-white/15 text-white/85 border border-white/20',
                        )}
                    >
                        {eventCount}
                    </span>
                )}
            </div>

            {holidayName && (
                <p className="text-[9px] sm:text-[10px] text-rose-200/85 mt-0.5 line-clamp-1 font-semibold" title={holidayName}>
                    {holidayName}
                </p>
            )}

            {/* Event avatars (desktop) / dots (mobile) */}
            {hasEvents && (
                <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-0.5 sm:gap-1">
                    {visibleAvatars.map(ev => {
                        const color = colorByLeaveType.get(ev.leave_type_id) ?? '#cbd5e1'
                        const initials = employeeInitials({
                            first_name_th: ev.employee_first_name,
                            last_name_th: ev.employee_last_name,
                            nickname: ev.employee_nickname,
                        })
                        // Show photo on desktop, just colored initials chip on mobile.
                        return (
                            <span
                                key={ev.request_id}
                                title={`${formatEmployeeName({
                                    first_name_th: ev.employee_first_name,
                                    last_name_th: ev.employee_last_name,
                                    nickname: ev.employee_nickname,
                                })} — ${ev.leave_type_name}`}
                                className="inline-flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 rounded-full text-[8px] sm:text-[9px] font-bold text-white shadow-sm"
                                style={{
                                    background: color,
                                    opacity: ev.status === 'pending' ? 0.6 : 1,
                                }}
                            >
                                {ev.employee_photo_url ? (
                                    // Use img to keep this server-component-free; thumbnails are tiny so cost is negligible.
                                    <img
                                        src={ev.employee_photo_url}
                                        alt=""
                                        className="h-full w-full rounded-full object-cover"
                                    />
                                ) : (
                                    initials
                                )}
                            </span>
                        )
                    })}
                    {overflow > 0 && (
                        <span className="inline-flex items-center justify-center h-4 sm:h-5 px-1 rounded-full text-[8px] sm:text-[9px] font-bold text-white/85 bg-white/10 border border-white/15">
                            +{overflow}
                        </span>
                    )}
                </div>
            )}
        </button>
    )
}

// ─── Day detail modal ────────────────────────────────────────────────────

function DayDetailModal({
    dateStr, events, holidayName, colorByLeaveType, onClose,
}: {
    dateStr: string
    events: CalendarEvent[]
    holidayName: string | null
    colorByLeaveType: Map<string, string>
    onClose: () => void
}) {
    // Lock scroll while open + close on Escape.
    useEffect(() => {
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = prevOverflow
            window.removeEventListener('keydown', onKey)
        }
    }, [onClose])

    const [yyyy, mm, dd] = dateStr.split('-').map(Number)
    const dateLabel = `${dd} ${THAI_MONTHS[mm - 1]} ${yyyy + 543}`

    return (
        <div
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-0 sm:px-4 py-0 sm:py-8"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`รายการลาของวันที่ ${dateLabel}`}
                onClick={e => e.stopPropagation()}
                className={cn(
                    'relative w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh]',
                    'bg-[#2a0a0e] border-t sm:border border-white/15 sm:rounded-2xl shadow-2xl',
                    'flex flex-col overflow-hidden',
                )}
            >
                <header className="flex items-start justify-between gap-3 p-4 border-b border-white/10">
                    <div className="min-w-0">
                        <p className="text-white font-bold text-base">{dateLabel}</p>
                        {holidayName && (
                            <p className="text-rose-200/85 text-xs mt-0.5 font-semibold">{holidayName}</p>
                        )}
                        <p className="text-white/50 text-xs mt-0.5">
                            {events.length === 0 ? 'ไม่มีคนลา' : `${events.length} ใบลา`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        aria-label="ปิด"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {events.length === 0 ? (
                        <div className="py-12 text-center text-white/55 text-sm">
                            ไม่มีพนักงานลาในวันนี้
                        </div>
                    ) : (
                        events.map(ev => (
                            <EventRow key={ev.request_id} event={ev} colorByLeaveType={colorByLeaveType} />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

function EventRow({
    event, colorByLeaveType,
}: {
    event: CalendarEvent
    colorByLeaveType: Map<string, string>
}) {
    const color = colorByLeaveType.get(event.leave_type_id) ?? '#cbd5e1'
    const status = STATUS_META[event.status] ?? STATUS_META.cancelled
    const employeeName = formatEmployeeName({
        first_name_th: event.employee_first_name,
        last_name_th: event.employee_last_name,
        nickname: event.employee_nickname,
    })
    const initials = employeeInitials({
        first_name_th: event.employee_first_name,
        last_name_th: event.employee_last_name,
        nickname: event.employee_nickname,
    })
    const isMultiDay = event.start_date !== event.end_date
    const halfDayLabel =
        event.is_half_day && event.half_day_period === 'morning' ? '(ครึ่งเช้า)'
      : event.is_half_day && event.half_day_period === 'afternoon' ? '(ครึ่งบ่าย)'
      : null

    return (
        <Link
            href={`/hradmin/leave?tab=requests&q=${encodeURIComponent(event.reference_code ?? '')}`}
            className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 transition-colors"
        >
            {/* Avatar */}
            <div className="shrink-0">
                {event.employee_photo_url ? (
                    <img
                        src={event.employee_photo_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-white/15"
                    />
                ) : (
                    <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/15"
                        style={{ background: color }}
                    >
                        {initials}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{employeeName}</p>
                    {event.reference_code && (
                        <span className="text-[10px] font-mono text-white/40 tabular-nums">
                            {event.reference_code}
                        </span>
                    )}
                </div>
                <p className="text-xs text-white/55 truncate">{event.employee_department ?? '—'}</p>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        style={{
                            background: `${color}26`,
                            color,
                            borderColor: `${color}55`,
                        }}
                    >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                        {event.leave_type_name}
                        {halfDayLabel && <span className="ml-0.5">{halfDayLabel}</span>}
                    </span>
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        style={{
                            background: status.bg,
                            color: status.color,
                            borderColor: status.ring,
                        }}
                    >
                        {status.label}
                    </span>
                    {isMultiDay && (
                        <span className="text-[10px] text-white/45">
                            {event.start_date} → {event.end_date}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    )
}
