'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Calendar, ChevronRight } from 'lucide-react'

interface Announcement {
    id: string
    headline: string
    content: string
    image_path?: string
    imageUrl?: string
    publish_date: string
    priority: string
}

function formatDateTH(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

/** Returns true if the announcement is older than 24 hours */
function isExpired(publishDate: string): boolean {
    const published = new Date(publishDate).getTime()
    const now = Date.now()
    return now - published > 24 * 60 * 60 * 1000
}

/** LocalStorage key: dismissed today? */
function getDismissKey(id: string): string {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    return `banner_dismissed_${id}_${today}`
}

function isDismissed(id: string): boolean {
    try {
        return localStorage.getItem(getDismissKey(id)) === '1'
    } catch {
        return false
    }
}

function setDismissed(id: string) {
    try {
        localStorage.setItem(getDismissKey(id), '1')
    } catch {
        // ignore
    }
}

function UrgentModal({ item, onClose }: { item: Announcement; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-gray-700 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Image — full width, contain (no crop), dark bg */}
                {item.imageUrl ? (
                    <div className="w-full bg-gray-900 flex items-center justify-center" style={{ minHeight: '12rem', maxHeight: '20rem' }}>
                        <img
                            src={item.imageUrl}
                            alt={item.headline}
                            className="w-full object-contain"
                            style={{ maxHeight: '20rem' }}
                        />
                    </div>
                ) : (
                    <div className="w-full h-16 bg-gradient-to-r from-amber-400 to-yellow-300" />
                )}

                {/* Content */}
                <div className="p-6">
                    {/* Badge */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-sm font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            <AlertTriangle size={14} />
                            ประกาศด่วน
                        </span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-snug">
                        {item.headline}
                    </h2>

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-4 pb-4 border-b border-gray-100">
                        <Calendar size={14} />
                        <span>{formatDateTH(item.publish_date)}</span>
                    </div>

                    {/* Body */}
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
                        {item.content}
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-lg text-base transition-colors"
                    >
                        รับทราบ
                    </button>
                </div>
            </div>
        </div>
    )
}

export function UrgentBanners({ banners }: { banners: Announcement[] }) {
    const [selected, setSelected] = useState<Announcement | null>(null)
    // IDs that have been dismissed or are expired — computed after mount (needs localStorage)
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // On mount, build the initial hidden set from localStorage + expiry
        const hidden = new Set<string>()
        for (const b of banners) {
            if (isExpired(b.publish_date) || isDismissed(b.id)) {
                hidden.add(b.id)
            }
        }
        setHiddenIds(hidden)
    }, [banners])

    function dismiss(id: string) {
        setDismissed(id)
        setHiddenIds(prev => new Set([...prev, id]))
    }

    // Before mount, show nothing to avoid SSR/localStorage mismatch
    if (!mounted) return null

    const visible = banners.filter(b => !hiddenIds.has(b.id))
    if (!visible.length) return null

    return (
        <>
            <div className="space-y-2">
                {visible.map(item => (
                    <div
                        key={item.id}
                        className="w-full flex items-center gap-3 bg-amber-400 text-black px-4 py-3.5 rounded-xl border-2 border-amber-300 shadow-md"
                    >
                        {/* Icon */}
                        <div className="shrink-0 h-9 w-9 rounded-full bg-black/10 flex items-center justify-center">
                            <AlertTriangle size={20} className="text-black" />
                        </div>

                        {/* Text — clickable area */}
                        <button
                            className="flex-1 min-w-0 text-left group"
                            onClick={() => setSelected(item)}
                        >
                            <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-0.5">
                                ประกาศด่วน · {formatDateTH(item.publish_date)}
                            </p>
                            <p className="font-bold text-base leading-tight truncate group-hover:underline">
                                {item.headline}
                            </p>
                        </button>

                        {/* Read more caret */}
                        <button
                            onClick={() => setSelected(item)}
                            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                            aria-label="ดูรายละเอียด"
                        >
                            <ChevronRight size={20} />
                        </button>

                        {/* Dismiss X */}
                        <button
                            onClick={() => dismiss(item.id)}
                            className="shrink-0 p-1 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
                            aria-label="ปิดประกาศ"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ))}
            </div>

            {selected && (
                <UrgentModal item={selected} onClose={() => setSelected(null)} />
            )}
        </>
    )
}
