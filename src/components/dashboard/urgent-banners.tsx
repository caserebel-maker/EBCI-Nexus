'use client'

import { useState } from 'react'
import { AlertTriangle, X, Calendar, ChevronRight } from 'lucide-react'

interface Announcement {
    id: string
    headline: string
    content: string
    image_path?: string
    imageUrl?: string
    publish_date: string
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
                    <X size={18} />
                </button>

                {/* Image */}
                {item.imageUrl ? (
                    <div className="h-52 w-full relative">
                        <img
                            src={item.imageUrl}
                            alt={item.headline}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/60 to-transparent" />
                    </div>
                ) : (
                    <div className="h-16 w-full bg-gradient-to-r from-amber-400 to-yellow-300" />
                )}

                {/* Content */}
                <div className="p-6">
                    {/* Badge */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            <AlertTriangle size={12} />
                            ประกาศด่วน
                        </span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-xl font-bold text-gray-900 mb-3 leading-snug">
                        {item.headline}
                    </h2>

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4 pb-4 border-b border-gray-100">
                        <Calendar size={13} />
                        <span>{formatDateTH(item.publish_date)}</span>
                    </div>

                    {/* Body */}
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                        {item.content}
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-lg text-sm transition-colors"
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

    if (!banners.length) return null

    return (
        <>
            <div className="space-y-2">
                {banners.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className="w-full flex items-center gap-3 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black px-4 py-3 rounded-xl border-2 border-amber-300 shadow-md transition-all text-left group"
                    >
                        {/* Icon */}
                        <div className="shrink-0 h-8 w-8 rounded-full bg-black/10 flex items-center justify-center">
                            <AlertTriangle size={18} className="text-black" />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">
                                ประกาศด่วน · {formatDateTH(item.publish_date)}
                            </p>
                            <p className="font-bold text-sm leading-tight truncate">
                                {item.headline}
                            </p>
                        </div>

                        {/* Caret */}
                        <ChevronRight size={18} className="shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                ))}
            </div>

            {selected && (
                <UrgentModal item={selected} onClose={() => setSelected(null)} />
            )}
        </>
    )
}
