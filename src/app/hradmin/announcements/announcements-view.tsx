'use client'

import { useState, useMemo } from 'react'
import { Search, Megaphone, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Styles ───────────────────────────────────────────────────────────────────
const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderTop: '1px solid rgba(255,255,255,0.30)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
}
const modalOverlay: React.CSSProperties = {
    background: 'rgba(10,2,4,0.75)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
}
const modalCard: React.CSSProperties = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(200,180,190,0.14) 40%, rgba(255,255,255,0.16) 100%), linear-gradient(145deg, rgba(86,30,35,0.72) 0%, rgba(60,15,20,0.88) 60%, rgba(100,35,45,0.72) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
    borderRadius: '1.25rem',
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITY_LABEL: Record<string, string> = {
    emergency: '⚠️ ฉุกเฉิน',
    urgent:    '🚨 ด่วน',
    promote:   '🎉 กิจกรรม',
    internal:  '📢 ภายในองค์กร',
}
const PRIORITY_COLOR: Record<string, string> = {
    emergency: 'bg-red-500/25 text-red-300 border-red-500/30',
    urgent:    'bg-amber-500/25 text-amber-300 border-amber-500/30',
    promote:   'bg-purple-500/25 text-purple-300 border-purple-500/30',
    internal:  'bg-blue-500/20 text-blue-300 border-blue-500/25',
}
const PRIORITY_GLOW: Record<string, string> = {
    emergency: 'hover:border-red-500/40',
    urgent:    'hover:border-amber-500/40',
    promote:   'hover:border-purple-500/40',
    internal:  'hover:border-blue-500/30',
}

const TABS = [
    { key: 'all',       label: 'ทั้งหมด' },
    { key: 'internal',  label: 'ภายในองค์กร' },
    { key: 'promote',   label: 'กิจกรรม' },
    { key: 'urgent',    label: '🚨 ด่วน' },
    { key: 'emergency', label: '⚠️ ฉุกเฉิน' },
]

const PAGE_SIZE = 12

// ─── Types ────────────────────────────────────────────────────────────────────
interface Announcement {
    id: string
    headline: string
    content: string
    priority: string
    publish_date: string
    image_url: string | null
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function AnnouncementModal({ item, onClose }: { item: Announcement; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={modalOverlay}
            onClick={onClose}
        >
            <div
                style={{ ...modalCard, maxHeight: '88vh' }}
                className="w-full max-w-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-white/10">
                    <div className="flex-1 min-w-0">
                        <span className={cn(
                            'inline-block text-[0.8rem] font-bold px-2.5 py-0.5 rounded-full border mb-2.5',
                            PRIORITY_COLOR[item.priority] ?? 'bg-white/10 text-white/50 border-white/10'
                        )}>
                            {PRIORITY_LABEL[item.priority] ?? item.priority}
                        </span>
                        <h2 className="text-[1.4rem] font-bold text-white leading-snug">{item.headline}</h2>
                        <p className="text-[0.95rem] text-white/45 mt-1">
                            {new Date(item.publish_date).toLocaleDateString('th-TH', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 pt-5 space-y-5">
                    {item.image_url && (
                        <img
                            src={item.image_url}
                            alt={item.headline}
                            className="w-full rounded-xl object-contain bg-black/30 max-h-72"
                        />
                    )}
                    <p className="text-[1.05rem] text-white/80 leading-[1.85] whitespace-pre-wrap">
                        {item.content}
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function AnnouncementCard({ item, onClick }: { item: Announcement; onClick: () => void }) {
    const preview = item.content.replace(/\n/g, ' ').slice(0, 120)
    return (
        <div
            style={glassCard}
            className={cn(
                'flex flex-col cursor-pointer transition-all duration-200',
                'hover:scale-[1.02] hover:brightness-110 border border-transparent',
                PRIORITY_GLOW[item.priority]
            )}
            onClick={onClick}
        >
            {/* Image */}
            {item.image_url && (
                <div className="h-44 w-full overflow-hidden rounded-t-2xl">
                    <img
                        src={item.image_url}
                        alt={item.headline}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
            <div className="flex flex-col flex-1 p-5 gap-3">
                {/* Badge + date */}
                <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                        'text-[0.75rem] font-bold px-2.5 py-0.5 rounded-full border shrink-0',
                        PRIORITY_COLOR[item.priority] ?? 'bg-white/10 text-white/50 border-white/10'
                    )}>
                        {PRIORITY_LABEL[item.priority] ?? item.priority}
                    </span>
                    <span className="text-[0.8rem] text-white/35 shrink-0">
                        {new Date(item.publish_date).toLocaleDateString('th-TH', {
                            day: 'numeric', month: 'short', year: '2-digit'
                        })}
                    </span>
                </div>
                {/* Headline */}
                <h3 className="text-[1.05rem] font-bold text-white leading-snug line-clamp-2">
                    {item.headline}
                </h3>
                {/* Preview */}
                <p className="text-[0.9rem] text-white/50 leading-relaxed line-clamp-2 flex-1">
                    {preview}{item.content.length > 120 ? '…' : ''}
                </p>
            </div>
        </div>
    )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
    if (total <= 1) return null

    const pages: (number | '…')[] = []
    if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i)
    } else {
        pages.push(1)
        if (current > 3) pages.push('…')
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
        if (current < total - 2) pages.push('…')
        pages.push(total)
    }

    const btn = (label: React.ReactNode, page: number | null, disabled = false, active = false) => (
        <button
            key={String(label)}
            onClick={() => page && onChange(page)}
            disabled={disabled || page === null}
            className={cn(
                'h-9 min-w-[36px] px-2 rounded-lg text-[0.9rem] font-bold transition-colors',
                active
                    ? 'bg-[#882136] text-white'
                    : 'bg-white/8 text-white/60 hover:bg-white/15 hover:text-white',
                (disabled || page === null) && 'opacity-40 cursor-not-allowed'
            )}
        >
            {label}
        </button>
    )

    return (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {btn(<ChevronLeft size={15} />, current - 1, current === 1)}
            {pages.map((p, i) =>
                p === '…'
                    ? <span key={`dots-${i}`} className="text-white/30 px-1">…</span>
                    : btn(p, p, false, p === current)
            )}
            {btn(<ChevronRight size={15} />, current + 1, current === total)}
        </div>
    )
}

// ─── Main View ────────────────────────────────────────────────────────────────
export function AnnouncementsView({ announcements }: { announcements: Announcement[] }) {
    const [search, setSearch] = useState('')
    const [tab, setTab]       = useState('all')
    const [page, setPage]     = useState(1)
    const [selected, setSelected] = useState<Announcement | null>(null)

    // Counts per tab
    const counts = useMemo(() => {
        const c: Record<string, number> = { all: announcements.length }
        for (const a of announcements) {
            c[a.priority] = (c[a.priority] ?? 0) + 1
        }
        return c
    }, [announcements])

    // Filter
    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return announcements.filter(a => {
            const matchTab = tab === 'all' || a.priority === tab
            const matchSearch = !q ||
                a.headline.toLowerCase().includes(q) ||
                a.content.toLowerCase().includes(q)
            return matchTab && matchSearch
        })
    }, [announcements, tab, search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage   = Math.min(page, totalPages)
    const slice      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    const handleTab = (key: string) => { setTab(key); setPage(1) }
    const handleSearch = (v: string) => { setSearch(v); setPage(1) }

    const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
    const to   = Math.min(safePage * PAGE_SIZE, filtered.length)

    return (
        // font-size: 120% of default → 1.2em cascade to all children
        <div className="space-y-6 pb-20" style={{ fontSize: '1.2em' }}>
            {selected && <AnnouncementModal item={selected} onClose={() => setSelected(null)} />}

            {/* Page header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20 shrink-0">
                    <Megaphone size={20} />
                </div>
                <div>
                    <h1 className="text-[1.3rem] font-black text-white tracking-tight">ประกาศข่าวสาร</h1>
                    <p className="text-[0.75rem] text-white/40">{announcements.length} ประกาศทั้งหมด</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[1em] w-[1em] text-white/40" />
                <input
                    type="text"
                    placeholder="ค้นหาประกาศ..."
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/15 bg-white/8 text-white placeholder:text-white/35 focus:outline-none focus:border-[#ad5f6c] focus:ring-1 focus:ring-[#ad5f6c]/40 transition-colors text-[0.9rem]"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => handleTab(t.key)}
                        className={cn(
                            'flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[0.8rem] font-bold whitespace-nowrap transition-all border shrink-0',
                            tab === t.key
                                ? 'bg-[#882136] text-white border-[#ad5f6c]/40 shadow-lg'
                                : 'bg-white/8 text-white/55 border-white/10 hover:bg-white/12 hover:text-white'
                        )}
                    >
                        {t.label}
                        <span className={cn(
                            'text-[0.7rem] font-black px-1.5 py-0.5 rounded-full min-w-[1.4em] text-center',
                            tab === t.key ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
                        )}>
                            {counts[t.key] ?? 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Grid */}
            {slice.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-white/30">
                    <Megaphone size={48} className="mb-4 opacity-40" />
                    <p className="text-[0.95rem] font-bold">ไม่พบประกาศ</p>
                    {search && <p className="text-[0.8rem] mt-1 opacity-70">ลองเปลี่ยนคำค้นหา</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {slice.map(a => (
                        <AnnouncementCard key={a.id} item={a} onClick={() => setSelected(a)} />
                    ))}
                </div>
            )}

            {/* Footer: count + pagination */}
            {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <p className="text-[0.8rem] text-white/35 font-medium">
                        แสดง {from}–{to} จาก {filtered.length} รายการ
                    </p>
                    <Pagination current={safePage} total={totalPages} onChange={setPage} />
                </div>
            )}
        </div>
    )
}
