'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuccessPopupProps {
    open: boolean
    title?: string
    subtitle?: string
    /** Auto-close delay in ms. 0 disables autoclose. Default 3000. */
    autoCloseMs?: number
    onClose: () => void
    className?: string
}

/**
 * Centered success modal with glass card, animated enter/exit, optional
 * countdown progress bar, and auto-close timer. Closes on X, backdrop
 * click, or Escape. Designed to overlay above all page content.
 */
export function SuccessPopup({
    open,
    title = 'สำเร็จ',
    subtitle,
    autoCloseMs = 3000,
    onClose,
    className,
}: SuccessPopupProps) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!open) { setVisible(false); return }
        // Next frame — ensure enter transition runs after mount
        const raf = requestAnimationFrame(() => setVisible(true))
        return () => cancelAnimationFrame(raf)
    }, [open])

    useEffect(() => {
        if (!open || !autoCloseMs) return
        const timer = setTimeout(onClose, autoCloseMs)
        return () => clearTimeout(timer)
    }, [open, autoCloseMs, onClose])

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={cn(
                    'relative w-full max-w-sm rounded-2xl shadow-2xl py-6 px-8 text-center transition-all duration-200 ease-out',
                    visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
                    className,
                )}
                style={{
                    background: 'linear-gradient(145deg, rgba(86,30,35,0.92) 0%, rgba(60,15,20,0.96) 60%, rgba(100,35,45,0.92) 100%)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14)',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    aria-label="ปิด"
                >
                    <X size={16} />
                </button>

                <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-3" strokeWidth={2} />
                <h3 className="text-xl font-bold text-white leading-snug">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-white/70 mt-1.5 leading-relaxed">{subtitle}</p>
                )}

                {/* Countdown progress bar */}
                {autoCloseMs > 0 && (
                    <div
                        className="absolute left-0 right-0 bottom-0 h-1 bg-white/10 overflow-hidden"
                        aria-hidden="true"
                    >
                        <div
                            key={open ? 'on' : 'off'}
                            className="h-full bg-emerald-400/80"
                            style={{
                                animation: `sp-countdown ${autoCloseMs}ms linear forwards`,
                                transformOrigin: 'left center',
                            }}
                        />
                    </div>
                )}
            </div>
            <style>{`
                @keyframes sp-countdown {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
            `}</style>
        </div>
    )
}
