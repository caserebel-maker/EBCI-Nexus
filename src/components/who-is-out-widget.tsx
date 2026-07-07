'use client'

import { useEffect, useState, useMemo } from 'react'
import { UserMinus, ChevronRight, Loader2, Home, Plane, Palmtree, X, Phone, MapPin, Filter, Sparkles } from 'lucide-react'
import { formatEmployeeName } from '@/lib/format-employee-name'

/**
 * Compact dashboard card "ใครไม่อยู่วันนี้" + popup detail.
 *
 * Mounts on /portal/dashboard ABOVE เมนูลัด (Mod's 16 May position
 * adjustment — was higher up between today-banner and announcements,
 * but the dashboard reads "context → action": donut stats sit between
 * and this widget pairs nicely with the quick-menu shortcuts beneath).
 *
 * Click anywhere on the trigger card → opens a modal with the FULL
 * grouped list + filters. No navigation away from the dashboard
 * (Mod's call: "ไม่ต้องดันไปหน้าอื่น"). The standalone
 * /portal/who-is-out page still exists for direct linking from More
 * panel + bookmarks.
 *
 * Privacy + data shape are owned by the lib (src/lib/who-is-out.ts) —
 * see that file for the field-by-field rationale.
 */

type Kind = 'leave' | 'wfh' | 'field'

interface Entry {
    employeeId: string
    firstNameTh: string
    lastNameTh: string | null
    nickname: string | null
    department: string | null
    position: string | null
    workLocation: string | null
    kind: Kind
    statusLabel: string
    isHalfDay: boolean
    halfDayPeriod: 'morning' | 'afternoon' | null
    contact: string | null
    fieldNote: string | null
    photoUrl: string | null
}

const PREVIEW_COUNT = 4

function getWorkLocationBadge(workLocation: string | null) {
    if (workLocation === 'johnson') {
        return { label: 'จอห์นสัน', className: 'bg-orange-500/15 text-orange-200 border-orange-300/30', Icon: MapPin }
    }
    if (workLocation === 'saraburi') {
        return { label: 'สระบุรี (WFH)', className: 'bg-blue-500/15 text-blue-200 border-blue-300/30', Icon: Home }
    }
    return null
}

const KIND_STYLE: Record<Kind, { bg: string; color: string; border: string; Icon: React.ElementType }> = {
    leave: { bg: 'rgba(74,222,128,0.12)', color: '#86efac', border: 'rgba(74,222,128,0.3)', Icon: Palmtree },
    wfh:   { bg: 'rgba(96,165,250,0.12)', color: '#93c5fd', border: 'rgba(96,165,250,0.3)', Icon: Home },
    field: { bg: 'rgba(251,146,60,0.12)', color: '#fdba74', border: 'rgba(251,146,60,0.3)', Icon: Plane },
}

const SECTION_META: Array<{
    key: Kind
    title: string
    style: typeof KIND_STYLE[Kind]
}> = [
    { key: 'wfh',   title: 'WFH',         style: KIND_STYLE.wfh },
    { key: 'leave', title: 'ลา',          style: KIND_STYLE.leave },
    { key: 'field', title: 'ออกพื้นที่',  style: KIND_STYLE.field },
]

export function WhoIsOutWidget() {
    const [entries, setEntries] = useState<Entry[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch('/api/team/who-is-out', { cache: 'no-store' })
                if (!res.ok) throw new Error('fetch failed')
                const json = await res.json()
                if (!cancelled) setEntries(json.entries ?? [])
            } catch {
                if (!cancelled) setEntries([])  // soft-fail: hide widget on error
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [])

    // Lock body scroll while modal is open. Restore on close/unmount.
    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [open])

    // Esc to close — quality-of-life on desktop.
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    if (loading) {
        return (
            <div
                className="rounded-2xl p-3 flex items-center gap-2 text-white/40 text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
                <Loader2 size={14} className="animate-spin" />
                กำลังโหลด...
            </div>
        )
    }

    if (!entries || entries.length === 0) return null

    const previewEntries = entries.slice(0, PREVIEW_COUNT)
    const overflow = entries.length - previewEntries.length

    return (
        <>
            {/* ── Trigger card ─────────────────────────────────────── */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full text-left rounded-2xl overflow-hidden transition-colors active:scale-[0.99]"
                style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(6px)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <UserMinus size={16} className="text-amber-300" />
                        <span className="text-sm font-bold text-white">
                            ใครไม่อยู่วันนี้ <span className="text-white/55 font-normal">({entries.length} คน)</span>
                        </span>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-xs text-white/55">
                        ดูทั้งหมด <ChevronRight size={13} />
                    </span>
                </div>

                {/* Preview rows */}
                <div className="divide-y divide-white/5">
                    {previewEntries.map(e => {
                        const s = KIND_STYLE[e.kind]
                        const displayName = formatEmployeeName(e, 'พนักงาน')
                        const locationBadge = getWorkLocationBadge(e.workLocation)
                        return (
                            <div key={`${e.employeeId}-${e.kind}`} className="px-4 py-2.5 flex items-center gap-3">
                                {e.photoUrl ? (
                                    <img
                                        src={e.photoUrl}
                                        alt=""
                                        className="h-8 w-8 rounded-full object-cover shrink-0"
                                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                                    />
                                ) : (
                                    <span
                                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                        style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
                                    >
                                        {(e.nickname?.trim() || e.firstNameTh || e.lastNameTh || 'พนักงาน').charAt(0)}
                                    </span>
                                )}
                                <span className="text-sm text-white font-medium truncate flex-1">{displayName}</span>
                                {locationBadge && (
                                    <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold whitespace-nowrap shrink-0 border ${locationBadge.className}`}>
                                        <locationBadge.Icon size={10} />
                                        {locationBadge.label}
                                    </span>
                                )}
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold whitespace-nowrap shrink-0"
                                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                                >
                                    <s.Icon size={11} />
                                    {e.statusLabel}
                                </span>
                            </div>
                        )
                    })}

                    {overflow > 0 && (
                        <div className="block px-4 py-2.5 text-center text-xs text-white/55">
                            +{overflow} คน · แตะเพื่อดูทั้งหมด
                        </div>
                    )}
                </div>
            </button>

            {/* ── Popup modal ──────────────────────────────────────── */}
            {open && <WhoIsOutPopup entries={entries} onClose={() => setOpen(false)} />}
        </>
    )
}

// ─── Popup body ─────────────────────────────────────────────────────────
function WhoIsOutPopup({ entries, onClose }: { entries: Entry[]; onClose: () => void }) {
    const [filter, setFilter] = useState<'all' | Kind>('all')
    const [deptFilter, setDeptFilter] = useState<string | null>(null)

    const departments = useMemo(() => {
        const set = new Set<string>()
        for (const e of entries) {
            if (e.department) set.add(e.department)
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'))
    }, [entries])

    const filtered = useMemo(() => {
        return entries.filter(e => {
            if (filter !== 'all' && e.kind !== filter) return false
            if (deptFilter && e.department !== deptFilter) return false
            return true
        })
    }, [entries, filter, deptFilter])

    const today = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden overflow-x-hidden"
                style={{
                    background: 'rgba(50,15,20,0.97)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(8px)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header — sticky */}
                <div className="px-4 sm:px-5 py-3 border-b border-white/10 flex items-center gap-3 shrink-0">
                    <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(252,211,77,0.15)' }}
                    >
                        <UserMinus size={16} className="text-amber-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-white truncate">ใครไม่อยู่วันนี้</h2>
                        <p className="text-[11px] text-white/55 truncate">{today} · {entries.length} คน</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center shrink-0"
                        aria-label="ปิด"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-4 sm:px-5 py-3 border-b border-white/10 flex flex-wrap items-center gap-2 shrink-0">
                    <Filter size={13} className="text-white/55" />
                    <FilterChip
                        active={filter === 'all'}
                        label={`ทั้งหมด (${entries.length})`}
                        onClick={() => setFilter('all')}
                    />
                    {SECTION_META.map(s => {
                        const count = entries.filter(e => e.kind === s.key).length
                        if (count === 0) return null
                        return (
                            <FilterChip
                                key={s.key}
                                active={filter === s.key}
                                label={`${s.title} (${count})`}
                                onClick={() => setFilter(s.key)}
                                color={s.style.color}
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
                </div>

                {/* Scroll area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4 min-w-0">
                    {SECTION_META.map(s => {
                        const items = filtered.filter(e => e.kind === s.key)
                        if (items.length === 0) return null
                        return (
                            <section key={s.key} className="space-y-2 min-w-0">
                                <div className="flex items-center gap-2 px-1">
                                    <s.style.Icon size={13} style={{ color: s.style.color }} />
                                    <h3 className="text-xs font-bold" style={{ color: s.style.color }}>
                                        {s.title} ({items.length})
                                    </h3>
                                </div>
                                <div
                                    className="rounded-xl overflow-hidden divide-y divide-white/5 min-w-0"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    {items.map(e => <PersonRow key={`${e.employeeId}-${e.kind}`} entry={e} sectionStyle={s.style} />)}
                                </div>
                            </section>
                        )
                    })}

                    {filtered.length === 0 && (
                        <div
                            className="rounded-xl p-6 text-center space-y-2"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <Sparkles size={20} className="mx-auto text-amber-300" />
                            <p className="text-sm text-white/70">ไม่มีคนเข้าเงื่อนไขที่กรอง</p>
                        </div>
                    )}
                </div>
            </div>
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
            type="button"
            onClick={onClick}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
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
    sectionStyle: typeof KIND_STYLE[Kind]
}) {
    const display = formatEmployeeName(e, 'พนักงาน')
    const locationBadge = getWorkLocationBadge(e.workLocation)

    return (
        <div className="px-3 py-2.5 flex items-start gap-3 min-w-0">
            {e.photoUrl ? (
                <img
                    src={e.photoUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                    style={{ border: `1px solid ${s.border}` }}
                />
            ) : (
                <span
                    className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                >
                    {(e.firstNameTh || e.lastNameTh || e.nickname || 'พนักงาน').charAt(0)}
                </span>
            )}
            <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm text-white font-semibold truncate">{display}</p>
                {(e.position || e.department) && (
                    <p className="text-xs text-white/55 truncate">
                        {e.position}{e.position && e.department ? ' · ' : ''}{e.department}
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    {locationBadge && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold border ${locationBadge.className}`}>
                            <locationBadge.Icon size={11} />
                            {locationBadge.label}
                        </span>
                    )}
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold"
                        style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                    >
                        <s.Icon size={11} />
                        {e.statusLabel}
                    </span>
                    {e.kind === 'wfh' && e.contact && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/70 min-w-0 truncate">
                            <Phone size={10} className="text-white/55 shrink-0" />
                            <span className="truncate">{e.contact}</span>
                        </span>
                    )}
                    {e.kind === 'field' && e.fieldNote && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/70 min-w-0 truncate">
                            <MapPin size={10} className="text-white/55 shrink-0" />
                            <span className="truncate">{e.fieldNote}</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
