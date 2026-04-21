'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, AlertCircle, X, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PriorityAlert {
    id: string
    headline: string
    content: string
    priority: 'emergency' | 'urgent' | string
    publish_date: string
    expires_at?: string | null
    image_path?: string | null
}

function formatThaiDateTime(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })
}

// ── Detail modal (shared by both bars) ──────────────────────────────────────
function AlertModal({ alert, onClose }: { alert: PriorityAlert; onClose: () => void }) {
    const isEmergency = alert.priority === 'emergency'

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])

    return (
        <div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className={cn(
                    'w-full sm:max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative border-2',
                    isEmergency ? 'border-red-500/70' : 'border-amber-400/70',
                )}
                style={{
                    background: 'rgba(15,4,7,0.96)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderRadius: '20px 20px 0 0',
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-black/40 transition-all"
                    style={{ background: 'rgba(0,0,0,0.45)' }}
                    aria-label="ปิด"
                >
                    <X size={18} />
                </button>
                <div className="p-6 sm:p-7 space-y-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
                                isEmergency ? 'bg-red-600 text-white' : 'bg-amber-400 text-black',
                            )}
                        >
                            {isEmergency ? <AlertTriangle size={22} /> : <AlertCircle size={22} />}
                        </div>
                        <div className="min-w-0">
                            <p className={cn(
                                'text-[10px] font-black uppercase tracking-[0.25em]',
                                isEmergency ? 'text-red-300' : 'text-amber-300',
                            )}>
                                {isEmergency ? 'ประกาศฉุกเฉิน' : 'ประกาศด่วน'}
                            </p>
                            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">{alert.headline}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/50 pb-3 border-b border-white/10">
                        <Calendar size={12} />
                        {formatThaiDateTime(alert.publish_date)}
                    </div>
                    <p className="text-[15px] text-white/85 leading-relaxed whitespace-pre-wrap">
                        {alert.content}
                    </p>
                </div>
            </div>
        </div>
    )
}

// ── Individual bar ──────────────────────────────────────────────────────────
function AlertBar({
    alert,
    onOpen,
    onDismiss,
    dismissible,
}: {
    alert: PriorityAlert
    onOpen: () => void
    onDismiss?: () => void
    dismissible: boolean
}) {
    const isEmergency = alert.priority === 'emergency'
    const label = isEmergency ? '🚨 ฉุกเฉิน' : '⚠️ ด่วน'
    const Icon = isEmergency ? AlertTriangle : AlertCircle

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
            className={cn(
                'relative w-full flex items-center gap-2 sm:gap-3 py-3 px-3 sm:px-4 rounded-xl shadow-lg cursor-pointer transition-all hover:brightness-110 active:scale-[0.995]',
                isEmergency
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border border-red-400/70 pa-pulse'
                    : 'bg-amber-400 text-black border border-amber-500',
            )}
        >
            <Icon size={18} className="shrink-0 sm:hidden" strokeWidth={2.5} />
            <Icon size={20} className="shrink-0 hidden sm:block" strokeWidth={2.5} />
            <div className="flex-1 min-w-0">
                <p className={cn(
                    'text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] opacity-80 leading-none',
                )}>
                    {label}
                </p>
                <p className={cn(
                    'text-sm sm:text-base leading-tight mt-0.5 line-clamp-2 break-words',
                    isEmergency ? 'font-bold' : 'font-semibold',
                )}>
                    {alert.headline}
                </p>
            </div>

            {dismissible && onDismiss && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDismiss() }}
                    className={cn(
                        'shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95',
                        isEmergency
                            ? 'text-white hover:bg-white/20'
                            : 'text-black hover:bg-black/10',
                    )}
                    aria-label="ปิดการแจ้งเตือนนี้ชั่วคราว"
                >
                    <X size={16} strokeWidth={2.5} />
                </button>
            )}

            <style jsx>{`
                @keyframes pa-pulse-glow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55), 0 10px 25px -5px rgba(0,0,0,0.35); }
                    50%      { box-shadow: 0 0 0 6px rgba(239,68,68,0), 0 10px 25px -5px rgba(0,0,0,0.35); }
                }
                .pa-pulse { animation: pa-pulse-glow 2.4s ease-in-out infinite; }
            `}</style>
        </div>
    )
}

// ── Public component ────────────────────────────────────────────────────────
export function PriorityAlerts({ alerts }: { alerts: PriorityAlert[] }) {
    const [dismissedUrgent, setDismissedUrgent] = useState<Set<string>>(new Set())
    const [openAlert, setOpenAlert] = useState<PriorityAlert | null>(null)

    if (!alerts.length) return null

    // Emergency first, then urgent. Urgent can be dismissed (session-only).
    const emergency = alerts.filter(a => a.priority === 'emergency')
    const urgent = alerts.filter(a => a.priority === 'urgent' && !dismissedUrgent.has(a.id))

    if (!emergency.length && !urgent.length) return null

    const dismissUrgent = (id: string) => {
        setDismissedUrgent(prev => {
            const next = new Set(prev)
            next.add(id)
            return next
        })
    }

    return (
        <div className="space-y-2">
            {emergency.map(a => (
                <AlertBar
                    key={a.id}
                    alert={a}
                    onOpen={() => setOpenAlert(a)}
                    dismissible={false}
                />
            ))}
            {urgent.map(a => (
                <AlertBar
                    key={a.id}
                    alert={a}
                    onOpen={() => setOpenAlert(a)}
                    onDismiss={() => dismissUrgent(a.id)}
                    dismissible
                />
            ))}
            {openAlert && <AlertModal alert={openAlert} onClose={() => setOpenAlert(null)} />}
        </div>
    )
}
