"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageViewerProps {
    src: string
    alt: string
}

export function ImageViewer({ src, alt }: ImageViewerProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                className="group relative cursor-zoom-in overflow-hidden rounded-2xl border-4 border-white/20 bg-black/20 backdrop-blur-md shadow-2xl transition-transform hover:scale-[1.02]"
            >
                <img
                    src={src}
                    alt={alt}
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-xs font-black uppercase text-white tracking-widest bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">Click to Enlarge</span>
                </div>
            </div>

            {/* Lightbox Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 animate-in fade-in duration-300 backdrop-blur-xl"
                    onClick={() => setIsOpen(false)}
                >
                    <button
                        className="absolute top-8 right-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20"
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                    >
                        <X size={32} strokeWidth={3} />
                    </button>

                    <div
                        className="relative max-w-[90vw] max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={src}
                            alt={alt}
                            className="w-full h-full object-contain rounded-xl border border-white/10 shadow-black shadow-2xl"
                        />
                        <div className="absolute bottom-[-40px] left-0 right-0 text-center">
                            <span className="text-sm font-black text-white/40 uppercase tracking-[0.2em]">{alt}</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
