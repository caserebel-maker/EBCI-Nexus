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

// Friendly labels for the four `holidays.type` values HR can pick. Anything
// outside this map falls through to "บริษัทกำหนด" so legacy/imported rows
// still render with sensible copy.
const HOLIDAY_TYPE_LABEL: Record<string, string> = {
    public:    'นักขัตฤกษ์',
    religious: 'วันสำคัญทางศาสนา',
    company:   'บริษัทกำหนด',
    wfh:       'WFH (ทำงานที่บ้าน)',
}

const isWfhEntry = (h?: { type?: string } | null) => h?.type === 'wfh'

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.14)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.22)',
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

    // Detect whether the visible month has any holiday/WFH entry — drives
    // which legend chips render. Walking holidayMap is fine; the dataset
    // is small (one year of company calendar).
    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
    let hasOffDayInMonth = false
    let hasWfhDayInMonth = false
    holidays.forEach(h => {
        if (!h.date.startsWith(monthPrefix)) return
        if (isWfhEntry(h)) hasWfhDayInMonth = true
        else hasOffDayInMonth = true
    })

    return (
        <div className="max-w-lg mx-auto space-y-4 pb-4">
            {/* Calendar Card */}
            <div style={glass} className="p-4">

                {/* Month/Year header */}
                <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth}
                        className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all active:scale-90">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-center">
                        <p className="text-white font-bold" style={{ fontSize: '17px' }}>
                            {THAI_MONTHS[viewMonth]}
                        </p>
                        <p className="text-white/75" style={{ fontSize: '13px' }}>
                            {viewYear + 543}
                        </p>
                    </div>
                    <button onClick={nextMonth}
                        className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all active:scale-90">
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                    {DAY_HEADERS.map((d, i) => (
                        <div key={d} className={`text-center py-1 text-xs font-semibold ${i === 0 ? 'text-red-300' : i === 6 ? 'text-blue-300' : 'text-white/70'}`}>
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
                        const isWfh = isWfhEntry(holiday)
                        const isOffDay = !!holiday && !isWfh
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
                                    // Off-day cells were rendering ~18% red
                                    // over the maroon body — same hue family
                                    // so the cell barely separated from the
                                    // background. Use amber instead: completely
                                    // different hue from the maroon page, still
                                    // reads as "warning / non-working day" in
                                    // Thai cultural conventions, and the
                                    // amber/maroon contrast is the strongest
                                    // pair we get without inventing a new
                                    // colour. WFH stays green (already a
                                    // distinct hue from the body); selected
                                    // stays neutral white.
                                    background: isSelected
                                        ? 'rgba(255,255,255,0.22)'
                                        : isOffDay
                                            ? 'rgba(251,191,36,0.28)'
                                            : isWfh
                                                ? 'rgba(52,211,153,0.22)'
                                                : hasEvent ? 'rgba(255,255,255,0.08)' : undefined,
                                    border: isSelected
                                        ? '1px solid rgba(255,255,255,0.45)'
                                        : isOffDay
                                            ? '1px solid rgba(251,191,36,0.55)'
                                            : isWfh
                                                ? '1px solid rgba(52,211,153,0.45)'
                                                : undefined,
                                    minHeight: 44,
                                }}
                            >
                                {/* Day number — WFH days are still working days, so the
                                    number stays neutral (only true off-days go red). The
                                    "today" pill uses a bright amber rim so it stays
                                    legible against the maroon body gradient. */}
                                <span
                                    className="w-7 h-7 flex items-center justify-center rounded-full font-bold text-sm"
                                    style={{
                                        background: isToday ? '#fbbf24' : undefined,
                                        // Off-day numbers go amber (matches the
                                        // new amber cell bg). Sunday-only cells
                                        // (no holiday) keep the traditional red
                                        // since the cell bg is still neutral.
                                        // Saturday stays blue.
                                        color: isToday
                                            ? '#1a0a0d'
                                            : isOffDay
                                                ? '#fde68a'
                                                : isSun ? '#FCA5A5'
                                                : isSat ? '#93C5FD' : '#ffffff',
                                        boxShadow: isToday ? '0 0 0 2px rgba(251,191,36,0.4)' : undefined,
                                    }}
                                >
                                    {day}
                                </span>

                                {/* Holiday/WFH label (tiny). Bumped from 8 → 10px so the
                                    truncated name is readable on a phone without zooming;
                                    the cell footers were near-illegible before. Off-day
                                    text now amber to match the cell bg. */}
                                {holiday && (
                                    <span className="leading-tight text-center px-0.5 truncate w-full font-semibold"
                                        style={{
                                            fontSize: '10px',
                                            maxWidth: '100%',
                                            color: isWfh ? '#A7F3D0' : '#fde68a',
                                            marginTop: 2,
                                        }}>
                                        {isWfh ? `🏠 ${holiday.name}` : holiday.name}
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
                        <p className="text-white font-bold" style={{ fontSize: '16px' }}>
                            {(() => {
                                const [y, m, d] = selected.split('-')
                                return `${parseInt(d)} ${THAI_MONTHS[parseInt(m) - 1]} ${parseInt(y) + 543}`
                            })()}
                        </p>
                        <button onClick={() => setSelected(null)} className="text-white/65 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {selectedHoliday && (() => {
                        const wfh = isWfhEntry(selectedHoliday)
                        const tone = wfh
                            ? { bg: 'rgba(52,211,153,0.22)', border: 'rgba(52,211,153,0.45)', text: '#A7F3D0', sub: '#6EE7B7', icon: '🏠' }
                            : { bg: 'rgba(251,191,36,0.28)', border: 'rgba(251,191,36,0.55)', text: '#fde68a', sub: '#fcd34d', icon: '🎌' }
                        return (
                            <div className="flex items-center gap-2 mb-2 p-3 rounded-xl"
                                style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
                                <span className="text-xl" style={{ color: tone.text }}>{tone.icon}</span>
                                <div>
                                    <p className="font-bold text-sm" style={{ color: tone.text }}>{selectedHoliday.name}</p>
                                    <p className="text-xs font-medium" style={{ color: tone.sub }}>
                                        {HOLIDAY_TYPE_LABEL[selectedHoliday.type] ?? HOLIDAY_TYPE_LABEL.company}
                                    </p>
                                </div>
                            </div>
                        )
                    })()}

                    {selectedLeaves.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1.5 p-3 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}>
                            <span className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: LEAVE_COLOR[l.leaveType] ?? '#fff', opacity: l.status === 'pending' ? 0.6 : 1 }} />
                            <p className="text-white text-sm font-medium">{LEAVE_LABEL[l.leaveType] ?? l.leaveType}</p>
                            <span className="ml-auto text-xs font-semibold"
                                style={{ color: l.status === 'approved' ? '#6EE7B7' : '#FCD34D' }}>
                                {l.status === 'approved' ? 'อนุมัติแล้ว' : 'รอการอนุมัติ'}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Legend */}
            <div style={glass} className="p-3">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {hasOffDayInMonth && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(251,191,36,0.5)', border: '1px solid #fbbf24' }} />
                            <span className="text-white/85 font-medium" style={{ fontSize: '12px' }}>วันหยุด</span>
                        </div>
                    )}
                    {hasWfhDayInMonth && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(52,211,153,0.5)', border: '1px solid #34D399' }} />
                            <span className="text-white/85 font-medium" style={{ fontSize: '12px' }}>WFH</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ background: '#fbbf24', boxShadow: '0 0 0 2px rgba(251,191,36,0.35)' }} />
                        <span className="text-white/85 font-medium" style={{ fontSize: '12px' }}>วันนี้</span>
                    </div>
                    {Object.entries(LEAVE_LABEL).filter(([k]) => leaveTypesInMonth.has(k)).map(([k, label]) => (
                        <div key={k} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full" style={{ background: LEAVE_COLOR[k] }} />
                            <span className="text-white/85 font-medium" style={{ fontSize: '12px' }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
