'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Holiday, LeaveDay } from './page'

interface Props {
    holidays: Holiday[]
    leaveDays: LeaveDay[]
}

const DAY_HEADERS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

const THAI_MONTHS = [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน',
    'พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม',
    'กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

const LEAVE_COLOR: Record<string, string> = {
    annual:       '#60A5FA',
    sick:         '#34D399',
    personal:     '#FBBF24',
    compensation: '#FB923C',
    maternity:    '#F472B6',
    ordination:   '#A78BFA',
}

const LEAVE_LABEL: Record<string, string> = {
    annual:       'ลาพักร้อน',
    sick:         'ลาป่วย',
    personal:     'ลากิจ',
    compensation: 'ลาหยุดชดเชย',
    maternity:    'ลาคลอด',
    ordination:   'ลาบวช',
}

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
}

function toDateStr(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function CalendarClient({ holidays, leaveDays }: Props) {
    const today = new Date()
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const [selected, setSelected] = useState<string | null>(null)

    // Build lookup maps
    const holidayMap = new Map<string, Holiday>()
    holidays.forEach(h => holidayMap.set(h.date, h))

    const leaveDayMap = new Map<string, LeaveDay[]>()
    leaveDays.forEach(l => {
        const arr = leaveDayMap.get(l.date) ?? []
        arr.push(l)
        leaveDayMap.set(l.date, arr)
    })

    // Month navigation
    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
        else setViewMonth(m => m - 1)
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
        else setViewMonth(m => m + 1)
    }

    // Generate calendar grid
    const firstDow = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: (number | null)[] = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null)

    const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

    // Selected day data
    const selectedHoliday = selected ? holidayMap.get(selected) : null
    const selectedLeaves = selected ? (leaveDayMap.get(selected) ?? []) : []

    // Leave types present this month (for legend)
    const leaveTypesInMonth = new Set<string>()
    leaveDays.forEach(l => {
        if (l.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)) {
            leaveTypesInMonth.add(l.leaveType)
        }
    })

    return (
        <div className="max-w-lg mx-auto space-y-4 pb-4">
            {/* Calendar Card */}
            <div style={glass} className="p-4">

                {/* Month/Year header */}
                <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth}
                        className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-center">
                        <p className="text-white font-bold" style={{ fontSize: '16px' }}>
                            {THAI_MONTHS[viewMonth]}
                        </p>
                        <p className="text-white/50" style={{ fontSize: '13px' }}>
                            {viewYear + 543}
                        </p>
                    </div>
                    <button onClick={nextMonth}
                        className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                    {DAY_HEADERS.map((d, i) => (
                        <div key={d} className={`text-center py-1 text-xs font-semibold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-white/40'}`}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-y-1">
                    {cells.map((day, idx) => {
                        if (!day) return <div key={`empty-${idx}`} />

                        const dateStr = toDateStr(viewYear, viewMonth, day)
                        const holiday = holidayMap.get(dateStr)
                        const leaves = leaveDayMap.get(dateStr) ?? []
                        const isToday = dateStr === todayStr
                        const isSelected = dateStr === selected
                        const isSun = idx % 7 === 0
                        const isSat = idx % 7 === 6
                        const hasEvent = !!holiday || leaves.length > 0

                        return (
                            <button
                                key={dateStr}
                                onClick={() => setSelected(isSelected ? null : dateStr)}
                                className="relative flex flex-col items-center py-1 rounded-xl transition-all active:scale-95"
                                style={{
                                    background: isSelected
                                        ? 'rgba(255,255,255,0.15)'
                                        : holiday
                                            ? 'rgba(248,113,113,0.12)'
                                            : hasEvent ? 'rgba(255,255,255,0.05)' : undefined,
                                    minHeight: 44,
                                }}
                            >
                                {/* Day number */}
                                <span
                                    className="w-7 h-7 flex items-center justify-center rounded-full font-medium text-sm"
                                    style={{
                                        background: isToday ? '#882136' : undefined,
                                        color: isToday
                                            ? '#fff'
                                            : isSun || holiday
                                                ? '#FCA5A5'
                                                : isSat ? '#93C5FD' : 'rgba(255,255,255,0.85)',
                                        fontWeight: isToday ? 700 : undefined,
                                    }}
                                >
                                    {day}
                                </span>

                                {/* Holiday name (tiny) */}
                                {holiday && (
                                    <span className="text-red-300 leading-tight text-center px-0.5 truncate w-full"
                                        style={{ fontSize: '8px', maxWidth: '100%' }}>
                                        {holiday.name}
                                    </span>
                                )}

                                {/* Leave dots */}
                                {leaves.length > 0 && (
                                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                                        {[...new Set(leaves.map(l => l.leaveType))].slice(0, 3).map(lt => (
                                            <span key={lt}
                                                className="rounded-full"
                                                style={{ width: 5, height: 5, background: LEAVE_COLOR[lt] ?? '#fff', opacity: leaves.find(l => l.leaveType === lt)?.status === 'pending' ? 0.5 : 1 }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Day detail popup */}
            {selected && (selectedHoliday || selectedLeaves.length > 0) && (
                <div style={glass} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <p className="text-white font-bold" style={{ fontSize: '15px' }}>
                            {(() => {
                                const [y, m, d] = selected.split('-')
                                return `${parseInt(d)} ${THAI_MONTHS[parseInt(m) - 1]} ${parseInt(y) + 543}`
                            })()}
                        </p>
                        <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {selectedHoliday && (
                        <div className="flex items-center gap-2 mb-2 p-2.5 rounded-xl"
                            style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)' }}>
                            <span className="text-red-300 text-lg">🎌</span>
                            <div>
                                <p className="text-red-300 font-semibold text-sm">{selectedHoliday.name}</p>
                                <p className="text-red-400/60 text-xs">
                                    {selectedHoliday.type === 'public' ? 'นักขัตฤกษ์' : 'บริษัทกำหนด'}
                                </p>
                            </div>
                        </div>
                    )}

                    {selectedLeaves.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1.5 p-2.5 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: LEAVE_COLOR[l.leaveType] ?? '#fff', opacity: l.status === 'pending' ? 0.6 : 1 }} />
                            <p className="text-white/80 text-sm">{LEAVE_LABEL[l.leaveType] ?? l.leaveType}</p>
                            <span className="ml-auto text-xs"
                                style={{ color: l.status === 'approved' ? '#34D399' : '#FBBF24' }}>
                                {l.status === 'approved' ? 'อนุมัติแล้ว' : 'รอการอนุมัติ'}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Legend */}
            <div style={glass} className="p-3">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(248,113,113,0.4)', border: '1px solid #F87171' }} />
                        <span className="text-white/55" style={{ fontSize: '11px' }}>วันหยุด</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ background: '#882136' }} />
                        <span className="text-white/55" style={{ fontSize: '11px' }}>วันนี้</span>
                    </div>
                    {Object.entries(LEAVE_LABEL).filter(([k]) => leaveTypesInMonth.has(k)).map(([k, label]) => (
                        <div key={k} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full" style={{ background: LEAVE_COLOR[k] }} />
                            <span className="text-white/55" style={{ fontSize: '11px' }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
