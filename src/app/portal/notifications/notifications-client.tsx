'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Loader2, X, Bell, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationRow } from '@/hooks/useNotifications'
import { NotificationItem } from '@/components/notifications/NotificationItem'

type Filter = 'all' | 'unread' | 'read'
type TypeKey = 'all' | 'leave' | 'announcement' | 'application' | 'system'

const PAGE_SIZE = 20
const SWIPE_REVEAL_PX = 84       // width of the action button revealed on swipe
const SWIPE_TRIGGER_PX = 56      // drag past this to commit the reveal

interface ListResponse {
    items: NotificationRow[]
    unread_count: number
    total: number
}

/**
 * Full-page notification center with three Tab 4-grade UX upgrades:
 *
 *   1. Type filter chips — narrow to leave / announcement / application /
 *      system. Server still returns everything; chip filter is client-side
 *      after fetch (cheap at 20/page).
 *   2. Date grouping — items bucket into "วันนี้ / เมื่อวาน / สัปดาห์นี้ /
 *      เก่ากว่า" using Bangkok-local date keys so 02:00 BKK lands in the
 *      right bucket.
 *   3. Swipe-to-delete — drag a row left to reveal a delete button.
 *      Tap-to-delete (the existing X) still works on desktop.
 */
export function NotificationsClient() {
    const router = useRouter()
    const [items, setItems] = useState<NotificationRow[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [total, setTotal] = useState(0)
    const [filter, setFilter] = useState<Filter>('all')
    const [typeFilter, setTypeFilter] = useState<TypeKey>('all')
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

    // Apply client-side type filter
    const visibleItems = useMemo(() => {
        if (typeFilter === 'all') return items
        return items.filter(n => matchesTypeFilter(n.type, typeFilter))
    }, [items, typeFilter])

    // Group by Bangkok-local date bucket — preserves order within each
    // bucket since the server already returned newest-first.
    const groups = useMemo(() => bucketByDate(visibleItems), [visibleItems])

    const hasMore = items.length < total && filter !== 'read'
    const hasAny = visibleItems.length > 0

    const tabs = useMemo<Array<{ key: Filter; label: string; badge?: number }>>(() => [
        { key: 'all',    label: 'ทั้งหมด' },
        { key: 'unread', label: 'ยังไม่อ่าน', badge: unreadCount },
        { key: 'read',   label: 'อ่านแล้ว' },
    ], [unreadCount])

    const typeChips: Array<{ key: TypeKey; label: string }> = [
        { key: 'all',          label: 'ทุกประเภท' },
        { key: 'leave',        label: 'การลา' },
        { key: 'announcement', label: 'ประกาศ' },
        { key: 'application',  label: 'ผู้สมัคร' },
        { key: 'system',       label: 'ระบบ' },
    ]

    return (
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 pb-8">
            {/* Header card */}
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

                {/* Filter row 1: status (all / unread / read) */}
                <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 overflow-x-auto">
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

                {/* Filter row 2: type chips */}
                <div className="flex items-center gap-1.5 px-3 pb-2.5 overflow-x-auto border-t border-white/5 pt-2">
                    {typeChips.map(c => {
                        const active = typeFilter === c.key
                        return (
                            <button
                                key={c.key}
                                onClick={() => setTypeFilter(c.key)}
                                className={cn(
                                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors',
                                    active
                                        ? 'bg-amber-400 text-[#561e23] shadow'
                                        : 'bg-white/[0.06] text-white/55 hover:bg-white/10 hover:text-white/80',
                                )}
                            >
                                {c.label}
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
                                : typeFilter !== 'all' ? `ไม่มีในหมวด "${typeChips.find(c => c.key === typeFilter)?.label}"`
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

                {hasAny && groups.map(g => (
                    <div key={g.key}>
                        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45 bg-white/[0.02] border-y border-white/5">
                            {g.label} <span className="text-white/30 font-normal">({g.items.length})</span>
                        </div>
                        <div className="divide-y divide-white/5">
                            {g.items.map(n => (
                                <SwipeRow
                                    key={n.id}
                                    item={n}
                                    onClick={onItemClick}
                                    onRemove={remove}
                                />
                            ))}
                        </div>
                    </div>
                ))}

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

            {/* Mobile hint — first time users won't know swipe is a thing */}
            <p className="sm:hidden text-[10px] text-white/35 text-center mt-2">
                💡 ปัดซ้ายที่รายการเพื่อลบ
            </p>
        </div>
    )
}

// ─── SwipeRow ──────────────────────────────────────────────────────────────

/**
 * Wraps a NotificationItem with horizontal swipe-to-delete on touch
 * devices. Drag past 56px to commit the reveal; tap the revealed
 * delete button to confirm. Desktop keeps the existing hover-X.
 */
function SwipeRow({
    item, onClick, onRemove,
}: {
    item: NotificationRow
    onClick: (n: NotificationRow) => void
    onRemove: (id: string) => void
}) {
    const [dragX, setDragX] = useState(0)
    const [revealed, setRevealed] = useState(false)
    const startXRef = useRef<number | null>(null)
    const startTRef = useRef<number>(0)

    const onTouchStart = (e: React.TouchEvent) => {
        startXRef.current = e.touches[0].clientX
        startTRef.current = revealed ? -SWIPE_REVEAL_PX : 0
    }
    const onTouchMove = (e: React.TouchEvent) => {
        if (startXRef.current === null) return
        const dx = e.touches[0].clientX - startXRef.current
        // Allow only left swipe (negative dx); clamp at -SWIPE_REVEAL_PX
        const next = Math.max(-SWIPE_REVEAL_PX, Math.min(0, startTRef.current + dx))
        setDragX(next)
    }
    const onTouchEnd = () => {
        startXRef.current = null
        // Decide commit / revert based on threshold
        if (Math.abs(dragX) > SWIPE_TRIGGER_PX) {
            setDragX(-SWIPE_REVEAL_PX)
            setRevealed(true)
        } else {
            setDragX(0)
            setRevealed(false)
        }
    }

    const close = () => {
        setDragX(0)
        setRevealed(false)
    }

    return (
        <div className="relative overflow-hidden">
            {/* Delete action panel beneath the row, revealed on swipe */}
            <button
                onClick={() => onRemove(item.id)}
                className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500/90 hover:bg-red-500 active:bg-red-600 text-white"
                style={{ width: SWIPE_REVEAL_PX }}
                aria-label="ลบ"
            >
                <Trash2 size={18} />
            </button>

            {/* Slidable row */}
            <div
                className="relative bg-[rgba(60,15,20,0.97)] transition-transform"
                style={{
                    transform: `translateX(${dragX}px)`,
                    transitionDuration: startXRef.current === null ? '180ms' : '0ms',
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="relative group" onClick={revealed ? close : undefined}>
                    <NotificationItem n={item} onClick={revealed ? () => close() : onClick} />
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
                        className="absolute top-2 right-2 w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white/35 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-200 transition-all hidden sm:flex"
                        aria-label="ลบการแจ้งเตือน"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Map a notification.type string to a coarse filter key. */
function matchesTypeFilter(type: string, filter: TypeKey): boolean {
    if (filter === 'all') return true
    if (filter === 'leave')        return type.startsWith('leave_')
    if (filter === 'announcement') return type === 'announcement'
    if (filter === 'application')  return type.startsWith('application_')
    if (filter === 'system')       return type === 'system' || type === 'system_test' || type === 'unknown'
    return false
}

interface DateGroup {
    key: string
    label: string
    items: NotificationRow[]
}

/**
 * Bucket items into "today / yesterday / this week / older" using
 * Bangkok-local date keys so a 02:00 event lands in the correct
 * calendar bucket. Order within each bucket is preserved (server is
 * already newest-first).
 */
function bucketByDate(items: NotificationRow[]): DateGroup[] {
    const today = bangkokKey(new Date())
    const yesterday = bangkokKey(new Date(Date.now() - 86_400_000))
    const weekAgo = bangkokKey(new Date(Date.now() - 7 * 86_400_000))

    const buckets: Record<string, NotificationRow[]> = {
        today: [], yesterday: [], week: [], older: [],
    }
    for (const n of items) {
        const k = bangkokKey(new Date(n.created_at))
        if (k === today) buckets.today.push(n)
        else if (k === yesterday) buckets.yesterday.push(n)
        else if (k >= weekAgo) buckets.week.push(n)
        else buckets.older.push(n)
    }

    const groups: DateGroup[] = []
    if (buckets.today.length)     groups.push({ key: 'today',     label: 'วันนี้',         items: buckets.today })
    if (buckets.yesterday.length) groups.push({ key: 'yesterday', label: 'เมื่อวาน',       items: buckets.yesterday })
    if (buckets.week.length)      groups.push({ key: 'week',      label: 'สัปดาห์นี้',     items: buckets.week })
    if (buckets.older.length)     groups.push({ key: 'older',     label: 'ก่อนหน้านั้น',   items: buckets.older })
    return groups
}

function bangkokKey(d: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(d)
    const y = parts.find(p => p.type === 'year')?.value ?? ''
    const m = parts.find(p => p.type === 'month')?.value ?? ''
    const day = parts.find(p => p.type === 'day')?.value ?? ''
    return `${y}-${m}-${day}`
}
