'use client'

import React, { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    body?: string
    summary?: React.ReactNode
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'destructive' | 'warning'
    loading?: boolean
}

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',')

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    body,
    summary,
    confirmLabel = 'ยืนยัน',
    cancelLabel = 'ยกเลิก',
    variant = 'destructive',
    loading = false,
}: ConfirmDialogProps) {
    const titleId = useId()
    const bodyId = useId()
    const dialogRef = useRef<HTMLDivElement | null>(null)
    const cancelRef = useRef<HTMLButtonElement | null>(null)
    const lastActiveRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        if (open) {
            lastActiveRef.current = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null
            const prevOverflow = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            const id = requestAnimationFrame(() => cancelRef.current?.focus())
            return () => {
                cancelAnimationFrame(id)
                document.body.style.overflow = prevOverflow
                window.setTimeout(() => {
                    lastActiveRef.current?.focus?.()
                    lastActiveRef.current = null
                }, 0)
            }
        }
    }, [open])

    useEffect(() => {
        if (!open) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (loading) return

            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
                return
            }

            if (event.key !== 'Tab') return

            const root = dialogRef.current
            if (!root) return
            const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
                .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
            if (focusables.length === 0) return

            const first = focusables[0]
            const last = focusables[focusables.length - 1]
            const active = document.activeElement

            if (event.shiftKey && active === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && active === last) {
                event.preventDefault()
                first.focus()
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [loading, onClose, open])

    if (!open || typeof document === 'undefined') return null

    const isWarning = variant === 'warning'
    const Icon = isWarning ? AlertTriangle : ShieldAlert

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-150 motion-reduce:animate-none"
            style={{
                background: 'rgba(0,0,0,0.62)',
            }}
            onMouseDown={(event) => {
                if (!loading && event.target === event.currentTarget) onClose()
            }}
        >
            <div
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={body ? bodyId : undefined}
                className={cn(
                    'w-full min-w-[320px] max-w-[min(90vw,480px)] rounded-2xl shadow-2xl overflow-hidden',
                    'animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none',
                )}
                style={{
                    background: 'linear-gradient(180deg, #561e23 0%, #ad5f6c 100%)',
                    border: `2px solid ${isWarning ? '#f59e0b' : '#ef4444'}`,
                    boxShadow: `0 22px 70px rgba(0,0,0,0.50), 0 0 0 6px ${isWarning ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'}`,
                }}
            >
                <div className="px-6 py-5 sm:px-8 sm:py-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="rounded-lg bg-white/15 ring-1 ring-white/25 p-2.5">
                            <Icon size={26} className={isWarning ? 'text-amber-300' : 'text-red-300'} />
                        </div>
                        <div className="w-full text-center">
                            <h2 id={titleId} className="text-xl font-bold text-white leading-snug">
                                {title}
                            </h2>
                            {summary && (
                                <div className="mt-4 rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-base text-white/85 leading-relaxed text-center">
                                    {summary}
                                </div>
                            )}
                            {body && (
                                <p id={bodyId} className="mt-3 text-base text-white/90 leading-relaxed text-center">
                                    {body}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3 sm:justify-center">
                        <button
                            ref={cancelRef}
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 sm:flex-none rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60 whitespace-nowrap"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className={cn(
                                'flex-1 sm:flex-none rounded-xl px-5 py-3 text-sm font-bold transition-colors focus:outline-none focus:ring-2 disabled:opacity-70 inline-flex items-center justify-center gap-2 whitespace-nowrap',
                                isWarning
                                    ? 'bg-amber-400 text-black hover:bg-amber-500 focus:ring-amber-200'
                                    : 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-200',
                            )}
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? 'กำลังดำเนินการ...' : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    )
}
