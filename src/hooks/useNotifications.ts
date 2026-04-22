'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Mirror of the DB row shape — only the fields the UI actually reads.
export interface NotificationRow {
    id: string
    type: string
    title: string
    body: string | null
    action_url: string | null
    action_label: string | null
    entity_type: string | null
    entity_id: string | null
    reference_code: string | null
    icon: string | null
    color:
        | 'maroon' | 'green' | 'red' | 'amber' | 'blue' | 'gray'
        | null
    is_read: boolean
    read_at: string | null
    sender_user_id: string | null
    sender_name: string | null
    metadata: Record<string, unknown> | null
    created_at: string
    expires_at: string | null
}

const POLL_INTERVAL_MS = 30_000

/**
 * Notification center state + actions.
 *
 * Invariants:
 *   - `count` is always accurate for the badge (polled every 30 s
 *     when the tab is visible; paused when hidden).
 *   - `items` is loaded lazily the first time the dropdown opens.
 *     Call `refetch()` any time it needs to re-load (e.g. after the
 *     user scrolls or reopens).
 *   - All mutations (markRead / markAllRead / remove) are optimistic
 *     — UI updates immediately and the network call happens in the
 *     background. A fetch error is logged but the UI doesn't revert
 *     because notification state is soft and non-critical.
 */
export function useNotifications() {
    const [count, setCount] = useState(0)
    const [items, setItems] = useState<NotificationRow[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchCount = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications/unread-count', {
                cache: 'no-store',
            })
            if (!res.ok) return
            const json = await res.json()
            if (typeof json.count === 'number') setCount(json.count)
        } catch {
            /* swallow — transient network errors are expected */
        }
    }, [])

    const refetch = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/notifications/list?limit=20', {
                cache: 'no-store',
            })
            if (!res.ok) return
            const json = await res.json()
            setItems(Array.isArray(json.items) ? json.items as NotificationRow[] : [])
            if (typeof json.unread_count === 'number') setCount(json.unread_count)
            setHasLoaded(true)
        } catch (err) {
            console.error('[useNotifications] refetch error:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const markRead = useCallback(async (id: string) => {
        setItems(prev => prev.map(n =>
            n.id === id && !n.is_read
                ? { ...n, is_read: true, read_at: new Date().toISOString() }
                : n,
        ))
        setCount(prev => Math.max(0, prev - 1))
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
        } catch (err) {
            console.error('[useNotifications] markRead error:', err)
        }
    }, [])

    const markAllRead = useCallback(async () => {
        setItems(prev => prev.map(n => n.is_read ? n : {
            ...n, is_read: true, read_at: new Date().toISOString(),
        }))
        setCount(0)
        try {
            await fetch('/api/notifications/mark-all-read', { method: 'POST' })
        } catch (err) {
            console.error('[useNotifications] markAllRead error:', err)
        }
    }, [])

    const remove = useCallback(async (id: string) => {
        setItems(prev => {
            const target = prev.find(n => n.id === id)
            if (target && !target.is_read) setCount(c => Math.max(0, c - 1))
            return prev.filter(n => n.id !== id)
        })
        try {
            await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
        } catch (err) {
            console.error('[useNotifications] remove error:', err)
        }
    }, [])

    // Polling lifecycle: tied to Page Visibility so a hidden tab doesn't
    // burn battery or rack up API calls. Starts immediately on mount.
    useEffect(() => {
        const start = () => {
            if (pollRef.current) return
            pollRef.current = setInterval(fetchCount, POLL_INTERVAL_MS)
        }
        const stop = () => {
            if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
            }
        }
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                void fetchCount() // immediate refresh on refocus
                start()
            } else {
                stop()
            }
        }
        void fetchCount()
        if (document.visibilityState === 'visible') start()
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            stop()
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [fetchCount])

    return {
        count,
        items,
        isLoading,
        hasLoaded,
        refetch,
        fetchCount,
        markRead,
        markAllRead,
        remove,
    }
}
