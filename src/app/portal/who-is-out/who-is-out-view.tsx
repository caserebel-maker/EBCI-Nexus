'use client'

import { useState, useMemo } from 'react'
import { UserMinus, Home, Plane, Palmtree, Phone, MapPin, Filter, X, Sparkles } from 'lucide-react'
import { formatEmployeeName } from '@/lib/format-employee-name'

interface Entry {
    employeeId: string
    firstNameTh: string
    lastNameTh: string | null
    nickname: string | null
    department: string | null
    position: string | null
    kind: 'leave' | 'wfh' | 'field'
    statusLabel: string
    isHalfDay: boolean
    halfDayPeriod: 'morning' | 'afternoon' | null
    contact: string | null
    fieldNote: string | null
}

interface Props {
    initialEntries: Entry[]
}

const SECTION_META: Array<{
    key: 'wfh' | 'leave' | 'field'
    title: string
    Icon: React.ElementType
    color: string
    bg: string
    border: string
}> = [
    { key: 'wfh',   title: 'WFH',         Icon: Home,     color: '#93c5fd', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)' },
    { key: 'leave', title: 'ลา',          Icon: Palmtree, color: '#86efac', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)' },
    { key: 'field', title: 'ออกพื้นที่',  Icon: Plane,    color: '#fdba74', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)' },
]

export function WhoIsOutView({ initialEntries }: Props) {
    const [filter, setFilter] = useState<'all' | 'wfh' | 'leave' | 'field'>('all')
    const [deptFilter, setDeptFilter] = useState<string | null>(null)

    const departments = useMemo(() => {
        const set = new Set<string>()
        for (const e of initialEntries) {
            if (e.department) set.add(e.department)
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'))
    }, [initialEntries])

    const filtered = useMemo(() => {
        return initialEntries.filter(e => {
            if (filter !== 'all' && e.kind !== filter) return false
            if (deptFilter && e.department !== deptFilter) return false
            return true
        })
    }, [initialEntries, filter, deptFilter])

    const today = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    return (
        <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-24 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3 pt-2">
                <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(252,211,77,0.15)' }}
                >
                    <UserMinus size={20} className="text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold text-white">ใครไม่อยู่วันนี้</h1>
                    <p className="text-xs sm:text-sm text-white/60 mt-0.5">
                        {today} · รวม <strong className="text-white">{initialEntries.length}</strong> คน
                    </p>
                </div>
            </div>

            {/* Empty state — no one out */}
            {initialEntries.length === 0 && (
                <div
                    className="rounded-2xl p-8 text-center space-y-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <Sparkles size={24} className="mx-auto text-amber-300" />
                    <p className="text-white font-bold">ทุกคนอยู่ออฟฟิศวันนี้</p>
                    <p className="text-xs text-white/60">ไม่มีใครลา · WFH · หรือออกพื้นที่</p>
                </div>
            )}

            {/* Filters — only render when there's something to filter */}
            {initialEntries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <Filter size={14} className="text-white/55" />
                    <FilterChip
                        active={filter === 'all'}
                        label={`ทั้งหมด (${initialEntries.length})`}
                        onClick={() => setFilter('all')}
                    />
                    {SECTION_META.map(s => {
                        const count = initialEntries.filter(e => e.kind === s.key).length
                        if (count === 0) return null
                        return (
                            <FilterChip
                                key={s.key}
                                active={filter === s.key}
                                label={`${s.title} (${count})`}
                                onClick={() => setFilter(s.key)}
                                color={s.color}
                            />
                        )
                    })}
                    {departments.length > 1 && (
                        <select
                            value={deptFilter ?? ''}
                            onChange={(e) => setDeptFilter(e.target.value || null)}
                            className="ml-auto text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white"
                        >
                            <option value="">ทุกแผนก</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                    {(filter !== 'all' || deptFilter) && (
                        <button
                            onClick={() => { setFilter('all'); setDeptFilter(null) }}
                            className="inline-flex items-center gap-1 text-xs text-white/55 hover:text-white"
                        >
                            <X size={12} /> ล้าง
                        </button>
                    )}
                </div>
            )}

            {/* Sections */}
            {SECTION_META.map(s => {
                const items = filtered.filter(e => e.kind === s.key)
                if (items.length === 0) return null
                return (
                    <section key={s.key} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                            <s.Icon size={14} style={{ color: s.color }} />
                            <h2 className="text-sm font-bold" style={{ color: s.color }}>
                                {s.title} ({items.length})
                            </h2>
                        </div>
                        <div
                            className="rounded-2xl overflow-hidden divide-y divide-white/5"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            {items.map(e => <PersonRow key={`${e.employeeId}-${e.kind}`} entry={e} sectionStyle={s} />)}
                        </div>
                    </section>
                )
            })}

            {/* Filter-empty hint when filter is active but no rows match */}
            {initialEntries.length > 0 && filtered.length === 0 && (
                <div className="rounded-2xl p-6 text-center text-sm text-white/55"
                     style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    ไม่มีคนเข้าเงื่อนไขที่กรอง
                </div>
            )}
        </div>
    )
}

function FilterChip({ active, label, onClick, color }: {
    active: boolean
    label: string
    onClick: () => void
    color?: string
}) {
    return (
        <button
            onClick={onClick}
            className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
            style={{
                background: active ? (color ? `${color}26` : 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.05)',
                color: active ? (color ?? 'white') : 'rgba(255,255,255,0.65)',
                border: `1px solid ${active ? (color ? `${color}60` : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.1)'}`,
            }}
        >
            {label}
        </button>
    )
}

function PersonRow({
    entry: e,
    sectionStyle: s,
}: {
    entry: Entry
    sectionStyle: typeof SECTION_META[number]
}) {
    const display = formatEmployeeName({
        first_name_th: e.firstNameTh,
        last_name_th: e.lastNameTh,
        nickname: e.nickname,
    }, 'พนักงาน')

    return (
        <div className="px-4 py-3 flex items-start gap-3">
            <span
                className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
            >
                {(e.firstNameTh || e.lastNameTh || e.nickname || 'พนักงาน').charAt(0)}
            </span>
            <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm text-white font-semibold truncate">{display}</p>
                <p className="text-xs text-white/55 truncate">
                    {e.position && <>{e.position}</>}
                    {e.position && e.department && ' · '}
                    {e.department}
                </p>
                {/* Status + extras */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold"
                        style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                    >
                        <s.Icon size={11} />
                        {e.statusLabel}
                    </span>
                    {/* WFH contact (if provided by employee) */}
                    {e.kind === 'wfh' && e.contact && (
                        <span className="inline-flex items-center gap-1 text-xs text-white/70">
                            <Phone size={11} className="text-white/55" />
                            {e.contact}
                        </span>
                    )}
                    {/* Field destination */}
                    {e.kind === 'field' && e.fieldNote && (
                        <span className="inline-flex items-center gap-1 text-xs text-white/70">
                            <MapPin size={11} className="text-white/55" />
                            {e.fieldNote}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
