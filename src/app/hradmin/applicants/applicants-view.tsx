'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Users, Search, Filter, ChevronLeft, ChevronRight, X, Calendar,
    Clock, CheckCircle2, Hourglass, Eye, Loader2, FileText,
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
    draft:        { label: 'ร่าง',             chip: 'bg-white/10 text-white/70',         icon: Hourglass },
    submitted:    { label: 'ส่งแล้ว',           chip: 'bg-blue-500/25 text-blue-200',       icon: CheckCircle2 },
    reviewing:    { label: 'กำลังพิจารณา',     chip: 'bg-amber-500/25 text-amber-200',     icon: Clock },
    shortlisted:  { label: 'เข้ารอบ',          chip: 'bg-emerald-500/25 text-emerald-200', icon: CheckCircle2 },
    interviewed:  { label: 'สัมภาษณ์แล้ว',     chip: 'bg-purple-500/25 text-purple-200',   icon: CheckCircle2 },
    offered:      { label: 'เสนองาน',          chip: 'bg-emerald-500/25 text-emerald-200', icon: CheckCircle2 },
    rejected:     { label: 'ไม่ผ่าน',          chip: 'bg-red-500/25 text-red-200',         icon: X },
    withdrawn:    { label: 'ถอนใบสมัคร',       chip: 'bg-white/10 text-white/50',          icon: X },
}

const STATUS_TABS: Array<{ key: string; label: string }> = [
    { key: 'all',         label: 'ทั้งหมด' },
    { key: 'submitted',   label: 'ส่งแล้ว' },
    { key: 'reviewing',   label: 'กำลังพิจารณา' },
    { key: 'shortlisted', label: 'เข้ารอบ' },
    { key: 'interviewed', label: 'สัมภาษณ์' },
    { key: 'offered',     label: 'เสนองาน' },
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
        <div className="max-w-6xl mx-auto space-y-6">
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

            {/* Filter row */}
            <form onSubmit={onSubmitFilters} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <label className="sm:col-span-5 block">
                    <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
                        <Search size={11} /> ค้นหา
                    </span>
                    <input
                        type="search"
                        value={qDraft}
                        onChange={e => setQDraft(e.target.value)}
                        placeholder="ชื่อ / email / รหัสใบสมัคร"
                        className="w-full h-10 px-3 rounded-lg bg-black/20 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40"
                    />
                </label>
                <label className="sm:col-span-3 block">
                    <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
                        <Filter size={11} /> ตำแหน่ง
                    </span>
                    <input
                        type="text"
                        value={positionDraft}
                        onChange={e => setPositionDraft(e.target.value)}
                        placeholder="เช่น บัญชี"
                        className="w-full h-10 px-3 rounded-lg bg-black/20 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40"
                    />
                </label>
                <label className="sm:col-span-2 block">
                    <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
                        <Calendar size={11} /> ตั้งแต่
                    </span>
                    <input
                        type="date"
                        value={filters.from}
                        onChange={e => updateParams({ from: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-black/20 border border-white/15 text-white text-sm focus:outline-none focus:border-[#ad5f6c]"
                    />
                </label>
                <label className="sm:col-span-2 block">
                    <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-1.5">
                        <Calendar size={11} /> ถึง
                    </span>
                    <input
                        type="date"
                        value={filters.to}
                        onChange={e => updateParams({ to: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-black/20 border border-white/15 text-white text-sm focus:outline-none focus:border-[#ad5f6c]"
                    />
                </label>
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

            {/* Table */}
            <div className={cn('rounded-xl border border-white/10 overflow-hidden bg-white/[0.03]', isPending && 'opacity-60')}>
                {items.length === 0 ? (
                    <div className="py-16 text-center text-white/40">
                        <Users size={42} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">ยังไม่มีใบสมัครที่ตรงกับตัวกรอง</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-white/[0.04] text-white/55">
                                    <tr className="text-left">
                                        <th className="py-3 px-3 w-12 text-center">#</th>
                                        <th className="py-3 px-3 w-40 whitespace-nowrap">รหัส</th>
                                        <th className="py-3 px-3">ผู้สมัคร</th>
                                        <th className="py-3 px-3 w-48">ตำแหน่ง</th>
                                        <th className="py-3 px-3 w-32">สถานะ</th>
                                        <th className="py-3 px-3 w-44 whitespace-nowrap">ส่งเมื่อ</th>
                                        <th className="py-3 px-3 w-20 text-right">ดู</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((a, i) => {
                                        const meta = STATUS_META[a.application_status] ?? STATUS_META.draft
                                        const StatusIcon = meta.icon
                                        return (
                                            <tr
                                                key={a.id}
                                                onClick={() => router.push(`/hradmin/applicants/${a.id}`)}
                                                className="border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                <td className="py-3 px-3 text-white/40 text-center tabular-nums">{from + i}</td>
                                                <td className="py-3 px-3 text-amber-200 font-mono text-[13px] whitespace-nowrap">{a.reference_code}</td>
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-9 w-9 rounded-full overflow-hidden bg-white/10 border border-white/15 shrink-0">
                                                            {a.photo_url ? (
                                                                <img src={a.photo_url} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-white/70 font-bold text-sm">
                                                                    {initials(a)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-white font-semibold truncate">{fullName(a)}</p>
                                                            <p className="text-white/45 text-[12px] truncate">{a.email ?? '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-white/75 truncate max-w-[200px]">{a.position_applied ?? '—'}</td>
                                                <td className="py-3 px-3">
                                                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md', meta.chip)}>
                                                        <StatusIcon size={11} />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-white/65 whitespace-nowrap tabular-nums">
                                                    {a.submitted_at ? formatDateTime(a.submitted_at) : (
                                                        <span className="text-white/30 italic">— ยังไม่ส่ง</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <Link
                                                        href={`/hradmin/applicants/${a.id}`}
                                                        onClick={e => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/15 text-white/75 hover:text-white text-xs font-semibold transition-all"
                                                    >
                                                        <Eye size={13} />
                                                        ดู
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-white/5">
                            {items.map((a, i) => {
                                const meta = STATUS_META[a.application_status] ?? STATUS_META.draft
                                const StatusIcon = meta.icon
                                return (
                                    <Link
                                        key={a.id}
                                        href={`/hradmin/applicants/${a.id}`}
                                        className="block p-3 hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-[11px] text-white/35 tabular-nums">#{from + i}</span>
                                            <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md', meta.chip)}>
                                                <StatusIcon size={10} />
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full overflow-hidden bg-white/10 border border-white/15 shrink-0">
                                                {a.photo_url ? (
                                                    <img src={a.photo_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-white/70 font-bold text-sm">
                                                        {initials(a)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white font-semibold truncate">{fullName(a)}</p>
                                                <p className="text-white/55 text-xs truncate">{a.position_applied ?? '—'}</p>
                                                <p className="text-amber-200 text-[11px] font-mono mt-0.5">{a.reference_code}</p>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-[11px] text-white/45 inline-flex items-center gap-1">
                                            <Clock size={10} />
                                            {a.submitted_at ? `ส่งเมื่อ ${formatDateTime(a.submitted_at)}` : `บันทึกร่าง ${formatDateTime(a.last_saved_at ?? a.created_at)}`}
                                        </p>
                                    </Link>
                                )
                            })}
                        </div>
                    </>
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
