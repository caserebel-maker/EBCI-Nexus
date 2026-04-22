'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCheck, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    useNotifications,
    type NotificationRow,
} from '@/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import { EmptyState } from './EmptyState'

interface Props {
    open: boolean
    onClose: () => void
    // Hook is owned by the parent (bell) so it can read `count` for the
    // badge; the dropdown just consumes the state.
    state: ReturnType<typeof useNotifications>
}

/**
 * Dropdown panel — responsive:
 *   - Desktop (sm+): absolute-anchored under the bell, 380 px wide.
 *   - Mobile: bottom sheet spanning the width, up to 75 vh.
 *
 * The parent Bell component is `relative` so `sm:absolute` docks here.
 */
export function NotificationDropdown({ open, onClose, state }: Props) {
    const router = useRouter()
    const {
        items, isLoading, hasLoaded, refetch,
        markRead, markAllRead, remove,
    } = state

    // First open → fetch. Reopens re-use the cached list (stale data is
    // fine for ~30 s because the badge will re-fetch on poll).
    useEffect(() => {
        if (open && !hasLoaded) void refetch()
    }, [open, hasLoaded, refetch])

    // Close on ESC
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    // Lock body scroll on mobile when the full-screen sheet is open so
    // the page behind doesn't drift under the finger.
    useEffect(() => {
        if (!open) return
        const isMobile = window.matchMedia('(max-width: 639px)').matches
        if (!isMobile) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [open])

    const handleItemClick = (n: NotificationRow) => {
        if (!n.is_read) void markRead(n.id)
        onClose()
        if (n.action_url) router.push(n.action_url)
    }

    if (!open) return null

    const hasAny = items.length > 0
    const hasUnread = items.some(n => !n.is_read)

    return (
        <>
            {/* Mobile backdrop behind the full-screen sheet. Desktop uses
                outside-click handler on the bell instead. */}
            <div
                className="fixed inset-0 z-[60] bg-black/60 sm:hidden"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-label="การแจ้งเตือน"
                className={cn(
                    'z-[70] overflow-hidden shadow-2xl shadow-black/50',
                    // Mobile: full-screen takeover from just below the app
                    // header down to the bottom nav — same pattern as
                    // Facebook/Messenger notification panels on phone.
                    'fixed inset-x-0 top-0 bottom-0 border-0 rounded-none',
                    // Desktop: anchored dropdown under the bell
                    'sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:bottom-auto',
                    'sm:w-[380px] sm:rounded-xl sm:border sm:border-white/10',
                )}
                style={{
                    background: 'linear-gradient(160deg, rgba(60,15,20,0.98) 0%, rgba(86,30,35,0.98) 55%, rgba(120,45,53,0.97) 100%)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
                // Stop propagation so clicks inside don't bubble to the
                // outside-click handler that closes the panel.
                onClick={e => e.stopPropagation()}
            >
                {/* Flex column so mobile fills viewport with a scrollable
                    body between a fixed header + footer. */}
                <div className="flex flex-col h-full sm:h-auto">
                    {/* Header — larger on mobile to mirror the Facebook
                        notification screen header. */}
                    <header className="flex items-center justify-between gap-3 px-4 py-3 sm:py-3 border-b border-white/10">
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                onClick={onClose}
                                className="sm:hidden w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="ปิด"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <span className="text-white font-bold text-base sm:text-sm">การแจ้งเตือน</span>
                            {state.count > 0 && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90 bg-amber-300/10 border border-amber-300/25 rounded-full px-2 py-0.5">
                                    {state.count} ใหม่
                                </span>
                            )}
                        </div>
                        {hasUnread && (
                            <button
                                onClick={() => void markAllRead()}
                                className="inline-flex items-center gap-1 text-xs sm:text-[11px] text-white/80 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors font-semibold"
                                aria-label="อ่านทั้งหมด"
                            >
                                <CheckCheck size={14} />
                                <span className="hidden sm:inline">อ่านทั้งหมด</span>
                                <span className="sm:hidden">อ่านหมด</span>
                            </button>
                        )}
                    </header>

                    {/* Body — fills remaining height on mobile, capped on desktop. */}
                    <div className="flex-1 overflow-y-auto sm:max-h-[440px] divide-y divide-white/5">
                        {isLoading && !hasAny && (
                            <div className="py-14 flex items-center justify-center text-white/50">
                                <Loader2 size={22} className="animate-spin" />
                            </div>
                        )}
                        {!isLoading && !hasAny && <EmptyState />}
                        {hasAny && items.map(n => (
                            <div key={n.id} className="relative group">
                                <NotificationItem n={n} onClick={handleItemClick} />
                                <button
                                    onClick={() => void remove(n.id)}
                                    className="absolute top-2 right-2 w-8 h-8 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white/30 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-200 transition-all"
                                    aria-label="ลบการแจ้งเตือน"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Footer — link to full history page */}
                    <footer className="border-t border-white/10 px-4 py-3 text-center shrink-0">
                        <Link
                            href="/portal/notifications"
                            onClick={onClose}
                            className="text-xs text-white/70 hover:text-white font-semibold inline-flex items-center gap-1"
                        >
                            ดูทั้งหมด →
                        </Link>
                    </footer>
                </div>
            </div>
        </>
    )
}
