'use client' // Assuming interactivity might be needed later, though server component could work if static. Client is safe for now.

import { Megaphone, ArrowRight } from "lucide-react"

export function PromotionCard({ promotion }: { promotion: any }) {
    if (!promotion) return null

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white/10 dark:bg-card backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-border overflow-hidden relative group min-h-[300px] flex flex-col justify-end">
            {/* Background Image */}
            {promotion.imagePath ? (
                <div className="absolute inset-0 z-0">
                    <img
                        src={promotion.imagePath}
                        alt="Promotion"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                </div>
            ) : (
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-900 to-indigo-900">
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
                </div>
            )}

            {/* Content Overlay */}
            <div className="relative z-10 p-8 w-full max-w-3xl">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg">
                        <Megaphone size={16} />
                    </div>
                    <span className="text-purple-300 font-bold uppercase tracking-widest text-xs">Featured Event</span>
                </div>

                <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight drop-shadow-lg">
                    {promotion.headline}
                </h2>

                <p className="text-white/90 text-lg font-medium leading-relaxed max-w-2xl drop-shadow-md line-clamp-2 mb-6">
                    {promotion.content}
                </p>

                {/* Optional Action Button - could be link if added later */}
                <button className="px-6 py-2.5 bg-white text-purple-900 font-bold rounded-lg hover:bg-purple-50 transition-colors uppercase tracking-wider text-sm flex items-center gap-2 shadow-xl">
                    View Details <ArrowRight size={16} />
                </button>
            </div>
        </div>
    )
}
