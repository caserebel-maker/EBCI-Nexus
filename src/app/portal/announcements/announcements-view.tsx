'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    Megaphone, AlertTriangle, AlertCircle, Info, Calendar, Archive, Filter, X, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Announcement {
    id: string
    headline: string
    content: string
    priority: string
    publish_date: string
    expires_at: string | null
    image_path: string | null
    imageUrl: string | null
}

const PRIORITY_CONFIG: Record<string, {
    label: string
    icon: typeof AlertTriangle
    text: string
    dot: string
    chipBg: string
    chipText: string
}> = {
    emergency: { label: 'ฉุกเฉิน', icon: AlertTriangle, text: 'text-red-300',    dot: 'bg-red-400',    chipBg: 'bg-red-500/20',    chipText: 'text-red-200' },
    urgent:    { label: 'ด่วน',    icon: AlertCircle,   text: 'text-amber-300',  dot: 'bg-amber-400',  chipBg: 'bg-amber-500/20',  chipText: 'text-amber-200' },
    promote:   { label: 'กิจกรรม', icon: Megaphone,     text: 'text-purple-300', dot: 'bg-purple-400', chipBg: 'bg-purple-500/20', chipText: 'text-purple-200' },
    internal:  { label: 'ทั่วไป',  icon: Info,          text: 'text-blue-300',   dot: 'bg-blue-400',   chipBg: 'bg-blue-500/20',   chipText: 'text-blue-200' },
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
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

function relativeTime(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const diffSec = (Date.now() - d.getTime()) / 1000
    if (diffSec < 60) return 'เมื่อสักครู่'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} นาทีที่แล้ว`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ชม. ที่แล้ว`
    const days = Math.floor(diffSec / 86400)
    if (days < 7) return `${days} วันที่แล้ว`
    if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`
    return formatThaiDate(iso)
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function AnnouncementRow({ a, onClick }: { a: Announcement; onClick: () => void }) {
    const config = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.internal
    const Icon = config.icon
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left rounded-xl px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3 transition-all border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-[0.99]"
        >
            <span
                className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                    config.chipBg,
                )}
            >
                <Icon size={16} className={config.text} />
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', config.chipBg, config.chipText)}>
                        {config.label}
                    </span>
                    <span className="text-[11px] text-white/45 inline-flex items-center gap-1 whitespace-nowrap">
                        <Clock size={10} />
                        {relativeTime(a.publish_date)}
                    </span>
                </div>
                <p className="text-white font-semibold truncate" style={{ fontSize: '14px' }}>
                    {a.headline}
                </p>
            </div>
        </button>
    )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function AnnouncementModal({ a, onClose }: { a: Announcement; onClose: () => void }) {
    const config = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.internal
    const Icon = config.icon

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        // Prevent body scroll while modal open
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto relative border border-white/10"
                style={{
                    background: 'rgba(15,4,7,0.96)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderRadius: '20px 20px 0 0',
                }}
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
                        <img
                            src={a.imageUrl}
                            alt={a.headline}
                            className="w-full h-auto object-cover"
                            style={{ maxHeight: 400 }}
                        />
                    </div>
                )}

                <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md', config.chipBg, config.chipText)}>
                            <Icon size={12} />
                            {config.label}
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
                    <h2 className="text-white font-bold leading-snug" style={{ fontSize: '20px' }}>
                        {a.headline}
                    </h2>
                    <p className="text-white/80 leading-relaxed whitespace-pre-wrap" style={{ fontSize: '15px' }}>
                        {a.content}
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─── Main view ────────────────────────────────────────────────────────────────
type TabKey = 'active' | 'archive'

export function AnnouncementsView({ announcements }: { announcements: Announcement[] }) {
    const [tab, setTab] = useState<TabKey>('active')
    const [filter, setFilter] = useState<string>('all')
    const [modalAnn, setModalAnn] = useState<Announcement | null>(null)

    const { activeList, archiveList } = useMemo(() => {
        const now = new Date()
        const active: Announcement[] = []
        const archive: Announcement[] = []
        for (const a of announcements) {
            // Active = still within expires_at window (treat null expires_at as active)
            const isActive = !a.expires_at || new Date(a.expires_at) > now
            if (isActive) active.push(a)
            else archive.push(a)
        }
        return { activeList: active, archiveList: archive }
    }, [announcements])

    const base = tab === 'active' ? activeList : archiveList
    const visible = filter === 'all' ? base : base.filter(a => a.priority === filter)

    return (
        <>
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/5 w-full sm:w-max">
                {(['active', 'archive'] as const).map(key => {
                    const isOn = tab === key
                    const label = key === 'active' ? 'Active' : 'Archive'
                    const count = key === 'active' ? activeList.length : archiveList.length
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
                            <span className={cn(
                                'text-[11px] px-1.5 py-0.5 rounded-md font-bold',
                                isOn ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60',
                            )}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 flex-wrap mt-4">
                <Filter size={14} className="text-white/40" />
                {FILTERS.map(f => {
                    const isActive = filter === f.id
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={cn(
                                'text-xs px-3 py-1.5 rounded-full font-semibold transition-all',
                                isActive
                                    ? 'bg-[#882136] text-white shadow-lg shadow-[#882136]/40'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10',
                            )}
                        >
                            {f.label}
                        </button>
                    )
                })}
            </div>

            {/* List */}
            <div className="mt-6 space-y-2">
                {visible.length === 0 ? (
                    <div className="text-center py-16 text-white/40">
                        {tab === 'active'
                            ? <Megaphone size={48} className="mx-auto mb-3 opacity-30" />
                            : <Archive size={48} className="mx-auto mb-3 opacity-30" />
                        }
                        <p>
                            {tab === 'active' ? 'ยังไม่มีประกาศใหม่' : 'ยังไม่มีประกาศที่หมดอายุ'}
                            {filter !== 'all' ? ' ในหมวดนี้' : ''}
                        </p>
                    </div>
                ) : (
                    visible.map(a => (
                        <AnnouncementRow key={a.id} a={a} onClick={() => setModalAnn(a)} />
                    ))
                )}
            </div>

            {modalAnn && <AnnouncementModal a={modalAnn} onClose={() => setModalAnn(null)} />}
        </>
    )
}
