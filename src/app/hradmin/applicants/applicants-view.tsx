'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Users, Search, Filter, ChevronLeft, ChevronRight, X, Calendar,
    Clock, CheckCircle2, Hourglass, Loader2, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Applicant {
    id: string
    reference_code: string
    application_status: string
    current_step: number | null
    position_applied: string | null
    expected_salary: number | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    email: string | null
    phone_mobile: string | null
    photo_url: string | null
    created_at: string
    submitted_at: string | null
    last_saved_at: string | null
}

interface Filters {
    q: string
    status: string
    position: string
    from: string
    to: string
}

interface Props {
    items: Applicant[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    filters: Filters
    counts: Record<string, number>
}

const STATUS_META: Record<string, { label: string; chip: string; icon: typeof Hourglass }> = {
    draft:        { label: 'ร่าง',         chip: 'bg-white/20 text-white/85',          icon: Hourglass },
    submitted:    { label: 'ส่งแล้ว',       chip: 'bg-blue-500/80 text-white',           icon: CheckCircle2 },
    reviewing:    { label: 'กำลังพิจารณา', chip: 'bg-amber-500/85 text-black',          icon: Clock },
    shortlisted:  { label: 'เข้ารอบ',      chip: 'bg-purple-500/85 text-white',         icon: CheckCircle2 },
    interview:    { label: 'สัมภาษณ์',     chip: 'bg-indigo-500/85 text-white',         icon: CheckCircle2 },
    hired:        { label: 'เสนองาน',      chip: 'bg-emerald-500/90 text-white',        icon: CheckCircle2 },
    rejected:     { label: 'ไม่ผ่าน',      chip: 'bg-red-500/85 text-white',            icon: X },
    // Legacy values still in the DB (pre-Iteration-2 rename). Shown
    // with reasonable colors so existing rows don't look broken.
    interviewed:  { label: 'สัมภาษณ์แล้ว', chip: 'bg-indigo-500/85 text-white',         icon: CheckCircle2 },
    offered:      { label: 'เสนองาน',      chip: 'bg-emerald-500/90 text-white',        icon: CheckCircle2 },
    withdrawn:    { label: 'ถอนใบสมัคร',   chip: 'bg-white/10 text-white/50',           icon: X },
}

const STATUS_TABS: Array<{ key: string; label: string }> = [
    { key: 'all',         label: 'ทั้งหมด' },
    { key: 'submitted',   label: 'ส่งแล้ว' },
    { key: 'reviewing',   label: 'กำลังพิจารณา' },
    { key: 'shortlisted', label: 'เข้ารอบ' },
    { key: 'interview',   label: 'สัมภาษณ์' },
    { key: 'hired',       label: 'เสนองาน' },
    { key: 'draft',       label: 'ร่าง' },
    { key: 'rejected',    label: 'ไม่ผ่าน' },
]

function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear() + 543
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function fullName(a: Applicant): string {
    const base = `${a.first_name_th ?? ''} ${a.last_name_th ?? ''}`.trim()
    return a.nickname ? `${base || 'ไม่ระบุชื่อ'} (${a.nickname})` : base || 'ไม่ระบุชื่อ'
}

function initials(a: Applicant): string {
    const first = (a.first_name_th ?? a.nickname ?? 'U')[0]
    return String(first).toUpperCase()
}

export function ApplicantsListView({
    items, total, page, pageSize, totalPages, filters, counts,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [qDraft, setQDraft] = useState(filters.q)
    const [positionDraft, setPositionDraft] = useState(filters.position)

    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, total)

    const updateParams = (patch: Partial<Filters & { page: number }>) => {
        const params = new URLSearchParams()
        const next = { ...filters, page, ...patch }
        if (next.q) params.set('q', next.q)
        if (next.status && next.status !== 'all') params.set('status', next.status)
        if (next.position) params.set('position', next.position)
        if (next.from) params.set('from', next.from)
        if (next.to) params.set('to', next.to)
        // reset page on filter change
        const resetPage = patch.page === undefined && Object.keys(patch).some(k => k !== 'page')
        const targetPage = resetPage ? 1 : (patch.page ?? page)
        if (targetPage > 1) params.set('page', String(targetPage))
        startTransition(() => {
            router.push(`/hradmin/applicants${params.toString() ? `?${params.toString()}` : ''}`)
        })
    }

    const onSubmitFilters = (e: React.FormEvent) => {
        e.preventDefault()
        updateParams({ q: qDraft.trim(), position: positionDraft.trim() })
    }

    const pagesList = useMemo(() => {
        const pages: (number | '…')[] = []
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            pages.push(1)
            if (page > 3) pages.push('…')
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
            if (page < totalPages - 2) pages.push('…')
            pages.push(totalPages)
        }
        return pages
    }, [page, totalPages])

    return (
        /* overflow-x-hidden is the final guard so a misbehaved native
           control (iOS date picker, long Thai placeholder) can never make
           the page scroll horizontally while the user scrolls vertically. */
        <div className="max-w-6xl mx-auto space-y-6 overflow-x-hidden">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">ผู้สมัคร</h1>
                        <p className="text-sm text-white/50">
                            ทั้งหมด {counts.all ?? 0} ใบสมัคร · ส่งแล้ว {counts.submitted ?? 0} · ร่าง {counts.draft ?? 0}
                        </p>
                    </div>
                </div>
                <Link
                    href="/careers"
                    target="_blank"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-lg border border-white/15 transition-all"
                >
                    <FileText size={15} />
                    เปิดหน้า Careers (สาธารณะ)
                </Link>
            </div>

            {/* Status tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {STATUS_TABS.map(t => {
                    const active = (filters.status || 'all') === t.key
                    const count = counts[t.key] ?? 0
                    return (
                        <button
                            key={t.key}
                            onClick={() => updateParams({ status: t.key })}
                            disabled={isPending}
                            className={cn(
                                'text-xs px-3 py-1.5 rounded-full font-semibold transition-all inline-flex items-center gap-1.5',
                                active
                                    ? 'bg-[#882136] text-white shadow-lg shadow-[#882136]/40'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10',
                            )}
                        >
                            {t.label}
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', active ? 'bg-white/20' : 'bg-white/10')}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Filter row.
                Three things were wrong on mobile:
                  1. Native <input type="date"> has an intrinsic min-width
                     bigger than the viewport on iOS Safari, which made the
                     whole form overflow horizontally and "wobble" while
                     scrolling. `min-w-0` on the labels breaks that floor.
                  2. Date inputs were on `sm:col-span-2` (1/6 width) but
                     stacked full-width on mobile — visually fine, but the
                     intrinsic min-width still pushed them past the screen.
                     Now they share a row at `grid-cols-2` on mobile so each
                     date sits at half width with `min-w-0`.
                  3. Labels at text-[11px] were unreadable on mobile —
                     bumped to text-sm with the icon scaling to match. */}
            <form
                onSubmit={onSubmitFilters}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
                <label className="sm:col-span-5 block min-w-0">
                    <span className="text-sm sm:text-[11px] text-white/65 sm:text-white/50 sm:uppercase sm:tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
                        <Search size={14} className="sm:w-3 sm:h-3" /> ค้นหา
                    </span>
                    <input
                        type="search"
                        value={qDraft}
                        onChange={e => setQDraft(e.target.value)}
                        placeholder="ชื่อ / email / รหัสใบสมัคร"
                        className="w-full h-10 px-3 rounded-lg bg-black/20 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40"
                    />
                </label>
                <label className="sm:col-span-3 block min-w-0">
                    <span className="text-sm sm:text-[11px] text-white/65 sm:text-white/50 sm:uppercase sm:tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
                        <Filter size={14} className="sm:w-3 sm:h-3" /> ตำแหน่ง
                    </span>
                    <input
                        type="text"
                        value={positionDraft}
                        onChange={e => setPositionDraft(e.target.value)}
                        placeholder="เช่น บัญชี"
                        className="w-full h-10 px-3 rounded-lg bg-black/20 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40"
                    />
                </label>

                {/* Date pair shares one row on mobile (grid-cols-2) so neither
                    input can blow past the viewport, and matches the same row
                    visual on desktop where each takes col-span-2. */}
                <div className="grid grid-cols-2 gap-3 sm:contents min-w-0">
                    <label className="sm:col-span-2 block min-w-0">
                        <span className="text-sm sm:text-[11px] text-white/65 sm:text-white/50 sm:uppercase sm:tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
                            <Calendar size={14} className="sm:w-3 sm:h-3" /> ตั้งแต่
                        </span>
                        <input
                            type="date"
                            value={filters.from}
                            onChange={e => updateParams({ from: e.target.value })}
                            className="w-full min-w-0 h-10 px-3 rounded-lg bg-black/20 border border-white/15 text-white text-sm focus:outline-none focus:border-[#ad5f6c]"
                        />
                    </label>
                    <label className="sm:col-span-2 block min-w-0">
                        <span className="text-sm sm:text-[11px] text-white/65 sm:text-white/50 sm:uppercase sm:tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
                            <Calendar size={14} className="sm:w-3 sm:h-3" /> ถึง
                        </span>
                        <input
                            type="date"
                            value={filters.to}
                            onChange={e => updateParams({ to: e.target.value })}
                            className="w-full min-w-0 h-10 px-3 rounded-lg bg-black/20 border border-white/15 text-white text-sm focus:outline-none focus:border-[#ad5f6c]"
                        />
                    </label>
                </div>
                <div className="sm:col-span-12 flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="h-10 px-4 rounded-lg bg-[#882136] hover:bg-[#a02640] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                    >
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        ค้นหา
                    </button>
                    {(filters.q || filters.position || filters.from || filters.to || (filters.status && filters.status !== 'all')) && (
                        <button
                            type="button"
                            onClick={() => {
                                setQDraft('')
                                setPositionDraft('')
                                startTransition(() => router.push('/hradmin/applicants'))
                            }}
                            className="h-10 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold inline-flex items-center gap-1.5"
                        >
                            <X size={14} /> ล้าง
                        </button>
                    )}
                </div>
            </form>

            {/* Card grid */}
            <div className={cn('transition-opacity', isPending && 'opacity-60')}>
                {items.length === 0 ? (
                    <div className="py-16 text-center text-white/40 rounded-xl border border-white/10 bg-white/[0.03]">
                        <Users size={42} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">ยังไม่มีใบสมัครที่ตรงกับตัวกรอง</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                        {items.map(a => (
                            <ApplicantCard key={a.id} a={a} />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer: summary + pagination */}
            {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-white/45 font-medium">
                        หน้า {page} จาก {totalPages} · แสดง {from}-{to} จากทั้งหมด {total} รายการ
                    </p>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={() => updateParams({ page: page - 1 })}
                                disabled={isPending || page <= 1}
                                className="h-9 min-w-[36px] px-2 rounded-lg bg-white/8 text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 text-sm font-bold"
                            >
                                <ChevronLeft size={14} />
                                <span className="hidden sm:inline">ก่อนหน้า</span>
                            </button>
                            {pagesList.map((p, i) => p === '…'
                                ? <span key={`dots-${i}`} className="text-white/30 px-1.5">…</span>
                                : (
                                    <button
                                        key={p}
                                        onClick={() => updateParams({ page: p })}
                                        disabled={isPending || p === page}
                                        className={cn(
                                            'h-9 min-w-[36px] px-2 rounded-lg text-sm font-bold',
                                            p === page
                                                ? 'bg-[#882136] text-white shadow-lg shadow-[#882136]/40'
                                                : 'bg-white/8 text-white/70 hover:bg-white/15 hover:text-white',
                                        )}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                            <button
                                onClick={() => updateParams({ page: page + 1 })}
                                disabled={isPending || page >= totalPages}
                                className="h-9 min-w-[36px] px-2 rounded-lg bg-white/8 text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 text-sm font-bold"
                            >
                                <span className="hidden sm:inline">ถัดไป</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Applicant card ─────────────────────────────────────────────────────────
/**
 * Vertical 3:4 card used in the grid. Photo fills the frame with a
 * maroon gradient fallback + large initial when there's no photo_url.
 * Status pill top-right, 4-line overlay bottom (name / position /
 * reference code / submitted-at). Whole card links to the detail page.
 */
function ApplicantCard({ a }: { a: Applicant }) {
    const meta = STATUS_META[a.application_status] ?? STATUS_META.draft
    const StatusIcon = meta.icon
    const name = fullName(a)
    const submittedLine = a.submitted_at
        ? `ส่งเมื่อ ${formatDateTime(a.submitted_at)}`
        : `บันทึกร่าง ${formatDateTime(a.last_saved_at ?? a.created_at)}`
    return (
        <Link
            href={`/hradmin/applicants/${a.id}`}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-all"
            aria-label={`ดูใบสมัครของ ${name}`}
        >
            {/* Photo / fallback */}
            {a.photo_url ? (
                <img
                    src={a.photo_url}
                    alt={name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
            ) : (
                <div
                    className="absolute inset-0 flex items-center justify-center text-white/30 text-6xl font-bold"
                    style={{ background: 'linear-gradient(135deg,#561e23 0%,#882136 100%)' }}
                >
                    {initials(a)}
                </div>
            )}

            {/* Status badge — top right */}
            <span
                className={cn(
                    'absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-md',
                    meta.chip,
                )}
            >
                <StatusIcon size={11} />
                {meta.label}
            </span>

            {/* Bottom gradient overlay (fills lower half for readability) */}
            <div
                className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 100%)' }}
            />

            {/* Text content — 4 lines */}
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
                <p className="font-bold text-[15px] sm:text-base leading-tight mb-0.5 line-clamp-1 drop-shadow">
                    {name}
                </p>
                <p className="text-[12px] sm:text-sm text-white/90 line-clamp-1 drop-shadow">
                    {a.position_applied ?? '—'}
                </p>
                <p className="text-[11px] font-mono text-amber-200 tracking-wider mt-0.5 drop-shadow">
                    {a.reference_code}
                </p>
                <p className="text-[10px] text-white/75 mt-0.5 line-clamp-1">
                    {submittedLine}
                </p>
            </div>
        </Link>
    )
}
