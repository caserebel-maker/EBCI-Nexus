'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Megaphone, AlertTriangle, AlertCircle, Info, Calendar, Archive, Filter, X, Clock,
    Eye, ChevronLeft, ChevronRight, Loader2, UserCircle, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteAnnouncement } from './actions'

interface Announcement {
    id: string
    headline: string
    content: string
    priority: string
    publish_date: string
    expires_at: string | null
    image_path: string | null
    imageUrl: string | null
    created_by?: string | null
    creator_name?: string | null
}

interface ArchivePayload {
    items: Announcement[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

interface Props {
    activeItems: Announcement[]
    initialArchive: ArchivePayload
    initialTab: 'active' | 'archive'
}

const PRIORITY_CONFIG: Record<string, {
    label: string
    icon: typeof AlertTriangle
    text: string
    chipBg: string
    chipText: string
    badgeBg: string
    badgeText: string
}> = {
    emergency: { label: 'ฉุกเฉิน', icon: AlertTriangle, text: 'text-red-300',    chipBg: 'bg-red-500/20',    chipText: 'text-red-200',    badgeBg: 'bg-red-600',    badgeText: 'text-white' },
    urgent:    { label: 'ด่วน',    icon: AlertCircle,   text: 'text-amber-300',  chipBg: 'bg-amber-500/20',  chipText: 'text-amber-200',  badgeBg: 'bg-yellow-400', badgeText: 'text-black' },
    promote:   { label: 'กิจกรรม', icon: Megaphone,     text: 'text-purple-300', chipBg: 'bg-purple-500/20', chipText: 'text-purple-200', badgeBg: 'bg-blue-500',   badgeText: 'text-white' },
    internal:  { label: 'ทั่วไป',  icon: Info,          text: 'text-blue-300',   chipBg: 'bg-blue-500/20',   chipText: 'text-blue-200',   badgeBg: 'bg-gray-500',   badgeText: 'text-white' },
}

const FILTERS = [
    { id: 'all',       label: 'ทั้งหมด' },
    { id: 'emergency', label: 'เร่งด่วน' },
    { id: 'urgent',    label: 'ด่วน' },
    { id: 'promote',   label: 'กิจกรรม' },
    { id: 'internal',  label: 'ทั่วไป' },
]

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
function formatThaiDate(iso: string): string {
    const d = new Date(iso); if (isNaN(d.getTime())) return ''
    return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}
function formatThaiShortDate(iso: string): string {
    const d = new Date(iso); if (isNaN(d.getTime())) return ''
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`
}
function formatHourMinute(iso: string): string {
    const d = new Date(iso); if (isNaN(d.getTime())) return ''
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function relativeTime(iso: string): string {
    const d = new Date(iso); if (isNaN(d.getTime())) return ''
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return 'เมื่อสักครู่'
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชม. ที่แล้ว`
    const days = Math.floor(diff / 86400)
    if (days < 7) return `${days} วันที่แล้ว`
    if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`
    return formatThaiDate(iso)
}

function PriorityBadge({ priority }: { priority: string }) {
    const c = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.internal
    const Icon = c.icon
    return (
        <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md', c.badgeBg, c.badgeText)}>
            <Icon size={11} />
            {c.label}
        </span>
    )
}

// ─── Modal (shared) ───────────────────────────────────────────────────────────
function AnnouncementModal({ a, onClose }: { a: Announcement; onClose: () => void }) {
    const c = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.internal
    const Icon = c.icon
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    }, [onClose])
    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl max-h-[85vh] overflow-y-auto relative border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                style={{ background: 'rgba(15,4,7,0.96)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '20px' }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all"
                    style={{ background: 'rgba(0,0,0,0.45)' }}
                    aria-label="ปิด"
                >
                    <X size={18} />
                </button>
                {a.imageUrl && (
                    <div className="w-full overflow-hidden bg-black/30" style={{ maxHeight: 400, borderRadius: '20px 20px 0 0' }}>
                        <img src={a.imageUrl} alt={a.headline} className="w-full h-auto object-cover" style={{ maxHeight: 400 }} />
                    </div>
                )}
                <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md', c.chipBg, c.chipText)}>
                            <Icon size={12} />
                            {c.label}
                        </span>
                        <span className="text-[11px] text-white/50 inline-flex items-center gap-1">
                            <Calendar size={11} />
                            เผยแพร่ {formatThaiDate(a.publish_date)}
                        </span>
                        {a.expires_at && (
                            <span className="text-[11px] text-white/40 inline-flex items-center gap-1">
                                <Clock size={11} />
                                หมดอายุ {formatThaiDate(a.expires_at)}
                            </span>
                        )}
                    </div>
                    <h2 className="text-white font-bold leading-snug" style={{ fontSize: '20px' }}>{a.headline}</h2>
                    <p className="text-[12px] text-white/55 inline-flex items-center gap-1.5">
                        <UserCircle size={14} />
                        โพสโดย: <span className="text-white/80 font-medium">{a.creator_name ?? 'ระบบ'}</span>
                    </p>
                    <p className="text-white/80 leading-relaxed whitespace-pre-wrap" style={{ fontSize: '15px' }}>
                        {a.content}
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─── Row action buttons (ดู + ลบ) ─────────────────────────────────────────────
function RowActions({
    a, onView, onDelete, deleting,
}: {
    a: Announcement
    onView: () => void
    onDelete: () => void
    deleting: boolean
}) {
    return (
        <div className="inline-flex items-center gap-1.5">
            <button
                type="button"
                onClick={e => { e.stopPropagation(); onView() }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/15 text-white/75 hover:text-white text-xs font-semibold transition-all"
                aria-label={`ดูประกาศ: ${a.headline}`}
            >
                <Eye size={13} />
                ดู
            </button>
            <button
                type="button"
                onClick={e => { e.stopPropagation(); onDelete() }}
                disabled={deleting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-500/15 hover:bg-red-500/30 text-red-200 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
                aria-label={`ลบประกาศ: ${a.headline}`}
            >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                ลบ
            </button>
        </div>
    )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange, disabled }: { page: number; totalPages: number; onChange: (p: number) => void; disabled?: boolean }) {
    if (totalPages <= 1) return null
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
    const btn = 'h-9 min-w-[36px] px-2 rounded-lg text-sm font-bold transition-colors inline-flex items-center justify-center gap-1'
    return (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <button onClick={() => onChange(page - 1)} disabled={disabled || page <= 1} className={cn(btn, 'bg-white/8 text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed')}>
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">ก่อนหน้า</span>
            </button>
            {pages.map((p, i) => p === '…'
                ? <span key={`dots-${i}`} className="text-white/30 px-1.5">…</span>
                : (
                    <button
                        key={p}
                        onClick={() => onChange(p)}
                        disabled={disabled || p === page}
                        className={cn(btn, p === page
                            ? 'bg-[#882136] text-white shadow-lg shadow-[#882136]/40'
                            : 'bg-white/8 text-white/70 hover:bg-white/15 hover:text-white')}
                    >
                        {p}
                    </button>
                )
            )}
            <button onClick={() => onChange(page + 1)} disabled={disabled || page >= totalPages} className={cn(btn, 'bg-white/8 text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed')}>
                <span className="hidden sm:inline">ถัดไป</span>
                <ChevronRight size={14} />
            </button>
        </div>
    )
}

// ─── Archive table + pagination ───────────────────────────────────────────────
function ArchiveView({
    initial, onRowClick, onDelete, deletingId,
}: {
    initial: ArchivePayload
    onRowClick: (a: Announcement) => void
    onDelete: (a: Announcement) => void
    deletingId: string | null
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [items, setItems] = useState<Announcement[]>(initial.items)
    const [page, setPage] = useState<number>(initial.page)
    const [pageSize] = useState<number>(initial.pageSize)
    const [totalPages, setTotalPages] = useState<number>(initial.totalPages)
    const [total, setTotal] = useState<number>(initial.total)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(page * pageSize, total)

    const loadPage = (next: number) => {
        if (next < 1 || next > totalPages || next === page) return
        setError(null)
        startTransition(async () => {
            try {
                const res = await fetch(`/api/announcements/archive?page=${next}&limit=${pageSize}`, { cache: 'no-store' })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json = await res.json()
                setItems(json.items ?? [])
                setPage(json.page)
                setTotalPages(json.totalPages)
                setTotal(json.total)
                const params = new URLSearchParams(searchParams?.toString() ?? '')
                params.set('tab', 'archive')
                params.set('page', String(json.page))
                router.replace(`/hradmin/announcements?${params.toString()}`, { scroll: false })
            } catch (e) {
                setError(e instanceof Error ? e.message : 'โหลดหน้าไม่สำเร็จ')
            }
        })
    }

    if (total === 0) {
        return (
            <div className="text-center py-16 text-white/40">
                <Archive size={48} className="mx-auto mb-3 opacity-30" />
                <p>ยังไม่มีประกาศเก่าในระบบ</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">{error}</div>
            )}

            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border border-white/10 overflow-hidden bg-white/[0.03]" aria-busy={isPending || undefined}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-white/[0.04] text-white/55">
                            <tr className="text-left">
                                <th className="py-3 px-3 w-12 text-center">ที่</th>
                                <th className="py-3 px-3">หัวข้อ</th>
                                <th className="py-3 px-3 w-28">ประเภท</th>
                                <th className="py-3 px-3 w-28 whitespace-nowrap">วันที่โพส</th>
                                <th className="py-3 px-3 w-20 whitespace-nowrap">เวลา</th>
                                <th className="py-3 px-3 w-40">ผู้โพส</th>
                                <th className="py-3 px-3 w-36 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className={cn('transition-opacity', isPending && 'opacity-50')}>
                            {items.map((a, i) => (
                                <tr
                                    key={a.id}
                                    onClick={() => onRowClick(a)}
                                    className="border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <td className="py-3 px-3 text-white/40 text-center tabular-nums">{from + i}</td>
                                    <td className="py-3 px-3 text-white font-medium max-w-md truncate">{a.headline}</td>
                                    <td className="py-3 px-3"><PriorityBadge priority={a.priority} /></td>
                                    <td className="py-3 px-3 text-white/70 whitespace-nowrap tabular-nums">{formatThaiShortDate(a.publish_date)}</td>
                                    <td className="py-3 px-3 text-white/70 whitespace-nowrap tabular-nums">{formatHourMinute(a.publish_date)}</td>
                                    <td className="py-3 px-3 text-white/60 truncate">{a.creator_name ?? '—'}</td>
                                    <td className="py-3 px-3 text-right">
                                        <RowActions
                                            a={a}
                                            onView={() => onRowClick(a)}
                                            onDelete={() => onDelete(a)}
                                            deleting={deletingId === a.id}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile cards */}
            <div className={cn('md:hidden space-y-2 transition-opacity', isPending && 'opacity-50')}>
                {items.map((a, i) => (
                    <div
                        key={a.id}
                        onClick={() => onRowClick(a)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-3 transition-all cursor-pointer"
                    >
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-[11px] text-white/40 tabular-nums">#{from + i}</span>
                            <PriorityBadge priority={a.priority} />
                        </div>
                        <p className="text-white font-semibold text-sm leading-snug mb-1.5 line-clamp-2">{a.headline}</p>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-white/55 mb-2">
                            <span className="inline-flex items-center gap-1">
                                <Calendar size={11} />
                                {formatThaiShortDate(a.publish_date)} · {formatHourMinute(a.publish_date)}
                            </span>
                            <span className="truncate max-w-[45%] text-white/45">{a.creator_name ?? '—'}</span>
                        </div>
                        <RowActions a={a} onView={() => onRowClick(a)} onDelete={() => onDelete(a)} deleting={deletingId === a.id} />
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-white/45 font-medium inline-flex items-center gap-2">
                    {isPending && <Loader2 size={12} className="animate-spin" />}
                    หน้า {page} จาก {totalPages} · แสดง {from}-{to} จากทั้งหมด {total} รายการ
                </p>
                <Pagination page={page} totalPages={totalPages} onChange={loadPage} disabled={isPending} />
            </div>
        </div>
    )
}

// ─── Main management view ─────────────────────────────────────────────────────
export function ManageAnnouncementsView({ activeItems, initialArchive, initialTab }: Props) {
    const router = useRouter()
    const [tab, setTab] = useState<'active' | 'archive'>(initialTab)
    const [filter, setFilter] = useState<string>('all')
    const [modalAnn, setModalAnn] = useState<Announcement | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [activeList, setActiveList] = useState<Announcement[]>(activeItems)

    const activeCount = activeList.length
    const archiveCount = initialArchive.total

    const filteredActive = useMemo(
        () => filter === 'all' ? activeList : activeList.filter(a => a.priority === filter),
        [activeList, filter],
    )

    const handleDelete = async (a: Announcement) => {
        if (!confirm(`ลบประกาศ "${a.headline}" ใช่หรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) return
        setDeletingId(a.id)
        try {
            const res = await deleteAnnouncement(a.id)
            if ('error' in res) {
                alert(res.error)
                return
            }
            // Optimistic: drop from active list + refresh server data for archive
            setActiveList(list => list.filter(x => x.id !== a.id))
            if (modalAnn?.id === a.id) setModalAnn(null)
            router.refresh()
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <>
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/5 w-full sm:w-max">
                {(['active', 'archive'] as const).map(key => {
                    const isOn = tab === key
                    const label = key === 'active' ? 'Active' : 'Archive'
                    const count = key === 'active' ? activeCount : archiveCount
                    const Icon = key === 'active' ? Megaphone : Archive
                    return (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={cn(
                                'flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-semibold transition-all inline-flex items-center justify-center gap-2',
                                isOn ? 'bg-[#882136] text-white shadow-lg shadow-[#882136]/40' : 'text-white/60 hover:text-white hover:bg-white/5',
                            )}
                        >
                            <Icon size={14} />
                            {label}
                            <span className={cn('text-[11px] px-1.5 py-0.5 rounded-md font-bold', isOn ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60')}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Filter chips — Active tab only */}
            {tab === 'active' && (
                <div className="flex items-center gap-2 flex-wrap mt-4">
                    <Filter size={14} className="text-white/40" />
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={cn(
                                'text-xs px-3 py-1.5 rounded-full font-semibold transition-all',
                                filter === f.id
                                    ? 'bg-[#882136] text-white shadow-lg shadow-[#882136]/40'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10',
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Active: simple row list with delete */}
            {tab === 'active' && (
                <div className="mt-6 space-y-2">
                    {filteredActive.length === 0 ? (
                        <div className="text-center py-16 text-white/40">
                            <Megaphone size={48} className="mx-auto mb-3 opacity-30" />
                            <p>ยังไม่มีประกาศ{filter !== 'all' ? 'ในหมวดนี้' : ''}</p>
                        </div>
                    ) : (
                        filteredActive.map(a => {
                            const c = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.internal
                            const Icon = c.icon
                            return (
                                <div
                                    key={a.id}
                                    onClick={() => setModalAnn(a)}
                                    className="w-full rounded-xl px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3 transition-all border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 cursor-pointer"
                                >
                                    <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', c.chipBg)}>
                                        <Icon size={16} className={c.text} />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <PriorityBadge priority={a.priority} />
                                            <span className="text-[11px] text-white/45 inline-flex items-center gap-1 whitespace-nowrap">
                                                <Clock size={10} />
                                                {relativeTime(a.publish_date)}
                                            </span>
                                        </div>
                                        <p className="text-white font-semibold truncate" style={{ fontSize: '14px' }}>{a.headline}</p>
                                        <p className="text-[11px] text-white/45 truncate">โดย {a.creator_name ?? '—'}</p>
                                    </div>
                                    <RowActions a={a} onView={() => setModalAnn(a)} onDelete={() => handleDelete(a)} deleting={deletingId === a.id} />
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* Archive */}
            {tab === 'archive' && (
                <div className="mt-6">
                    <ArchiveView
                        initial={initialArchive}
                        onRowClick={setModalAnn}
                        onDelete={handleDelete}
                        deletingId={deletingId}
                    />
                </div>
            )}

            {modalAnn && <AnnouncementModal a={modalAnn} onClose={() => setModalAnn(null)} />}
        </>
    )
}
