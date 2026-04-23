'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Loader2, X, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationRow } from '@/hooks/useNotifications'
import { NotificationItem } from '@/components/notifications/NotificationItem'

type Filter = 'all' | 'unread' | 'read'

const PAGE_SIZE = 20

interface ListResponse {
    items: NotificationRow[]
    unread_count: number
    total: number
}

/**
 * Full-page notification center.
 *
 * Architecture notes:
 *   - Mirrors the dropdown's state machine (`useNotifications`) but
 *     drives it locally so the filter/pagination state doesn't leak
 *     into the bell's polling hook.
 *   - All mutations (markRead / markAllRead / remove) are optimistic
 *     and then re-fetch the current page to keep filter counts honest.
 *   - The /api/notifications/list endpoint only exposes `unread_only`
 *     as a server filter, so "read" filter is applied client-side
 *     after fetching. Good enough at ~20/page.
 */
export function NotificationsClient() {
    const router = useRouter()
    const [items, setItems] = useState<NotificationRow[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [total, setTotal] = useState(0)
    const [filter, setFilter] = useState<Filter>('all')
    const [offset, setOffset] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [hasError, setHasError] = useState(false)

    // Loading the first page of a given filter resets the list; loading
    // more appends. The server returns `total` for the raw filter so the
    // "load more" button only shows when there's genuinely more.
    const load = useCallback(
        async (opts: { reset: boolean; filter: Filter; offset: number }) => {
            setIsLoading(true)
            setHasError(false)
            try {
                const params = new URLSearchParams()
                params.set('limit', String(PAGE_SIZE))
                params.set('offset', String(opts.offset))
                if (opts.filter === 'unread') params.set('unread_only', 'true')
                const res = await fetch(`/api/notifications/list?${params.toString()}`, {
                    cache: 'no-store',
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json = (await res.json()) as ListResponse
                const fetched = Array.isArray(json.items) ? json.items : []
                // Client-side "read" filter — server doesn't support it
                // natively and we don't want another endpoint for one filter.
                const filtered = opts.filter === 'read'
                    ? fetched.filter(n => n.is_read)
                    : fetched
                setItems(prev => opts.reset ? filtered : [...prev, ...filtered])
                setUnreadCount(json.unread_count ?? 0)
                setTotal(json.total ?? 0)
            } catch (err) {
                console.error('[notifications page] load error:', err)
                setHasError(true)
            } finally {
                setIsLoading(false)
            }
        },
        [],
    )

    // Initial + filter-switch load.
    useEffect(() => {
        setOffset(0)
        void load({ reset: true, filter, offset: 0 })
    }, [filter, load])

    const loadMore = () => {
        const next = offset + PAGE_SIZE
        setOffset(next)
        void load({ reset: false, filter, offset: next })
    }

    const markRead = useCallback(async (id: string) => {
        // Optimistic
        setItems(prev => prev.map(n =>
            n.id === id && !n.is_read
                ? { ...n, is_read: true, read_at: new Date().toISOString() }
                : n,
        ))
        setUnreadCount(c => Math.max(0, c - 1))
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
        } catch (err) {
            console.error('[notifications page] markRead error:', err)
        }
    }, [])

    const markAllRead = useCallback(async () => {
        setItems(prev => prev.map(n => n.is_read
            ? n
            : { ...n, is_read: true, read_at: new Date().toISOString() },
        ))
        setUnreadCount(0)
        try {
            await fetch('/api/notifications/mark-all-read', { method: 'POST' })
        } catch (err) {
            console.error('[notifications page] markAllRead error:', err)
        }
    }, [])

    const remove = useCallback(async (id: string) => {
        setItems(prev => {
            const target = prev.find(n => n.id === id)
            if (target && !target.is_read) setUnreadCount(c => Math.max(0, c - 1))
            return prev.filter(n => n.id !== id)
        })
        setTotal(t => Math.max(0, t - 1))
        try {
            await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
        } catch (err) {
            console.error('[notifications page] remove error:', err)
        }
    }, [])

    const onItemClick = useCallback((n: NotificationRow) => {
        if (!n.is_read) void markRead(n.id)
        if (n.action_url) router.push(n.action_url)
    }, [markRead, router])

    const hasMore = items.length < total && filter !== 'read'
    const hasAny = items.length > 0

    const tabs = useMemo<Array<{ key: Filter; label: string; badge?: number }>>(() => [
        { key: 'all',    label: 'ทั้งหมด' },
        { key: 'unread', label: 'ยังไม่อ่าน', badge: unreadCount },
        { key: 'read',   label: 'อ่านแล้ว' },
    ], [unreadCount])

    return (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 pb-8">
            {/* Header card — mirrors the dropdown's look for visual continuity */}
            <div
                className="rounded-2xl border border-white/10 overflow-hidden shadow-xl shadow-black/30 mb-3"
                style={{
                    background: 'linear-gradient(160deg, rgba(60,15,20,0.98) 0%, rgba(86,30,35,0.98) 55%, rgba(120,45,53,0.97) 100%)',
                }}
            >
                <div className="px-4 py-3 sm:py-4 flex items-center justify-between gap-3 border-b border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 shrink-0">
                            <Bell size={18} className="text-white" />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-white font-bold text-base sm:text-lg leading-tight">
                                การแจ้งเตือน
                            </h1>
                            <p className="text-[11px] sm:text-xs text-white/55 mt-0.5">
                                {unreadCount > 0
                                    ? `มี ${unreadCount} รายการที่ยังไม่ได้อ่าน`
                                    : 'อ่านครบแล้ว'}
                            </p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={() => void markAllRead()}
                            className="inline-flex items-center gap-1.5 text-xs text-white/85 hover:text-white px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors font-semibold shrink-0"
                            aria-label="อ่านทั้งหมด"
                        >
                            <CheckCheck size={14} />
                            <span className="hidden sm:inline">อ่านทั้งหมด</span>
                            <span className="sm:hidden">อ่านหมด</span>
                        </button>
                    )}
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto">
                    {tabs.map(t => {
                        const active = filter === t.key
                        return (
                            <button
                                key={t.key}
                                onClick={() => setFilter(t.key)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                                    active
                                        ? 'bg-white text-[#561e23] shadow'
                                        : 'bg-white/10 text-white/75 hover:bg-white/15 hover:text-white',
                                )}
                            >
                                {t.label}
                                {typeof t.badge === 'number' && t.badge > 0 && (
                                    <span
                                        className={cn(
                                            'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                                            active
                                                ? 'bg-[#561e23] text-white'
                                                : 'bg-amber-300/20 text-amber-200',
                                        )}
                                    >
                                        {t.badge}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* List card */}
            <div
                className="rounded-2xl border border-white/10 overflow-hidden shadow-xl shadow-black/30"
                style={{
                    background: 'linear-gradient(160deg, rgba(60,15,20,0.98) 0%, rgba(86,30,35,0.98) 55%, rgba(120,45,53,0.97) 100%)',
                }}
            >
                <div className="divide-y divide-white/5">
                    {isLoading && !hasAny && (
                        <div className="py-16 flex items-center justify-center text-white/50">
                            <Loader2 size={22} className="animate-spin" />
                        </div>
                    )}

                    {!isLoading && !hasAny && !hasError && (
                        <div className="py-14 px-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                                <Bell size={22} className="text-white/40" />
                            </div>
                            <p className="text-white/70 font-semibold text-sm">
                                {filter === 'unread' ? 'ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน'
                                    : filter === 'read' ? 'ยังไม่มีการแจ้งเตือนที่อ่านแล้ว'
                                        : 'ยังไม่มีการแจ้งเตือน'}
                            </p>
                            <p className="text-white/45 text-xs mt-1">
                                เมื่อมีกิจกรรมใหม่จะแสดงที่นี่
                            </p>
                        </div>
                    )}

                    {hasError && !hasAny && (
                        <div className="py-10 px-6 text-center">
                            <p className="text-red-200 text-sm font-semibold">
                                โหลดการแจ้งเตือนไม่สำเร็จ
                            </p>
                            <button
                                onClick={() => void load({ reset: true, filter, offset: 0 })}
                                className="mt-2 text-xs text-white/70 hover:text-white underline"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    )}

                    {hasAny && items.map(n => (
                        <div key={n.id} className="relative group">
                            <NotificationItem n={n} onClick={onItemClick} />
                            <button
                                onClick={() => void remove(n.id)}
                                className="absolute top-2 right-2 w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white/35 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-200 transition-all"
                                aria-label="ลบการแจ้งเตือน"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Load more */}
                {hasAny && hasMore && (
                    <div className="border-t border-white/10 px-4 py-3 flex justify-center">
                        <button
                            onClick={loadMore}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 text-xs text-white/80 hover:text-white font-semibold px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            {isLoading
                                ? <><Loader2 size={14} className="animate-spin" /> กำลังโหลด</>
                                : <>โหลดเพิ่ม ({total - items.length} รายการ)</>}
                        </button>
                    </div>
                )}

                {hasAny && !hasMore && (
                    <div className="border-t border-white/10 px-4 py-3 text-center text-[11px] text-white/40">
                        — สิ้นสุดรายการ —
                    </div>
                )}
            </div>
        </div>
    )
}
