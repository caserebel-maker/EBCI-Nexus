'use client'

import { useState } from 'react'
import { Megaphone, AlertTriangle, AlertCircle, Info, Calendar, Archive, Filter } from 'lucide-react'
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

const PRIORITY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string; chip: string }> = {
    emergency: { label: 'ฉุกเฉิน', icon: AlertTriangle, color: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-500/40', chip: 'bg-red-500/25 text-red-200' },
    urgent:    { label: 'ด่วน',    icon: AlertCircle,   color: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/40', chip: 'bg-amber-500/25 text-amber-200' },
    promote:   { label: 'กิจกรรม', icon: Megaphone,     color: 'text-purple-300', bg: 'bg-purple-500/15', border: 'border-purple-500/40', chip: 'bg-purple-500/25 text-purple-200' },
    internal:  { label: 'ทั่วไป',  icon: Info,          color: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/40', chip: 'bg-blue-500/25 text-blue-200' },
}

const FILTERS = [
    { id: 'all',       label: 'ทั้งหมด' },
    { id: 'emergency', label: 'ฉุกเฉิน' },
    { id: 'urgent',    label: 'ด่วน' },
    { id: 'promote',   label: 'กิจกรรม' },
    { id: 'internal',  label: 'ทั่วไป' },
]

function formatThaiDate(iso: string) {
    const d = new Date(iso)
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}

function AnnouncementCard({ a, isExpired }: { a: Announcement; isExpired: boolean }) {
    const config = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.internal
    const Icon = config.icon

    return (
        <div
            className={cn(
                "rounded-2xl border overflow-hidden transition-all",
                config.bg, config.border,
                isExpired && "opacity-60"
            )}
            style={{ backdropFilter: 'blur(8px)' }}
        >
            {/* Image (if any) */}
            {a.imageUrl && (
                <div className="w-full h-48 bg-black/20 overflow-hidden">
                    <img src={a.imageUrl} alt={a.headline} className="w-full h-full object-cover" />
                </div>
            )}

            {/* Content */}
            <div className="p-5">
                <div className="flex items-start gap-4">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                        <Icon size={18} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider", config.chip)}>
                                {config.label}
                            </span>
                            {isExpired && (
                                <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider text-white/40 bg-white/5">
                                    หมดอายุแล้ว
                                </span>
                            )}
                            <span className="text-[11px] text-white/50 flex items-center gap-1">
                                <Calendar size={11} />
                                {formatThaiDate(a.publish_date)}
                            </span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-tight mb-2">
                            {a.headline}
                        </h3>
                        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                            {a.content}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function AnnouncementsView({ announcements }: { announcements: Announcement[] }) {
    const [filter, setFilter] = useState<string>('all')

    const now = new Date()

    // Apply filter
    const filtered = filter === 'all'
        ? announcements
        : announcements.filter(a => a.priority === filter)

    // Split into active + expired
    const active = filtered.filter(a => !a.expires_at || new Date(a.expires_at) > now)
    const expired = filtered.filter(a => a.expires_at && new Date(a.expires_at) <= now)

    return (
        <>
            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter size={14} className="text-white/40" />
                {FILTERS.map(f => {
                    const isActive = filter === f.id
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={cn(
                                "text-xs px-3 py-1.5 rounded-full font-semibold transition-all",
                                isActive
                                    ? "bg-[#882136] text-white shadow-lg shadow-[#882136]/40"
                                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                            )}
                        >
                            {f.label}
                        </button>
                    )
                })}
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div className="text-center py-16 text-white/40">
                    <Megaphone size={48} className="mx-auto mb-4 opacity-30" />
                    <p>ไม่มีประกาศในหมวดนี้</p>
                </div>
            )}

            {/* Active section */}
            {active.length > 0 && (
                <div className="space-y-3 mt-6">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/50 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        กำลังใช้งาน ({active.length})
                    </div>
                    {active.map(a => (
                        <AnnouncementCard key={a.id} a={a} isExpired={false} />
                    ))}
                </div>
            )}

            {/* Expired section */}
            {expired.length > 0 && (
                <div className="space-y-3 mt-8">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40 font-semibold">
                        <Archive size={12} />
                        ประวัติ ({expired.length})
                    </div>
                    {expired.map(a => (
                        <AnnouncementCard key={a.id} a={a} isExpired={true} />
                    ))}
                </div>
            )}
        </>
    )
}
