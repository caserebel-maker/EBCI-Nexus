'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Filter, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveTypeLite, BalancesFilterState } from './types'

interface Props {
    filters: BalancesFilterState
    leaveTypes: LeaveTypeLite[]
    departments: string[]
}

const LEVEL_OPTIONS = [
    { value: '5', label: 'L5' },
    { value: '4', label: 'L4' },
    { value: '3', label: 'L3' },
    { value: '2', label: 'L2' },
    { value: '1', label: 'L1' },
]

const QUICK_FILTERS: Array<{ value: string; label: string; hint: string }> = [
    { value: 'used_high', label: 'ใช้สิทธิ์เยอะ',    hint: 'ใช้ + pending เกิน 50% ของยอดรวม' },
    { value: 'unused',    label: 'ยังไม่ใช้สิทธิ์',    hint: 'used_days = 0 (แต่มียอดรวม)' },
    { value: 'adjusted',  label: 'ปรับแต่งเอง',      hint: 'is_manually_adjusted = true' },
]

/**
 * Filter bar for /hradmin/leave?tab=balances.
 * URL-driven — every change rewrites the querystring, server re-fetches.
 */
export function BalancesFilters({ filters, leaveTypes, departments }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [draftQ, setDraftQ] = useState(filters.q)

    const update = (updater: (params: URLSearchParams) => void) => {
        const next = new URLSearchParams(searchParams?.toString() ?? '')
        next.set('tab', 'balances')
        next.delete('page')
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

    const setQuick = (v: string) => {
        update(params => {
            const cur = params.get('filter') ?? ''
            if (cur === v) params.delete('filter')
            else params.set('filter', v)
        })
    }

    const clearAll = () => {
        setDraftQ('')
        startTransition(() => {
            const sp = new URLSearchParams()
            sp.set('tab', 'balances')
            // Preserve year param — filters shouldn't reset the year scope.
            const year = searchParams?.get('year')
            if (year) sp.set('year', year)
            router.replace(`${pathname}?${sp.toString()}`)
        })
    }

    const hasActive = filters.department.length > 0
        || filters.level.length > 0
        || filters.leave_type.length > 0
        || filters.q.length > 0
        || filters.quick.length > 0

    return (
        <div
            className="relative z-30 rounded-2xl border border-white/10 p-3 sm:p-4 space-y-3"
            style={{
                background: 'linear-gradient(160deg, rgba(60,15,20,0.95) 0%, rgba(86,30,35,0.92) 100%)',
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* Row 1: quick filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45 shrink-0">
                    <Sparkles size={12} /> ด่วน
                </span>
                {QUICK_FILTERS.map(qf => {
                    const active = filters.quick === qf.value
                    return (
                        <button
                            key={qf.value}
                            onClick={() => setQuick(qf.value)}
                            title={qf.hint}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                                active
                                    ? 'bg-amber-400 text-[#561e23] shadow'
                                    : 'bg-white/10 text-white/70 hover:bg-white/15',
                            )}
                        >
                            {qf.label}
                        </button>
                    )
                })}
                {isPending && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-200/80 ml-2">
                        <Loader2 size={13} className="animate-spin" />
                        กำลังโหลด
                    </span>
                )}
            </div>

            {/* Row 2: search + level pills */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
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

                <div className="inline-flex items-center gap-1 text-[11px] text-white/55">
                    <span>Level:</span>
                    {LEVEL_OPTIONS.map(l => {
                        const active = filters.level.includes(l.value)
                        return (
                            <button
                                key={l.value}
                                onClick={() => toggleInCsv('level', l.value)}
                                className={cn(
                                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-all',
                                    active
                                        ? 'bg-amber-400 text-[#561e23] shadow'
                                        : 'bg-white/5 text-white/65 hover:bg-white/10',
                                )}
                            >
                                {l.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Row 3: department + leave type multi-selects */}
            <div className="flex items-center gap-2 flex-wrap">
                <MultiSelectChip
                    label="แผนก"
                    icon={Filter}
                    options={departments.map(d => ({ value: d, label: d }))}
                    selected={filters.department}
                    onToggle={v => toggleInCsv('department', v)}
                    onClear={() => update(p => p.delete('department'))}
                />
                <MultiSelectChip
                    label="ประเภทลา"
                    icon={Filter}
                    options={leaveTypes.map(t => ({ value: t.id, label: t.name_th }))}
                    selected={filters.leave_type}
                    onToggle={v => toggleInCsv('leave_type', v)}
                    onClear={() => update(p => p.delete('leave_type'))}
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
        </div>
    )
}

function MultiSelectChip({
    label, icon: Icon, options, selected, onToggle, onClear,
}: {
    label: string
    icon: typeof Filter
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
                <Icon size={12} />
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
                        style={{ background: 'rgba(20,5,8,0.98)', backdropFilter: 'blur(14px)' }}
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
