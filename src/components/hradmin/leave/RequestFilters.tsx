'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Filter, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    STATUS_META, STATUS_ORDER,
    type LeaveTypeLite, type RequestsFilterState,
} from './types'

interface Props {
    filters: RequestsFilterState
    leaveTypes: LeaveTypeLite[]
    departments: string[]
}

/**
 * Top-of-table filter bar. URL-driven: every change rewrites the
 * querystring via router.replace — the server then re-fetches + the
 * table re-renders with the new slice.
 *
 * useTransition keeps the bar responsive during the RSC round-trip so
 * a click doesn't feel frozen. Dirty local state is shown immediately
 * while the server catches up.
 */
export function RequestFilters({ filters, leaveTypes, departments }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [draftQ, setDraftQ] = useState(filters.q)

    const update = (updater: (params: URLSearchParams) => void) => {
        const next = new URLSearchParams(searchParams?.toString() ?? '')
        next.set('tab', 'requests')
        next.delete('page') // any filter change resets to page 1
        updater(next)
        startTransition(() => {
            router.replace(`${pathname}?${next.toString()}`)
        })
    }

    const toggleInCsv = (key: string, value: string) => {
        update(params => {
            const current = (params.get(key) ?? '').split(',').filter(Boolean)
            const next = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value]
            if (next.length === 0) params.delete(key)
            else params.set(key, next.join(','))
        })
    }

    const submitSearch = () => {
        update(params => {
            if (draftQ.trim()) params.set('q', draftQ.trim())
            else params.delete('q')
        })
    }

    const setRange = (key: 'from' | 'to', value: string) => {
        update(params => {
            if (value) params.set(key, value)
            else params.delete(key)
        })
    }

    const clearAll = () => {
        setDraftQ('')
        startTransition(() => {
            router.replace(`${pathname}?tab=requests`)
        })
    }

    const hasActive = filters.status.length > 0
        || filters.leave_type.length > 0
        || filters.department.length > 0
        || filters.q.length > 0

    return (
        <div
            className="rounded-2xl border border-white/10 p-3 sm:p-4 space-y-3"
            style={{
                background: 'linear-gradient(160deg, rgba(60,15,20,0.95) 0%, rgba(86,30,35,0.92) 100%)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* Row 1: status chips */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45 shrink-0">
                    <Filter size={12} /> สถานะ
                </span>
                <button
                    onClick={() => update(p => p.delete('status'))}
                    className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                        filters.status.length === 0
                            ? 'bg-white text-[#561e23] shadow'
                            : 'bg-white/10 text-white/70 hover:bg-white/15',
                    )}
                >
                    ทั้งหมด
                </button>
                {STATUS_ORDER.map(s => {
                    const active = filters.status.includes(s)
                    const meta = STATUS_META[s]
                    return (
                        <button
                            key={s}
                            onClick={() => toggleInCsv('status', s)}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                                active ? 'text-white shadow' : 'text-white/70 hover:text-white',
                            )}
                            style={{
                                background: active ? meta.bg : 'rgba(255,255,255,0.08)',
                                boxShadow: active ? `0 0 0 1px ${meta.ring}` : undefined,
                                color: active ? meta.color : undefined,
                            }}
                        >
                            {meta.label}
                        </button>
                    )
                })}
            </div>

            {/* Row 2: search + date range + loading indicator */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        value={draftQ}
                        onChange={e => setDraftQ(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submitSearch()}
                        onBlur={submitSearch}
                        placeholder="ค้นหาพนักงาน (ชื่อเล่น/รหัส)"
                        className="w-full pl-9 pr-8 h-9 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/35 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300/40"
                    />
                    {draftQ && (
                        <button
                            onClick={() => { setDraftQ(''); update(p => p.delete('q')) }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                <label className="inline-flex items-center gap-1.5 text-xs text-white/65">
                    <CalendarIcon size={13} className="text-white/45" />
                    <span className="shrink-0">จาก</span>
                    <input
                        type="date"
                        value={filters.from}
                        onChange={e => setRange('from', e.target.value)}
                        className="h-9 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-300/40"
                    />
                    <span className="shrink-0">ถึง</span>
                    <input
                        type="date"
                        value={filters.to}
                        onChange={e => setRange('to', e.target.value)}
                        className="h-9 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-300/40"
                    />
                </label>

                {isPending && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-200/80">
                        <Loader2 size={13} className="animate-spin" />
                        กำลังโหลด
                    </span>
                )}
            </div>

            {/* Row 3: leave type + department multi-selects as dropdown chips */}
            <div className="flex items-center gap-2 flex-wrap">
                <MultiSelectChip
                    label="ประเภทลา"
                    options={leaveTypes.map(t => ({ value: t.id, label: t.name_th }))}
                    selected={filters.leave_type}
                    onToggle={v => toggleInCsv('leave_type', v)}
                    onClear={() => update(p => p.delete('leave_type'))}
                />
                <MultiSelectChip
                    label="แผนก"
                    options={departments.map(d => ({ value: d, label: d }))}
                    selected={filters.department}
                    onToggle={v => toggleInCsv('department', v)}
                    onClear={() => update(p => p.delete('department'))}
                />
                {hasActive && (
                    <button
                        onClick={clearAll}
                        className="ml-auto inline-flex items-center gap-1 text-xs text-white/60 hover:text-white underline decoration-dotted"
                    >
                        ล้างตัวกรองทั้งหมด
                    </button>
                )}
            </div>

            {/* Active-filter chips */}
            {hasActive && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/35 font-bold">กำลังกรอง:</span>
                    {filters.q && (
                        <ActiveChip label={`"${filters.q}"`} onRemove={() => { setDraftQ(''); update(p => p.delete('q')) }} />
                    )}
                    {filters.status.map(s => (
                        <ActiveChip key={s} label={STATUS_META[s]?.label ?? s} onRemove={() => toggleInCsv('status', s)} />
                    ))}
                    {filters.leave_type.map(lt => (
                        <ActiveChip
                            key={lt}
                            label={leaveTypes.find(t => t.id === lt)?.name_th ?? lt}
                            onRemove={() => toggleInCsv('leave_type', lt)}
                        />
                    ))}
                    {filters.department.map(d => (
                        <ActiveChip key={d} label={d} onRemove={() => toggleInCsv('department', d)} />
                    ))}
                </div>
            )}
        </div>
    )
}

function MultiSelectChip({
    label, options, selected, onToggle, onClear,
}: {
    label: string
    options: Array<{ value: string; label: string }>
    selected: string[]
    onToggle: (v: string) => void
    onClear: () => void
}) {
    const [open, setOpen] = useState(false)
    const count = selected.length
    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                    count > 0
                        ? 'bg-amber-400/95 text-[#561e23] shadow'
                        : 'bg-white/10 text-white/70 hover:bg-white/15',
                )}
            >
                {label}
                {count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#561e23]/90 text-amber-200 text-[10px] px-1">
                        {count}
                    </span>
                )}
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        className="absolute top-full left-0 mt-2 z-50 w-64 max-h-72 overflow-y-auto rounded-xl border border-white/15 shadow-2xl"
                        style={{
                            background: 'rgba(20,5,8,0.98)',
                            backdropFilter: 'blur(14px)',
                        }}
                    >
                        <div className="sticky top-0 px-3 py-2 border-b border-white/10 flex items-center justify-between bg-[rgba(20,5,8,0.98)]">
                            <span className="text-[11px] text-white/55 font-bold uppercase tracking-wider">{label}</span>
                            {count > 0 && (
                                <button
                                    onClick={onClear}
                                    className="text-[11px] text-white/55 hover:text-white underline decoration-dotted"
                                >
                                    ล้าง
                                </button>
                            )}
                        </div>
                        {options.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-white/40 text-center">ไม่มีตัวเลือก</p>
                        ) : (
                            <div className="py-1">
                                {options.map(opt => {
                                    const active = selected.includes(opt.value)
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => onToggle(opt.value)}
                                            className={cn(
                                                'flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors',
                                                active
                                                    ? 'bg-amber-400/20 text-amber-100'
                                                    : 'text-white/75 hover:bg-white/5 hover:text-white',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                                                    active ? 'bg-amber-400 border-amber-300' : 'border-white/25',
                                                )}
                                            >
                                                {active && <span className="text-[#561e23] text-[9px] font-black">✓</span>}
                                            </span>
                                            <span className="truncate">{opt.label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-400/15 text-amber-200 border border-amber-300/20">
            {label}
            <button
                onClick={onRemove}
                className="p-0.5 rounded-full hover:bg-amber-300/20"
                aria-label="ลบตัวกรอง"
            >
                <X size={10} />
            </button>
        </span>
    )
}
