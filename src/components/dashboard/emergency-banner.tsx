'use client'

import { useState } from 'react'
import { AlertTriangle, X, Info, Calendar } from 'lucide-react'

export function EmergencyBanner({ emergency }: { emergency: any }) {
    const [isOpen, setIsOpen] = useState(false)

    if (!emergency) return null

    return (
        <>
            <div className="bg-amber-500 text-black p-4 rounded-xl shadow-2xl border-2 border-amber-400 flex items-center justify-between animate-pulse-slow z-40 relative mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-black/10 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} className="animate-bounce" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Critical Emergency Alert</p>
                        <h2 className="text-lg font-black uppercase leading-tight">{emergency.headline}</h2>
                    </div>
                </div>
                <div className="hidden md:block max-w-md text-sm font-medium opacity-80 line-clamp-2">
                    {emergency.content}
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black/80 transition-all"
                >
                    View Details
                </button>
            </div>

            {/* Emergency Detail Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#1a1a1a] border-4 border-amber-500 w-full max-w-2xl rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-in zoom-in-95 relative">
                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 bg-amber-500 rounded-full text-black hover:bg-amber-400 transition-all z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-black shadow-lg">
                                    <AlertTriangle size={28} />
                                </div>
                                <div>
                                    <span className="text-amber-500 text-[10px] uppercase tracking-[0.3em] font-black">Emergency Broadcast</span>
                                    <h2 className="text-3xl font-black text-white uppercase">{emergency.headline}</h2>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-white/40 text-sm mb-6 pb-6 border-b border-white/10">
                                <Calendar size={14} />
                                {new Date(emergency.publish_date).toLocaleString('th-TH', {
                                    dateStyle: 'long',
                                    timeStyle: 'short'
                                })}
                            </div>

                            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <p className="text-lg text-white leading-relaxed whitespace-pre-wrap font-medium">
                                    {emergency.content}
                                </p>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-8 py-3 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest text-sm shadow-xl"
                                >
                                    Understood
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.95; transform: scale(0.998); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s infinite ease-in-out;
                }
            `}</style>
        </>
    )
}
