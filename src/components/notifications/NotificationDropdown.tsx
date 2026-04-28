'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CheckCheck, Loader2, X } from 'lucide-react'
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
    const pathname = usePathname()
    // Keep HR Admin in admin shell when they click "ดูทั้งหมด" — without
    // this, the link routes to /portal/notifications which forces the
    // layout into employee preview mode. Mirror page at /hradmin/
    // notifications reuses the same NotificationsClient so it's the
    // exact same full-history view, just inside the admin shell.
    const seeAllHref = pathname?.startsWith('/hradmin')
        ? '/hradmin/notifications'
        : '/portal/notifications'
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
        if (!n.action_url) return
        // Same admin/portal awareness as the "ดูทั้งหมด" link: if the
        // bell was opened from /hradmin and the stored action_url
        // points at a /portal/* page that has an /hradmin/* mirror,
        // rewrite so HR Admin doesn't get flipped into employee mode
        // halfway through reviewing a notification. Fall back to the
        // original URL for portal-only paths (announcements, profile).
        const target = pathname?.startsWith('/hradmin')
            ? rewriteForAdmin(n.action_url)
            : n.action_url
        router.push(target)
    }

    if (!open) return null

    const hasAny = items.length > 0
    const hasUnread = items.some(n => !n.is_read)

    return (
        <>
            {/* Mobile backdrop — full 50% scrim because the panel takes
                most of the screen.
                Desktop scrim — softer 20% so the page reads as "behind"
                the dropdown without going dark. The desktop outside-click
                handler on the bell still closes the panel; this just adds
                the visual layering. */}
            <div
                className="fixed inset-0 z-[60] bg-black/50 sm:hidden"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className="hidden sm:block fixed inset-0 z-[60] bg-black/20"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-label="การแจ้งเตือน"
                className={cn(
                    'z-[70] overflow-hidden border border-white/10 shadow-2xl shadow-black/50 rounded-2xl',
                    // Mobile: floating panel anchored just below the sticky
                    // topbar (~56 px + safe-area), nearly full-width with
                    // small side margins — same feel as Facebook's mobile
                    // notification dropdown.
                    'fixed left-2 right-2 top-[calc(env(safe-area-inset-top,0px)+56px)] max-h-[calc(100dvh-72px)]',
                    // Desktop: compact dropdown anchored under the bell.
                    // sm:top-auto + sm:top-full overrides the mobile `top`
                    // so the dropdown clips to the bell's parent instead.
                    'sm:absolute sm:inset-auto sm:right-0 sm:left-auto sm:top-full sm:mt-2',
                    'sm:w-[380px] sm:max-h-none sm:rounded-xl',
                )}
                style={{
                    background: 'linear-gradient(160deg, rgba(60,15,20,0.98) 0%, rgba(86,30,35,0.98) 55%, rgba(120,45,53,0.97) 100%)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                }}
                // Stop propagation so clicks inside don't bubble to the
                // outside-click handler that closes the panel.
                onClick={e => e.stopPropagation()}
            >
                {/* Flex column so the scrollable body slots between a
                    sticky header + footer without overflowing the panel. */}
                <div className="flex flex-col max-h-[inherit]">
                    {/* Header */}
                    <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-white font-bold text-base sm:text-sm">การแจ้งเตือน</span>
                            {state.count > 0 && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90 bg-amber-300/10 border border-amber-300/25 rounded-full px-2 py-0.5">
                                    {state.count} ใหม่
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {hasUnread && (
                                <button
                                    onClick={() => void markAllRead()}
                                    className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] text-white/80 hover:text-white px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors font-semibold"
                                    aria-label="อ่านทั้งหมด"
                                >
                                    <CheckCheck size={13} />
                                    <span>อ่านทั้งหมด</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="ปิด"
                            >
                                <X size={16} />
                            </button>
                        </div>
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

                    {/* Footer — link to full history page. Route adapts
                        to whether the bell was clicked from /hradmin or
                        /portal so HR Admin doesn't get flipped into
                        employee preview mode mid-flow. */}
                    <footer className="border-t border-white/10 px-4 py-3 text-center shrink-0">
                        <Link
                            href={seeAllHref}
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

/**
 * Rewrite a notification action URL when the bell was clicked from the
 * /hradmin shell. Notifications are written with /portal/* paths
 * (employees are the primary audience) but for paths that have an
 * /hradmin/* mirror, an HR Admin who's reviewing them as part of
 * their admin work shouldn't be yanked into the employee preview.
 *
 * Currently mirrored:
 *   - /portal/leave/inbox      → /hradmin/leave/inbox
 *   - /portal/notifications    → /hradmin/notifications
 *
 * Anything else (announcements, profile, payroll, calendar) stays on
 * its /portal route — HR Admin lands in preview mode for those, which
 * is fine since the page itself is the same and the toggle button
 * is one click away to return.
 */
function rewriteForAdmin(url: string): string {
    if (url.startsWith('/portal/leave/inbox')) {
        return '/hradmin/leave/inbox' + url.slice('/portal/leave/inbox'.length)
    }
    if (url.startsWith('/portal/notifications')) {
        return '/hradmin/notifications' + url.slice('/portal/notifications'.length)
    }
    return url
}
