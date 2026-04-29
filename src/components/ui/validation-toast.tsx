'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Centred modal-like validation toast for client-side form errors.
 *
 * Why centre instead of corner: corner toasts get missed by older staff,
 * and the form tester (ปุ๊) reported thinking the form was "broken" when
 * a corner toast scrolled past her view. A centre toast forces the eye
 * to the message, with a red border so it reads as "ผิด" not "info".
 *
 * Behaviour:
 *   - 3s auto-dismiss (configurable). Hover pauses the timer so a long
 *     missing-field list doesn't disappear before the user finishes
 *     reading.
 *   - Manual close via the ✕ button. Clicking the backdrop does NOT
 *     close — accidental dismissals while reaching for the form below
 *     would be worse than a 3s wait.
 *   - Progress bar shows time-remaining so the user knows it WILL go
 *     away on its own.
 */

interface Props {
    open: boolean
    onClose: () => void
    title: string
    /** Bullet list rendered under the title; pass [] to render no list. */
    missingFields: string[]
    autoDismissMs?: number
}

export function ValidationToast({
    open,
    onClose,
    title,
    missingFields,
    autoDismissMs = 3000,
}: Props) {
    // Mount/unmount animation: we keep the element rendered for ~150ms
    // after `open` flips to false so the fade-out can play.
    const [mounted, setMounted] = useState(false)
    // Drives opacity/transform — toggled in the next animation frame
    // after mount so the browser actually animates instead of jumping.
    const [shown, setShown] = useState(false)

    useEffect(() => {
        if (open) {
            setMounted(true)
            const id = requestAnimationFrame(() => setShown(true))
            return () => cancelAnimationFrame(id)
        }
        setShown(false)
        const t = window.setTimeout(() => setMounted(false), 200)
        return () => window.clearTimeout(t)
    }, [open])

    // Auto-dismiss timer + progress bar.
    // We track elapsed time in a ref so hover-pause + resume picks up
    // where it left off rather than restarting the full 3s budget.
    const elapsedRef = useRef(0)
    const startRef = useRef<number | null>(null)
    const [progress, setProgress] = useState(100)
    const [paused, setPaused] = useState(false)

    useEffect(() => {
        if (!open) {
            elapsedRef.current = 0
            startRef.current = null
            setProgress(100)
            return
        }
        if (paused) {
            // Capture how much we've consumed so far, then stop ticking.
            if (startRef.current !== null) {
                elapsedRef.current += performance.now() - startRef.current
                startRef.current = null
            }
            return
        }

        let raf = 0
        const tick = (now: number) => {
            if (startRef.current === null) startRef.current = now
            const total = elapsedRef.current + (now - startRef.current)
            const pct = Math.max(0, 100 - (total / autoDismissMs) * 100)
            setProgress(pct)
            if (total >= autoDismissMs) {
                onClose()
                return
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [open, paused, autoDismissMs, onClose])

    if (!mounted) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            // Backdrop intentionally does NOT close the toast — see Behaviour
            // note above. We still tint slightly so the toast pops.
            style={{
                background: shown ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0)',
                transition: 'background 200ms ease-out',
            }}
            aria-hidden={!shown}
        >
            <div
                role="alertdialog"
                aria-live="assertive"
                aria-labelledby="validation-toast-title"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                className="pointer-events-auto max-w-lg w-[92%] sm:w-full rounded-2xl shadow-2xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg, #561e23 0%, #ad5f6c 100%)',
                    border: '2px solid #ef4444',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.45), 0 0 0 6px rgba(239,68,68,0.12)',
                    opacity: shown ? 1 : 0,
                    transform: shown ? 'scale(1)' : 'scale(0.95)',
                    transition: 'opacity 200ms ease-out, transform 200ms ease-out',
                }}
            >
                <div className="px-6 sm:px-8 py-5 sm:py-6 relative">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                        aria-label="ปิด"
                    >
                        <X size={18} />
                    </button>
                    <div className="flex items-start gap-4 pr-10">
                        <div
                            className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center"
                            style={{
                                background: 'rgba(239,68,68,0.30)',
                                border: '1px solid rgba(254,202,202,0.45)',
                            }}
                        >
                            <AlertTriangle className="text-red-100" size={26} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3
                                id="validation-toast-title"
                                className="text-white font-bold text-lg sm:text-xl leading-snug"
                            >
                                {title}
                            </h3>
                            {missingFields.length > 0 && (
                                <>
                                    <p className="text-white/85 mt-2 text-base">
                                        ขาดข้อมูลในช่อง:
                                    </p>
                                    <ul className="mt-1.5 space-y-1">
                                        {missingFields.map((f, i) => (
                                            <li
                                                key={`${f}-${i}`}
                                                className="text-white text-base flex items-start gap-2 leading-relaxed"
                                            >
                                                <span className="text-red-200 shrink-0 leading-none mt-1">●</span>
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div
                    className="h-1.5 bg-white/15"
                    aria-hidden="true"
                >
                    <div
                        className="h-full"
                        style={{
                            width: `${progress}%`,
                            background: '#ef4444',
                            transition: paused ? 'none' : 'width 80ms linear',
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
