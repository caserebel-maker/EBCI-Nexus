'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Thin amber bar at the top of the viewport that shows progress while
 * the next page is being fetched/rendered.
 *
 * Why it exists: ม๊อด reported beta testers tapping a link → no visible
 * change for ~300-800ms while Next.js fetches the next route → users
 * thought the click didn't register and tapped again, sometimes
 * triggering double-submit on the next page. Standard fix is a global
 * navigation progress bar (YouTube/GitHub style) so even slow networks
 * give an immediate "yes I heard you" signal within ~50ms.
 *
 * Implementation: listen for clicks on internal `<a>` elements in
 * capture phase. As soon as one is seen, show the bar and animate it
 * toward 90%. When the route actually changes (pathname/searchParams),
 * snap to 100% and fade out. No runtime dependency, ~80 lines.
 *
 * Caveats:
 *   - Programmatic router.push() doesn't fire a click event so the bar
 *     won't show. We accept this — the dominant case (sidebar/menu
 *     taps) is link clicks. Server actions surface their own spinners.
 *   - Same-page anchor links and external links are skipped.
 */
export function RouteProgress() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // 0 = hidden, otherwise 0..100 (visible)
    const [progress, setProgress] = useState(0)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Whenever the route changes (pathname or query), wrap up the bar:
    // jump to 100, then fade out. This is the "navigation done" signal.
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        // If the bar was running, finish it. If it wasn't (initial mount),
        // do nothing — never flash a bar on first paint.
        setProgress((p) => (p > 0 ? 100 : 0))
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
        fadeTimeoutRef.current = setTimeout(() => setProgress(0), 250)
        return () => {
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
        }
    }, [pathname, searchParams])

    const startProgress = () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
        setProgress(20)
        intervalRef.current = setInterval(() => {
            setProgress((p) => {
                if (p >= 90) {
                    if (intervalRef.current) clearInterval(intervalRef.current)
                    return p
                }
                // Logarithmic creep — fast at first, slow near 90 so it
                // never hits 100 until the route actually loads.
                const remaining = 90 - p
                return Math.min(p + Math.max(remaining * 0.15, 1), 90)
            })
        }, 120)
    }

    // Click listener — fires the bar as soon as the user taps an
    // internal link. Capture phase so we run before Next.js's own
    // <Link> click handler. Also listens for a custom event so client
    // components that navigate with router.push() can opt in.
    useEffect(() => {
        const manualStart = () => startProgress()
        const handler = (e: MouseEvent) => {
            // Bail out on modified clicks (open in new tab, copy link, etc.)
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            if (e.button !== 0) return

            const target = e.target as HTMLElement | null
            const anchor = target?.closest?.('a')
            if (!anchor) return
            const href = anchor.getAttribute('href')
            if (!href) return
            if (anchor.target && anchor.target !== '_self') return
            // Skip downloads, mailto, tel, anchors.
            if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
            if (anchor.hasAttribute('download')) return

            // Internal-only — same-origin or relative path.
            try {
                const url = new URL(href, window.location.href)
                if (url.origin !== window.location.origin) return
                // Same URL? No navigation will happen, don't show the bar.
                if (url.pathname === window.location.pathname && url.search === window.location.search) return
            } catch {
                return
            }

            startProgress()
        }

        document.addEventListener('click', handler, true)
        window.addEventListener('nexus:route-progress:start', manualStart)
        return () => {
            document.removeEventListener('click', handler, true)
            window.removeEventListener('nexus:route-progress:start', manualStart)
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current)
        }
    }, [])

    if (progress === 0) return null

    return (
        <div
            className="fixed inset-x-0 top-0 z-[200] h-1 pointer-events-none bg-black/20"
            aria-hidden="true"
        >
            <div
                className="h-full relative overflow-hidden"
                style={{
                    width: `${progress}%`,
                    background: '#fbbf24',
                    boxShadow: '0 0 10px rgba(251,191,36,0.85), 0 0 4px rgba(251,191,36,1)',
                    transition: 'width 180ms ease-out, opacity 250ms ease-out',
                    opacity: progress >= 100 ? 0 : 1,
                }}
            >
                <div
                    className="absolute inset-y-0 right-0 w-20"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65))',
                    }}
                />
            </div>
        </div>
    )
}
