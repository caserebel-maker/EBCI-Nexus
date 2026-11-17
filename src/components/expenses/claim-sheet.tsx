'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Full-height form sheet for the expense-claim dialogs.
 *
 * Portals to <body> at z-[100] so it sits above the top bar and the mobile
 * bottom nav, and locks page scroll while open so a swipe scrolls the form,
 * not the page behind it (same pattern as confirm-dialog / RequestDetailDrawer).
 */
export function ClaimSheet({
    title,
    subtitle,
    onClose,
    onSubmit,
    children,
}: {
    title: string
    subtitle?: string
    onClose: () => void
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
    children: React.ReactNode
}) {
    const closeRef = useRef(onClose)
    useEffect(() => {
        closeRef.current = onClose
    }, [onClose])

    useEffect(() => {
        const { body, documentElement } = document
        const prevBody = body.style.overflow
        const prevHtml = documentElement.style.overflow
        body.style.overflow = 'hidden'
        documentElement.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
        window.addEventListener('keydown', onKey)
        return () => {
            body.style.overflow = prevBody
            documentElement.style.overflow = prevHtml
            window.removeEventListener('keydown', onKey)
        }
    }, [])

    // Only ever rendered after a user tap, but guard in case of server render.
    if (typeof document === 'undefined') return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
            <form
                onSubmit={onSubmit}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-[#5a1e2a] text-white shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl"
            >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-6 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
                    <div>
                        <h2 className="text-2xl font-bold">{title}</h2>
                        {subtitle && <p className="mt-1 text-base text-white/60">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10" aria-label="ปิด">
                        <X className="h-7 w-7" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 [-webkit-overflow-scrolling:touch]">
                    {children}
                </div>
            </form>
        </div>,
        document.body,
    )
}
