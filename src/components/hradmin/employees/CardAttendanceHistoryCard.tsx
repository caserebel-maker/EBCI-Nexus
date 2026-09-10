'use client'

import { useState } from 'react'
import { CalendarDays, ChevronDown, CreditCard, Download } from 'lucide-react'
import { formatBangkokTime } from '@/lib/datetime'
import type { EmployeeCardAttendanceMonth } from '@/lib/employee-card-attendance'

type Props = {
    months: EmployeeCardAttendanceMonth[]
}

function monthLabel(month: string) {
    const [year, monthNumber] = month.split('-').map(Number)
    return new Intl.DateTimeFormat('th-TH', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Bangkok',
    }).format(new Date(`${year}-${String(monthNumber).padStart(2, '0')}-01T12:00:00+07:00`))
}

function dayLabel(date: string) {
    return new Intl.DateTimeFormat('th-TH', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Bangkok',
    }).format(new Date(`${date}T12:00:00+07:00`))
}

function escapeCsv(value: string | number) {
    return `"${String(value).replace(/"/g, '""')}"`
}

function downloadMonthCsv(month: EmployeeCardAttendanceMonth) {
    const rows = [
        ['วันที่ (ค.ศ.)', 'วันที่', 'เวลาเข้าแรก', 'เวลาออกล่าสุด', 'จำนวนแตะบัตร', 'แตะเข้า', 'แตะออก', 'เวลาแตะบัตรทั้งหมด'],
        ...month.days.map(day => [
            day.date,
            dayLabel(day.date),
            formatBangkokTime(day.firstScan, 'bangkok'),
            formatBangkokTime(day.lastScan, 'bangkok'),
            day.scanCount,
            day.inCount,
            day.outCount,
            day.scanTimes.join(' | '),
        ]),
    ]
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `card-attendance-${month.month}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

export function CardAttendanceHistoryCard({ months }: Props) {
    const [openMonth, setOpenMonth] = useState<string | null>(months[0]?.month ?? null)

    return (
        <section className="rounded-2xl border border-white/20 bg-white/[0.16] p-4 shadow-xl backdrop-blur-md print:hidden">
            <div className="mb-5 flex items-start gap-3 border-b border-white/10 pb-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/25">
                    <CreditCard size={16} />
                </div>
                <div className="min-w-0">
                    <h2 className="text-[1.1rem] font-bold tracking-wide text-white">ประวัติแตะบัตรรายเดือน</h2>
                    <p className="mt-0.5 text-[0.82rem] text-white/60">กดเลือกเดือนเพื่อดูเวลาเข้าและรายการแตะบัตรรายวัน</p>
                </div>
            </div>

            {months.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 bg-black/10 px-4 py-8 text-center text-[0.92rem] text-white/60">
                    ยังไม่พบข้อมูลการแตะบัตรของพนักงานคนนี้
                </div>
            ) : (
                <div className="space-y-2.5">
                    {months.map(month => {
                        const isOpen = openMonth === month.month
                        return (
                            <div key={month.month} className="overflow-hidden rounded-xl border border-white/12 bg-black/10">
                                <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
                                    <button
                                        type="button"
                                        onClick={() => setOpenMonth(isOpen ? null : month.month)}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                        aria-expanded={isOpen}
                                    >
                                        <CalendarDays size={17} className="shrink-0 text-amber-300" />
                                        <span className="min-w-0 flex-1 text-[0.96rem] font-bold text-white">{monthLabel(month.month)}</span>
                                        <span className="hidden text-xs text-white/60 sm:inline">{month.days.length} วัน</span>
                                        <span className="rounded-md border border-sky-300/25 bg-sky-400/10 px-2 py-1 text-xs font-bold text-sky-100">
                                            {month.scanCount} ครั้ง
                                        </span>
                                        <ChevronDown size={17} className={`shrink-0 text-white/65 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => downloadMonthCsv(month)}
                                        className="rounded-lg border border-white/15 bg-white/8 p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                                        title={`ดาวน์โหลด CSV เดือน${monthLabel(month.month)}`}
                                        aria-label={`ดาวน์โหลด CSV เดือน${monthLabel(month.month)}`}
                                    >
                                        <Download size={15} />
                                    </button>
                                </div>

                                {isOpen && (
                                    <div className="border-t border-white/10">
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[670px] text-sm">
                                                <thead className="bg-white/[0.04] text-left text-[0.72rem] font-bold uppercase tracking-wider text-white/55">
                                                    <tr>
                                                        <th className="px-4 py-2.5">วันที่</th>
                                                        <th className="px-4 py-2.5">เข้าแรก</th>
                                                        <th className="px-4 py-2.5">ออกล่าสุด</th>
                                                        <th className="px-4 py-2.5 text-right">แตะบัตร</th>
                                                        <th className="px-4 py-2.5">เวลาแตะบัตรทั้งหมด</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {month.days.map(day => (
                                                        <tr key={day.date} className="border-t border-white/5 text-white/85 hover:bg-white/[0.04]">
                                                            <td className="whitespace-nowrap px-4 py-3 font-medium text-white">{dayLabel(day.date)}</td>
                                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-emerald-200">{formatBangkokTime(day.firstScan, 'bangkok')}</td>
                                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-amber-100">{formatBangkokTime(day.lastScan, 'bangkok')}</td>
                                                            <td className="px-4 py-3 text-right font-bold tabular-nums text-sky-100">{day.scanCount}</td>
                                                            <td className="px-4 py-3 font-mono text-xs text-white/65">{day.scanTimes.join(' · ')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
