'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const THRESHOLD = 64 // px the indicator must travel before release reloads
const MAX_PULL = 96

/**
 * Pull-to-refresh for the shell's inner scroll container.
 *
 * The app scrolls inside a div (not the window), so the browser's native
 * pull-to-refresh never fires — and never does in the home-screen PWA.
 * Pull down from the very top and release past the threshold to reload,
 * same action as the topbar refresh button.
 *
 * Ignored while a modal has locked body scroll, and when the touch starts
 * inside a nested scroller that isn't at its own top.
 */
export function PullToRefresh({ scrollRef }: { scrollRef: React.RefObject<HTMLElement | null> }) {
    const [pull, setPull] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const pullRef = useRef(0)

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        let startY: number | null = null

        const setPullBoth = (value: number, animate = false) => {
            pullRef.current = value
            setPull(value)
            // Content follows the finger like the native iOS pull; springs
            // back with a transition when released.
            el.style.transition = animate ? 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
            el.style.transform = value ? `translateY(${value}px)` : ''
        }

        const nestedScrolled = (target: EventTarget | null) => {
            let node = target as HTMLElement | null
            while (node && node !== el) {
                if (node.scrollTop > 0) return true
                node = node.parentElement
            }
            return false
        }

        const onStart = (e: TouchEvent) => {
            startY = null
            if (e.touches.length !== 1) return
            if (el.scrollTop > 0) return
            if (document.body.style.overflow === 'hidden') return
            if (nestedScrolled(e.target)) return
            startY = e.touches[0].clientY
        }

        const onMove = (e: TouchEvent) => {
            if (startY === null) return
            const dy = e.touches[0].clientY - startY
            if (dy <= 0 || el.scrollTop > 0) {
                if (pullRef.current) setPullBoth(0, true)
                return
            }
            // Resistance so it feels like it's being stretched.
            setPullBoth(Math.min(dy * 0.6, MAX_PULL))
            if (e.cancelable) e.preventDefault()
        }

        const onEnd = () => {
            if (startY === null) return
            startY = null
            if (pullRef.current >= THRESHOLD) {
                setRefreshing(true)
                setPullBoth(THRESHOLD * 0.75, true)
                window.location.reload()
            } else {
                setPullBoth(0, true)
            }
        }

        el.addEventListener('touchstart', onStart, { passive: true })
        el.addEventListener('touchmove', onMove, { passive: false })
        el.addEventListener('touchend', onEnd)
        el.addEventListener('touchcancel', onEnd)
        return () => {
            el.removeEventListener('touchstart', onStart)
            el.removeEventListener('touchmove', onMove)
            el.removeEventListener('touchend', onEnd)
            el.removeEventListener('touchcancel', onEnd)
        }
    }, [scrollRef])

    if (!pull && !refreshing) return null

    // Small circular spinner in the gap the content leaves behind, just under
    // the top bar (z-index lower than the bar, so it never covers it).
    const progress = Math.min(pull / THRESHOLD, 1)
    return (
        <div
            className="pointer-events-none fixed left-0 right-0 z-[55] flex justify-center lg:hidden print:hidden"
            style={{
                top: 'calc(env(safe-area-inset-top) + 66px)',
                transform: `translateY(${Math.max(pull * 0.9 - 36, 4)}px)`,
                opacity: refreshing ? 1 : progress,
            }}
            role="status"
            aria-label={refreshing ? 'กำลังรีเฟรช' : 'ดึงลงเพื่อรีเฟรช'}
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white shadow-lg ring-1 ring-white/20 backdrop-blur">
                <RefreshCw
                    className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
                    style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
                />
            </div>
        </div>
    )
}
