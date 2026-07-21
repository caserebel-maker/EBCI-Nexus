'use client'

import { useState, useTransition, useMemo } from 'react'
import {
    DoorOpen, Plus, X, Clock, Users, FileText, Trash2, Loader2,
    CheckCircle2, AlertCircle, Calendar as CalendarIcon, List,
    ChevronLeft, ChevronRight, CalendarDays, Eye
} from 'lucide-react'
import { createBooking, cancelBooking } from './actions'
import type { RoomBooking } from './constants'
import { formatBangkokTime } from '@/lib/datetime'

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
}

const TH_FULL_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]
const TH_SHORT_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const WEEKDAYS_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

function toYmd(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getTodayYmd(): string {
    return toYmd(new Date())
}

function formatThaiDateShort(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const day = d.getDate()
    const m = TH_SHORT_MONTHS[d.getMonth()]
    return `${day} ${m}`
}

function formatFullThaiDate(isoYmd: string): string {
    const [y, m, d] = isoYmd.split('-').map(Number)
    if (!y || !m || !d) return isoYmd
    const thaiYear = y + 543
    const monthName = TH_FULL_MONTHS[m - 1] ?? ''
    return `${d} ${monthName} ${thaiYear}`
}

function formatTimeRange(startsAt: string, endsAt: string): string {
    return `${formatBangkokTime(startsAt)}-${formatBangkokTime(endsAt)}`
}

function isSameDay(a: string, b: string): boolean {
    const d1 = new Date(a)
    const d2 = new Date(b)
    return d1.getFullYear() === d2.getFullYear()
        && d1.getMonth() === d2.getMonth()
        && d1.getDate() === d2.getDate()
}

function todayDateInputValue(): string {
    return getTodayYmd()
}

function maxDateInputValue(daysAhead: number): string {
    const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    return toYmd(d)
}

interface Props {
    roomName: string
    horizonDays: number
    upcoming: RoomBooking[]
    mine: RoomBooking[]
    currentEmployeeId: string | null
    isHrAdmin: boolean
    hrAuditMode?: boolean
}

export function MeetingRoomView({ roomName, horizonDays, upcoming, mine, currentEmployeeId, isHrAdmin, hrAuditMode = false }: Props) {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
    const [showForm, setShowForm] = useState(false)
    const [initialFormDate, setInitialFormDate] = useState<string | null>(null)
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    // Quick Tooltip Popover State
    const [activeTooltipIso, setActiveTooltipIso] = useState<string | null>(null)

    // Calendar state
    const today = new Date()
    const [currentYear, setCurrentYear] = useState(today.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(today.getMonth()) // 0 - 11
    const [selectedDateIso, setSelectedDateIso] = useState<string>(getTodayYmd())

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 4000)
    }

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear(y => y - 1)
        } else {
            setCurrentMonth(m => m - 1)
        }
    }

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear(y => y + 1)
        } else {
            setCurrentMonth(m => m + 1)
        }
    }

    const handleGoToday = () => {
        const now = new Date()
        setCurrentYear(now.getFullYear())
        setCurrentMonth(now.getMonth())
        setSelectedDateIso(toYmd(now))
    }

    // Map bookings by date YYYY-MM-DD
    const bookingsByDate = useMemo(() => {
        const map = new Map<string, RoomBooking[]>()
        for (const b of upcoming) {
            if (b.cancelled_at && !hrAuditMode) continue
            const dateStr = toYmd(new Date(b.starts_at))
            if (!map.has(dateStr)) {
                map.set(dateStr, [])
            }
            map.get(dateStr)!.push(b)
        }
        return map
    }, [upcoming, hrAuditMode])

    // Bookings on the selected date
    const selectedDateBookings = useMemo(() => {
        return bookingsByDate.get(selectedDateIso) ?? []
    }, [bookingsByDate, selectedDateIso])

    // Bookings for active tooltip modal
    const activeTooltipBookings = useMemo(() => {
        if (!activeTooltipIso) return []
        return bookingsByDate.get(activeTooltipIso) ?? []
    }, [bookingsByDate, activeTooltipIso])

    const handleOpenCreateForm = (prefillDate?: string) => {
        setInitialFormDate(prefillDate || selectedDateIso || todayDateInputValue())
        setShowForm(true)
    }

    const handleSelectDateFromGrid = (iso: string) => {
        setSelectedDateIso(iso)
        const dateBookings = bookingsByDate.get(iso) ?? []
        const activeCount = dateBookings.filter(b => !b.cancelled_at).length
        if (activeCount > 0) {
            setActiveTooltipIso(iso)
        }
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <DoorOpen className="w-6 h-6 text-amber-200" />
                        <h1 className="text-xl font-bold text-white">จองห้องประชุม</h1>
                    </div>
                    <p className="text-white/60 text-sm mt-1">
                        {roomName} · จองล่วงหน้าได้ {horizonDays} วัน
                    </p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                    {/* View Switcher */}
                    <div className="flex items-center p-1 rounded-xl bg-black/30 border border-white/12 text-xs font-semibold">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                viewMode === 'calendar'
                                    ? 'bg-amber-400 text-[#561e23] shadow-md font-bold'
                                    : 'text-white/70 hover:text-white'
                            }`}
                        >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            ปฏิทิน
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                viewMode === 'list'
                                    ? 'bg-amber-400 text-[#561e23] shadow-md font-bold'
                                    : 'text-white/70 hover:text-white'
                            }`}
                        >
                            <List className="w-3.5 h-3.5" />
                            รายการ
                        </button>
                    </div>

                    <button
                        onClick={() => handleOpenCreateForm()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-[#561e23] font-bold text-sm shadow-lg active:scale-95 transition"
                    >
                        <Plus className="w-4 h-4" /> จองห้อง
                    </button>
                </div>
            </div>

            {/* My bookings (if any) — hidden in HR audit view */}
            {!hrAuditMode && mine.length > 0 && (
                <section className="space-y-2">
                    <h2 className="text-white/85 font-semibold text-sm">การจองของฉัน</h2>
                    <div className="space-y-2">
                        {mine.map(b => (
                            <BookingRow
                                key={b.id}
                                booking={b}
                                canCancel={
                                    !b.cancelled_at
                                    && new Date(b.ends_at) > new Date()
                                    && (b.booked_by_employee_id === currentEmployeeId || isHrAdmin)
                                }
                                onCancelled={(msg) => showToast('success', msg)}
                                onError={(msg) => showToast('error', msg)}
                                tone="own"
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* CALENDAR VIEW MODE */}
            {viewMode === 'calendar' ? (
                <div className="space-y-4">
                    {/* Calendar Card */}
                    <div className="p-4 sm:p-5" style={glass}>
                        {/* Month Navigator Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-amber-300" />
                                <h2 className="text-lg font-bold text-white">
                                    {TH_FULL_MONTHS[currentMonth]} {currentYear + 543}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleGoToday}
                                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium border border-white/15 transition"
                                >
                                    วันนี้
                                </button>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handlePrevMonth}
                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 transition"
                                        title="เดือนก่อนหน้า"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleNextMonth}
                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 transition"
                                        title="เดือนถัดไป"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-1">
                            {WEEKDAYS_TH.map((wd, i) => (
                                <div
                                    key={wd}
                                    className={`py-1.5 text-xs font-semibold ${
                                        i === 0 || i === 6 ? 'text-amber-300/70' : 'text-white/60'
                                    }`}
                                >
                                    {wd}
                                </div>
                            ))}
                        </div>

                        {/* Month Grid Cells */}
                        <MonthGrid
                            year={currentYear}
                            month={currentMonth}
                            selectedDateIso={selectedDateIso}
                            bookingsByDate={bookingsByDate}
                            onSelectDate={handleSelectDateFromGrid}
                        />
                    </div>

                    {/* Selected Date Schedule Detail Panel */}
                    <div className="p-4 sm:p-5 space-y-3" style={glass}>
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-300" />
                                <h3 className="font-bold text-white text-base">
                                    รายการจองวันที่ {formatFullThaiDate(selectedDateIso)}
                                </h3>
                                {selectedDateBookings.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-xs font-semibold">
                                        {selectedDateBookings.length} รายการ
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => handleOpenCreateForm(selectedDateIso)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#561e23] font-bold text-xs shadow transition active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" /> จองวันนี้
                            </button>
                        </div>

                        {selectedDateBookings.length === 0 ? (
                            <div className="py-6 px-4 text-center text-white/55 text-sm space-y-3">
                                <p className="font-medium text-white/70">ยังไม่มีรายการจองในวันนี้ (ห้องประชุมว่างทั้งวัน)</p>
                                <button
                                    onClick={() => handleOpenCreateForm(selectedDateIso)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-amber-200 border border-amber-300/30 font-semibold text-xs transition"
                                >
                                    <Plus className="w-3.5 h-3.5" /> คลิกเพื่อจองห้องประชุมสำหรับวันนี้
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2 pt-1">
                                {selectedDateBookings.map(b => (
                                    <BookingRow
                                        key={b.id}
                                        booking={b}
                                        canCancel={
                                            !b.cancelled_at
                                            && new Date(b.ends_at) > new Date()
                                            && (b.booked_by_employee_id === currentEmployeeId || isHrAdmin)
                                        }
                                        onCancelled={(msg) => showToast('success', msg)}
                                        onError={(msg) => showToast('error', msg)}
                                        tone={b.booked_by_employee_id === currentEmployeeId ? 'own' : 'public'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* LIST VIEW MODE */
                <section className="space-y-2">
                    <h2 className="text-white/85 font-semibold text-sm">
                        {hrAuditMode
                            ? `ทุกการจอง (30 วันที่ผ่านมา + ${horizonDays} วันข้างหน้า)`
                            : `คิวห้องประชุม ${horizonDays} วันข้างหน้า`}
                    </h2>
                    {upcoming.length === 0 ? (
                        <div className="p-6 text-center text-white/55 text-sm" style={glass}>
                            {hrAuditMode ? 'ยังไม่มีรายการจองในช่วงนี้' : 'ยังไม่มีใครจอง — ห้องว่างทั้งสัปดาห์'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {upcoming.map(b => (
                                <BookingRow
                                    key={b.id}
                                    booking={b}
                                    canCancel={
                                        !b.cancelled_at
                                        && new Date(b.ends_at) > new Date()
                                        && (b.booked_by_employee_id === currentEmployeeId || isHrAdmin)
                                    }
                                    onCancelled={(msg) => showToast('success', msg)}
                                    onError={(msg) => showToast('error', msg)}
                                    tone={b.booked_by_employee_id === currentEmployeeId ? 'own' : 'public'}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Quick Tooltip Popover Modal */}
            {activeTooltipIso && activeTooltipBookings.length > 0 && (
                <QuickBookingTooltipModal
                    iso={activeTooltipIso}
                    bookings={activeTooltipBookings}
                    onClose={() => setActiveTooltipIso(null)}
                    onOpenCreateForm={(iso) => {
                        setActiveTooltipIso(null)
                        handleOpenCreateForm(iso)
                    }}
                />
            )}

            {showForm && (
                <BookingFormModal
                    horizonDays={horizonDays}
                    roomName={roomName}
                    initialDate={initialFormDate}
                    onClose={() => { setShowForm(false); setInitialFormDate(null); }}
                    onSuccess={() => { setShowForm(false); setInitialFormDate(null); showToast('success', 'จองห้องเรียบร้อย'); }}
                    onError={(msg) => showToast('error', msg)}
                />
            )}

            {toast && (
                <div className="fixed inset-x-0 top-1/3 z-[100] flex justify-center pointer-events-none px-4">
                    <div
                        className="pointer-events-auto px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 max-w-md"
                        style={{
                            background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(239,68,68,0.95)',
                            color: 'white',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        {toast.type === 'success'
                            ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                            : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                        <div className="text-sm font-medium">{toast.msg}</div>
                        <button onClick={() => setToast(null)} className="ml-2 opacity-80 hover:opacity-100">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function MonthGrid({
    year,
    month,
    selectedDateIso,
    bookingsByDate,
    onSelectDate,
}: {
    year: number
    month: number
    selectedDateIso: string
    bookingsByDate: Map<string, RoomBooking[]>
    onSelectDate: (iso: string) => void
}) {
    const todayYmd = getTodayYmd()

    // Build days array for 6-week grid
    const days = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1)
        const startingWeekday = firstDayOfMonth.getDay() // 0 = Sun, 6 = Sat
        const daysInMonth = new Date(year, month + 1, 0).getDate()

        const list: Array<{ date: Date; iso: string; inCurrentMonth: boolean }> = []

        // Previous month padding
        const prevMonthLastDate = new Date(year, month, 0).getDate()
        for (let i = startingWeekday - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, prevMonthLastDate - i)
            list.push({ date: d, iso: toYmd(d), inCurrentMonth: false })
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month, day)
            list.push({ date: d, iso: toYmd(d), inCurrentMonth: true })
        }

        // Next month padding to complete 35 or 42 grid cells
        const remaining = (list.length > 35 ? 42 : 35) - list.length
        for (let day = 1; day <= remaining; day++) {
            const d = new Date(year, month + 1, day)
            list.push({ date: d, iso: toYmd(d), inCurrentMonth: false })
        }

        return list
    }, [year, month])

    return (
        <div className="grid grid-cols-7 gap-1">
            {days.map(({ date, iso, inCurrentMonth }) => {
                const isToday = iso === todayYmd
                const isSelected = iso === selectedDateIso
                const dayBookings = bookingsByDate.get(iso) ?? []
                const activeBookings = dayBookings.filter(b => !b.cancelled_at)
                const hasBookings = activeBookings.length > 0

                return (
                    <button
                        key={iso}
                        onClick={() => onSelectDate(iso)}
                        className={`min-h-[64px] sm:min-h-[76px] p-1 sm:p-1.5 rounded-xl flex flex-col justify-between text-left transition-all relative overflow-hidden border group ${
                            isSelected
                                ? 'bg-amber-500/25 border-amber-400 text-white shadow-lg'
                                : inCurrentMonth
                                ? 'bg-white/5 hover:bg-white/12 border-white/10 text-white/90'
                                : 'bg-black/20 text-white/30 border-transparent hover:bg-white/5'
                        } ${isToday ? 'ring-2 ring-amber-400' : ''}`}
                        title={
                            hasBookings
                                ? `${formatThaiDateShort(iso)} (${activeBookings.length} รายการจอง): ${activeBookings.map(b => `${formatBangkokTime(b.starts_at)} ${b.title} (${b.booked_by_name})`).join(', ')}`
                                : formatThaiDateShort(iso)
                        }
                    >
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between w-full">
                            <span
                                className={`text-xs sm:text-sm font-bold px-1 py-0.5 rounded-md ${
                                    isToday
                                        ? 'bg-amber-400 text-[#561e23]'
                                        : isSelected
                                        ? 'text-amber-200 font-extrabold'
                                        : ''
                                }`}
                            >
                                {date.getDate()}
                            </span>
                            {hasBookings && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-[#561e23] shadow-sm">
                                    {activeBookings.length}
                                </span>
                            )}
                        </div>

                        {/* Bookings Preview inside cell */}
                        <div className="w-full space-y-0.5 mt-1 hidden sm:block">
                            {activeBookings.slice(0, 2).map(b => (
                                <div
                                    key={b.id}
                                    className="text-[10px] leading-tight px-1 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 truncate"
                                >
                                    <span className="font-semibold">{formatBangkokTime(b.starts_at)}</span> {b.title}
                                </div>
                            ))}
                            {activeBookings.length > 2 && (
                                <div className="text-[9px] text-amber-300/80 font-medium px-1">
                                    + อีก {activeBookings.length - 2} รายการ
                                </div>
                            )}
                        </div>

                        {/* Mobile indicator dots */}
                        <div className="flex items-center gap-1 sm:hidden mt-1 justify-center w-full">
                            {hasBookings && (
                                <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                            )}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}

function QuickBookingTooltipModal({
    iso,
    bookings,
    onClose,
    onOpenCreateForm,
}: {
    iso: string
    bookings: RoomBooking[]
    onClose: () => void
    onOpenCreateForm: (dateIso: string) => void
}) {
    const activeBookings = bookings.filter(b => !b.cancelled_at)

    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md p-5 rounded-2xl space-y-4 shadow-2xl border border-amber-400/40 max-h-[85vh] overflow-y-auto"
                style={{
                    background: 'rgba(56,18,22,0.92)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                {/* Tooltip Header */}
                <div className="flex items-start justify-between border-b border-white/15 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/40 shrink-0">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">รายการจองห้องประชุม</h3>
                            <p className="text-amber-200 text-xs font-semibold mt-0.5">
                                วันที่ {formatFullThaiDate(iso)} ({activeBookings.length} รายการ)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* List of bookings */}
                <div className="space-y-2.5">
                    {activeBookings.map(b => (
                        <div
                            key={b.id}
                            className="p-3.5 rounded-xl bg-white/8 border border-white/12 space-y-1.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 text-xs font-bold border border-amber-400/30">
                                    {formatTimeRange(b.starts_at, b.ends_at)} น.
                                </span>
                                <span className="text-white/75 text-xs font-medium truncate">
                                    ผู้จอง: <strong className="text-white">{b.booked_by_name}</strong>
                                </span>
                            </div>
                            <div className="font-bold text-white text-[15px] pt-0.5">
                                {b.title}
                            </div>
                            {b.attendees && (
                                <div className="text-white/75 text-xs flex items-start gap-1.5">
                                    <Users className="w-3.5 h-3.5 mt-0.5 text-amber-300 shrink-0" />
                                    <span>ผู้ร่วม: <strong className="text-white/90">{b.attendees}</strong></span>
                                </div>
                            )}
                            {b.notes && (
                                <div className="text-white/70 text-xs bg-black/25 p-2 rounded-lg border border-white/5">
                                    หมายเหตุ: {b.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/15">
                    <button
                        onClick={() => onOpenCreateForm(iso)}
                        className="flex-1 py-2.5 rounded-xl bg-amber-400 text-[#561e23] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                    >
                        <Plus className="w-4 h-4" /> จองเพิ่มสำหรับวันนี้
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl bg-white/10 text-white font-medium text-xs hover:bg-white/15 transition"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    )
}

function BookingRow({
    booking,
    canCancel,
    onCancelled,
    onError,
    tone,
}: {
    booking: RoomBooking
    canCancel: boolean
    onCancelled: (msg: string) => void
    onError: (msg: string) => void
    tone: 'own' | 'public'
}) {
    const [pending, startTransition] = useTransition()
    const isCancelled = !!booking.cancelled_at
    const isPast = new Date(booking.ends_at) < new Date()

    const handleCancel = () => {
        if (!confirm(`ยกเลิกการจอง "${booking.title}"?`)) return
        startTransition(async () => {
            const res = await cancelBooking(booking.id)
            if (res.error) onError(res.error)
            else onCancelled('ยกเลิกเรียบร้อย')
        })
    }

    return (
        <div
            className="p-4 flex items-start gap-3"
            style={{
                ...glass,
                opacity: isCancelled || isPast ? 0.5 : 1,
                borderColor: tone === 'own' ? 'rgba(251,191,36,0.4)' : undefined,
            }}
        >
            <div
                className="shrink-0 w-14 text-center py-1.5 rounded-lg"
                style={{
                    background: tone === 'own' ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.06)',
                    color: tone === 'own' ? '#fde68a' : '#ffffff',
                }}
            >
                <div className="text-xs font-medium opacity-80">{formatThaiDateShort(booking.starts_at)}</div>
                <div className="text-[11px] mt-0.5 opacity-70">
                    {isSameDay(booking.starts_at, booking.ends_at)
                        ? formatTimeRange(booking.starts_at, booking.ends_at)
                        : formatBangkokTime(booking.starts_at) + '...'}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-[15px] truncate">{booking.title}</div>
                <div className="text-white/65 text-xs mt-1 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-amber-200/80 shrink-0" /> {booking.booked_by_name}
                </div>
                {booking.attendees && (
                    <div className="text-white/55 text-xs mt-1 truncate">
                        ผู้ร่วม: {booking.attendees}
                    </div>
                )}
                {booking.notes && (
                    <div className="text-white/55 text-xs mt-1 line-clamp-2">{booking.notes}</div>
                )}
                {isCancelled && (
                    <div className="text-rose-300 text-xs mt-1.5 font-medium">
                        ยกเลิกแล้ว{booking.cancelled_by_name ? ` โดย ${booking.cancelled_by_name}` : ''}
                    </div>
                )}
            </div>
            {canCancel && (
                <button
                    onClick={handleCancel}
                    disabled={pending}
                    className="shrink-0 p-2 rounded-lg text-rose-300 hover:bg-rose-500/15 disabled:opacity-50 transition"
                    title="ยกเลิกการจอง"
                >
                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
            )}
        </div>
    )
}

function BookingFormModal({
    horizonDays,
    roomName,
    initialDate,
    onClose,
    onSuccess,
    onError,
}: {
    horizonDays: number
    roomName: string
    initialDate?: string | null
    onClose: () => void
    onSuccess: () => void
    onError: (msg: string) => void
}) {
    const [pending, startTransition] = useTransition()
    const [title, setTitle] = useState('')
    const [date, setDate] = useState(initialDate || todayDateInputValue())
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('10:00')
    const [attendees, setAttendees] = useState('')
    const [notes, setNotes] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) { onError('กรอกหัวเรื่องการประชุม'); return }
        if (endTime <= startTime) { onError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม'); return }

        const startsAt = new Date(`${date}T${startTime}:00`).toISOString()
        const endsAt = new Date(`${date}T${endTime}:00`).toISOString()

        startTransition(async () => {
            const res = await createBooking({ title, notes, attendees, startsAt, endsAt })
            if (res.error) onError(res.error)
            else onSuccess()
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3"
            style={{ background: 'rgba(47,0,0,0.5)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto"
                style={{
                    background: 'rgba(86,30,35,0.77)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: '20px',
                }}
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-white">จองห้องประชุม</h2>
                        <p className="text-white/65 text-xs mt-0.5">{roomName} · ล่วงหน้าได้ {horizonDays} วัน</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-3">
                    <Field label="หัวเรื่องการประชุม *" icon={<FileText className="w-4 h-4" />}>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                            placeholder="เช่น ประชุมประจำสัปดาห์"
                            className="w-full bg-white/8 text-white placeholder-white/35 rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                            required
                        />
                    </Field>

                    <Field label="วันที่ *" icon={<Clock className="w-4 h-4" />}>
                        <input
                            type="date"
                            value={date}
                            min={todayDateInputValue()}
                            max={maxDateInputValue(horizonDays)}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-white/8 text-white rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                            required
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="เวลาเริ่ม *">
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full bg-white/8 text-white rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                                required
                            />
                        </Field>
                        <Field label="เวลาสิ้นสุด *">
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full bg-white/8 text-white rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                                required
                            />
                        </Field>
                    </div>

                    <Field label="ผู้ร่วมประชุม (ไม่บังคับ)" icon={<Users className="w-4 h-4" />}>
                        <input
                            type="text"
                            value={attendees}
                            onChange={(e) => setAttendees(e.target.value)}
                            maxLength={500}
                            placeholder="พิมพ์ชื่อคั่นด้วยจุลภาค"
                            className="w-full bg-white/8 text-white placeholder-white/35 rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[15px]"
                        />
                    </Field>

                    <Field label="หมายเหตุ (ไม่บังคับ)">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            maxLength={1000}
                            rows={2}
                            placeholder="วาระ / อุปกรณ์ที่ต้องเตรียม"
                            className="w-full bg-white/8 text-white placeholder-white/35 rounded-lg px-3 py-2.5 outline-none focus:bg-white/12 border border-white/10 text-[14px] resize-none"
                        />
                    </Field>
                </div>

                <div className="flex gap-2 mt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm active:scale-95 transition"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={pending}
                        className="flex-1 py-2.5 rounded-xl bg-amber-400 text-[#561e23] font-bold text-sm active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {pending ? 'กำลังจอง...' : 'ยืนยันการจอง'}
                    </button>
                </div>
            </form>
        </div>
    )
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <label className="block">
            <div className="text-white/75 text-xs mb-1.5 flex items-center gap-1.5 font-medium">
                {icon}{label}
            </div>
            {children}
        </label>
    )
}
