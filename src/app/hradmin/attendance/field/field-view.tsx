'use client'

import { useMemo, useState } from 'react'
import { Briefcase, AlertTriangle, MapPin, Download, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBangkokDateTime } from '@/lib/datetime'

export interface FieldCheckin {
    id: string
    employeeId: string
    employeeName: string
    employeeNickname: string | null
    employeeCode: string | null
    department: string | null
    checkedInAt: string
    note: string | null
    latitude: number | null
    longitude: number | null
    accuracyMeters: number | null
    distanceFromOffice: number | null
    flags: string[]   // ['in_office', 'short_note', ...]
}

export interface EmployeeFieldStat {
    employeeId: string
    employeeName: string
    employeeNickname: string | null
    department: string | null
    totalCheckins: number
    uniqueDays: Set<string>
    uniqueDayCount?: number
    percentOfWeekdays?: number
    inOfficeFlags: number
}

interface Props {
    items: FieldCheckin[]
    stats: Array<EmployeeFieldStat & { uniqueDayCount: number; percentOfWeekdays: number }>
    windowDays: number
    weekdaysInWindow: number
}

const FLAG_LABEL: Record<string, { label: string; tone: 'warn' | 'danger' }> = {
    in_office:  { label: 'GPS อยู่ในรัศมีออฟฟิศ', tone: 'danger' },
    short_note: { label: 'Note สั้นเกินไป',         tone: 'warn' },
}

export function FieldCheckinView({ items, stats, windowDays, weekdaysInWindow }: Props) {
    const [query, setQuery] = useState('')
    const [flagFilter, setFlagFilter] = useState<'all' | 'flagged'>('all')

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        return items.filter(i => {
            if (flagFilter === 'flagged' && i.flags.length === 0) return false
            if (!q) return true
            return (
                i.employeeName.toLowerCase().includes(q)
                || (i.employeeNickname?.toLowerCase().includes(q) ?? false)
                || (i.note?.toLowerCase().includes(q) ?? false)
                || (i.department?.toLowerCase().includes(q) ?? false)
            )
        })
    }, [items, query, flagFilter])

    const flaggedCount = items.filter(i => i.flags.length > 0).length
    const uniqueEmployees = stats.length
    const flaggedEmployees = stats.filter(s => s.inOfficeFlags > 0).length

    const exportCsv = () => {
        const header = ['วันที่-เวลา', 'รหัสพนักงาน', 'ชื่อ', 'แผนก', 'ปลายทาง/note', 'GPS lat', 'GPS lng', 'ห่างจากออฟฟิศ (ม.)', 'ข้อสังเกต']
        const rows = [
            header,
            ...filtered.map(i => [
                formatBangkokDateTime(i.checkedInAt),
                i.employeeCode ?? '',
                i.employeeNickname ? `${i.employeeName} (${i.employeeNickname})` : i.employeeName,
                i.department ?? '',
                i.note ?? '',
                i.latitude !== null ? String(i.latitude) : '',
                i.longitude !== null ? String(i.longitude) : '',
                i.distanceFromOffice !== null ? String(Math.round(i.distanceFromOffice)) : '',
                i.flags.map(f => FLAG_LABEL[f]?.label ?? f).join(' · '),
            ]),
        ]
        const csv = rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob(['﻿' + csv], { type: 'text/csv; charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `field-checkins-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <Briefcase size={22} className="text-amber-200" />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                        เช็คอินภาคสนาม / ออกประชุม
                    </h1>
                    <p className="text-sm text-white/65 mt-0.5">
                        ตรวจสอบการใช้ปุ่ม "ออกพื้นที่" ใน {windowDays} วันที่ผ่านมา · {items.length} รายการ
                    </p>
                </div>
                <button
                    type="button"
                    onClick={exportCsv}
                    disabled={filtered.length === 0}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-emerald-500/30"
                >
                    <Download size={14} />
                    <span className="hidden sm:inline">ดาวน์โหลด CSV</span>
                    <span className="sm:hidden">CSV</span>
                </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <StatCard label="รายการทั้งหมด" value={items.length} />
                <StatCard label="พนักงานที่ใช้" value={uniqueEmployees} />
                <StatCard
                    label="มีข้อสังเกต"
                    value={flaggedCount}
                    tone={flaggedCount > 0 ? 'warn' : undefined}
                />
                <StatCard
                    label="พนักงานที่ติดธง"
                    value={flaggedEmployees}
                    tone={flaggedEmployees > 0 ? 'danger' : undefined}
                />
            </div>

            {/* Per-employee table — quick glance for outliers */}
            {stats.length > 0 && (
                <section className="rounded-2xl border border-white/12 overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-white font-bold text-sm">สรุปต่อพนักงาน</p>
                        <p className="text-white/55 text-xs mt-0.5">
                            % คำนวณจากวันทำงาน {weekdaysInWindow} วัน (จันทร์-ศุกร์) ใน {windowDays} วัน — เกิน 30% ควรพูดคุยกับพนักงาน
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/[0.03]">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-semibold text-white/65">พนักงาน</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-white/65 hidden sm:table-cell">แผนก</th>
                                    <th className="text-right px-4 py-2.5 font-semibold text-white/65">ครั้ง</th>
                                    <th className="text-right px-4 py-2.5 font-semibold text-white/65">วัน</th>
                                    <th className="text-right px-4 py-2.5 font-semibold text-white/65">% วันทำงาน</th>
                                    <th className="text-right px-4 py-2.5 font-semibold text-white/65">🚩</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map(s => {
                                    const overdue = s.percentOfWeekdays > 30
                                    return (
                                        <tr key={s.employeeId}
                                            className="border-t border-white/5 hover:bg-white/[0.04]">
                                            <td className="px-4 py-2.5 text-white">
                                                {s.employeeName}
                                                {s.employeeNickname && <span className="text-white/45 ml-1">({s.employeeNickname})</span>}
                                            </td>
                                            <td className="px-4 py-2.5 text-white/60 hidden sm:table-cell">{s.department ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-right text-white/80 font-mono">{s.totalCheckins}</td>
                                            <td className="px-4 py-2.5 text-right text-white/80 font-mono">{s.uniqueDayCount}</td>
                                            <td className={cn(
                                                'px-4 py-2.5 text-right font-mono font-semibold',
                                                overdue ? 'text-red-300' : 'text-white/80',
                                            )}>
                                                {s.percentOfWeekdays}%
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                {s.inOfficeFlags > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-red-300 text-xs font-bold">
                                                        <AlertTriangle size={12} />
                                                        {s.inOfficeFlags}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* Filter row */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="ค้นหาชื่อ ปลายทาง หรือ note"
                        className="w-full h-10 pl-9 pr-3 rounded-lg bg-black/25 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-300/50"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setFlagFilter(f => f === 'all' ? 'flagged' : 'all')}
                    className={cn(
                        'shrink-0 px-3 h-10 rounded-lg text-xs font-bold border transition-colors',
                        flagFilter === 'flagged'
                            ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                            : 'bg-white/5 border-white/15 text-white/65 hover:bg-white/10',
                    )}
                >
                    {flagFilter === 'flagged' ? '🚩 มีธง' : 'ทั้งหมด'}
                </button>
            </div>

            {/* List of check-ins */}
            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/50 text-sm">
                    {items.length === 0
                        ? `ยังไม่มีการเช็คอินภาคสนามใน ${windowDays} วันที่ผ่านมา`
                        : 'ไม่พบรายการที่ตรงกับเงื่อนไข'}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(item => (
                        <FieldCheckinRow key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    )
}

function StatCard({
    label,
    value,
    tone,
}: {
    label: string
    value: number
    tone?: 'warn' | 'danger'
}) {
    const toneClass = tone === 'danger'
        ? 'border-red-400/35 bg-red-500/10'
        : tone === 'warn'
            ? 'border-amber-400/35 bg-amber-500/10'
            : 'border-white/12 bg-white/[0.04]'
    const valueClass = tone === 'danger'
        ? 'text-red-200'
        : tone === 'warn'
            ? 'text-amber-200'
            : 'text-white'
    return (
        <div className={cn('rounded-xl border p-3', toneClass)}>
            <p className="text-[11px] uppercase tracking-wider text-white/55 font-semibold mb-1">{label}</p>
            <p className={cn('text-2xl font-black tabular-nums leading-none', valueClass)}>{value}</p>
        </div>
    )
}

function FieldCheckinRow({ item }: { item: FieldCheckin }) {
    const mapsUrl = (item.latitude !== null && item.longitude !== null)
        ? `https://www.google.com/maps?q=${item.latitude},${item.longitude}`
        : null
    return (
        <div className={cn(
            'rounded-xl border p-3 flex flex-col gap-2',
            item.flags.includes('in_office')
                ? 'border-red-400/35 bg-red-500/[0.06]'
                : 'border-white/10 bg-white/[0.04]',
        )}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm leading-tight truncate">
                        {item.employeeName}
                        {item.employeeNickname && <span className="text-white/45 ml-1 font-normal">({item.employeeNickname})</span>}
                    </p>
                    <p className="text-white/55 text-xs mt-0.5">
                        {formatBangkokDateTime(item.checkedInAt)}
                        {item.department && <span className="text-white/35"> · {item.department}</span>}
                    </p>
                </div>
                {item.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                        {item.flags.map(f => {
                            const meta = FLAG_LABEL[f]
                            if (!meta) return null
                            return (
                                <span key={f}
                                    className={cn(
                                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                        meta.tone === 'danger'
                                            ? 'bg-red-500/20 text-red-200 border border-red-400/30'
                                            : 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
                                    )}>
                                    <AlertTriangle size={11} />
                                    {meta.label}
                                </span>
                            )
                        })}
                    </div>
                )}
            </div>

            {item.note && (
                <p className="text-white/85 text-sm leading-snug">
                    <span className="text-white/40 mr-1">📍</span>
                    {item.note}
                </p>
            )}

            <div className="flex items-center gap-3 text-[11px] text-white/55 flex-wrap">
                {item.distanceFromOffice !== null && (
                    <span>ห่างออฟฟิศ <span className="text-white font-mono">{Math.round(item.distanceFromOffice)}</span> ม.</span>
                )}
                {item.accuracyMeters !== null && (
                    <span>ความแม่นยำ ±{Math.round(item.accuracyMeters)} ม.</span>
                )}
                {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-200 hover:text-amber-100 transition-colors ml-auto">
                        <MapPin size={12} />
                        เปิดบนแผนที่
                    </a>
                )}
            </div>
        </div>
    )
}
