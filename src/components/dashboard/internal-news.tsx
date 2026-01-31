'use client'

import { useState } from 'react'
import { FileText, ChevronRight, X, Calendar } from 'lucide-react'
// Wait, I should verify if Dialog component exists. If not, I'll implement a simple one inline or in the component to avoid dependencies not installed.
// The user has 'lucide-react' but maybe not shadcn/ui components fully set up. I'll stick to a custom modal built-in to be safe and fast.

export function InternalNews({ announcements }: { announcements: any[] }) {
    const [selectedNews, setSelectedNews] = useState<any | null>(null)

    if (!announcements.length) return null

    return (
        <div className="bg-white/10 dark:bg-card backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-border p-6 flex flex-col h-full">
            <h2 className="text-lg font-bold mb-4 text-white dark:text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText size={20} className="text-blue-400" />
                Internal News
            </h2>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {announcements.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => setSelectedNews(item)}
                        className="group p-3 rounded-lg bg-black/20 hover:bg-white/10 cursor-pointer transition-all border border-transparent hover:border-white/10"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-blue-300 font-mono">
                                {new Date(item.publishDate).toLocaleDateString('en-GB')}
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                            {item.headline}
                        </h3>
                    </div>
                ))}
            </div>

            {/* View All / Footer */}
            <div className="pt-4 mt-auto border-t border-white/10">
                <button className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors uppercase tracking-widest font-bold">
                    View Archive <ChevronRight size={14} />
                </button>
            </div>

            {/* Modal */}
            {selectedNews && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1a1a1a] border border-white/20 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 relative">
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedNews(null)}
                            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white/70 hover:text-white hover:bg-red-500/80 transition-all z-10"
                        >
                            <X size={20} />
                        </button>

                        {/* Image Header */}
                        {selectedNews.imagePath ? (
                            <div className="h-48 w-full relative">
                                <img
                                    src={selectedNews.imagePath}
                                    alt={selectedNews.headline}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
                            </div>
                        ) : (
                            <div className="h-24 w-full bg-gradient-to-r from-blue-900 to-slate-900" />
                        )}

                        <div className="p-8 -mt-10 relative">
                            <span className="inline-block px-3 py-1 bg-blue-500 text-white text-[10px] uppercase tracking-widest font-bold rounded-full mb-4 shadow-lg">
                                Internal News
                            </span>
                            <h2 className="text-2xl font-bold text-white mb-2">{selectedNews.headline}</h2>
                            <div className="flex items-center gap-2 text-white/40 text-sm mb-6 pb-6 border-b border-white/10">
                                <Calendar size={14} />
                                {new Date(selectedNews.publishDate).toLocaleDateString('en-US', { dateStyle: 'long' })}
                            </div>

                            <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed whitespace-pre-wrap">
                                {selectedNews.content}
                            </div>
                        </div>
                    </div>
                    {/* Backdrop Click to Close */}
                    <div className="absolute inset-0 -z-10" onClick={() => setSelectedNews(null)} />
                </div>
            )}
        </div>
    )
}
