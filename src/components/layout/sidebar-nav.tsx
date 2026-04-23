'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/config/navigation'
import { useTranslation } from '@/contexts/language-context'

const STORAGE_KEY = 'nexus:sidebar:expanded'

/** Split an href like "/hradmin/leave?tab=requests" into ["/hradmin/leave", "tab=requests"]. */
function splitHref(href: string): { path: string; query: string } {
    const i = href.indexOf('?')
    if (i < 0) return { path: href, query: '' }
    return { path: href.slice(0, i), query: href.slice(i + 1) }
}

/** Does the current location match this leaf's exact href (including query)? */
function isLeafActive(href: string | undefined, pathname: string, currentQuery: string): boolean {
    if (!href) return false
    const { path, query } = splitHref(href)

    // Special-case /hradmin (the dashboard link equivalent)
    const pathMatches =
        path === '/hradmin'
            ? pathname === '/hradmin'
            : pathname === path || pathname.startsWith(path + '/')
    if (!pathMatches) return false

    if (query) {
        // Item targets a specific ?tab=...; require every key/value to match.
        const target = new URLSearchParams(query)
        const actual = new URLSearchParams(currentQuery)
        for (const [k, v] of target.entries()) {
            if (actual.get(k) !== v) return false
        }
        return true
    }
    // Item has no query — only match a bare URL (no ?tab=) so query-siblings
    // don't all highlight at the same time.
    const actual = new URLSearchParams(currentQuery)
    return !actual.has('tab')
}

/**
 * Does any portion of a group match the current location?
 * Used to highlight parent items and auto-expand on arrival.
 */
function isGroupActive(
    item: NavItem,
    pathname: string,
    currentQuery: string,
): boolean {
    if (item.href && isLeafActive(item.href, pathname, currentQuery)) return true
    if (item.matchPrefix) {
        for (const p of item.matchPrefix) {
            if (pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p)) {
                return true
            }
        }
    }
    if (item.children) {
        for (const c of item.children) {
            if (c.href && isLeafActive(c.href, pathname, currentQuery)) return true
        }
    }
    return false
}

interface Props {
    items: NavItem[]
    /** Invoked whenever a link is clicked — lets parent close a mobile drawer. */
    onNavigate?: () => void
}

/**
 * Sidebar nav renderer.
 *
 *   • Flat leaves render as a single Link (unchanged visual from before).
 *   • Groups (with `children`) render as a row that toggles a submenu.
 *     Click anywhere on the row toggles; if the group itself has an
 *     `href`, a separate chevron button handles the toggle so the label
 *     area still navigates.
 *   • The active group auto-expands on mount and persists user toggles
 *     to localStorage under `nexus:sidebar:expanded`.
 */
export function SidebarNav({ items, onNavigate }: Props) {
    const pathname = usePathname() ?? ''
    const searchParams = useSearchParams()
    const currentQuery = searchParams?.toString() ?? ''
    const { t } = useTranslation()

    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [hydrated, setHydrated] = useState(false)

    // Hydrate from localStorage + force-expand the active group so users
    // always land on their section with the submenu open.
    useEffect(() => {
        let stored: string[] = []
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY)
            stored = raw ? JSON.parse(raw) : []
        } catch {
            // ignore — treat as empty
        }
        const set = new Set<string>(Array.isArray(stored) ? stored : [])
        for (const item of items) {
            if (item.children && isGroupActive(item, pathname, currentQuery)) {
                set.add(item.label)
            }
        }
        setExpanded(set)
        setHydrated(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length, pathname, currentQuery])

    const toggle = (label: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(label)) next.delete(label)
            else next.add(label)
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
            } catch {
                // ignore quota / disabled storage
            }
            return next
        })
    }

    return (
        <>
            {items.map((item, idx) => {
                const hasChildren = Array.isArray(item.children) && item.children.length > 0
                const highlighted = isGroupActive(item, pathname, currentQuery)
                // Before hydration we mirror the active state so SSR + first
                // paint don't flash everything collapsed.
                const isOpen = hasChildren
                    ? (hydrated ? expanded.has(item.label) : highlighted)
                    : false
                const label = t(item.label)

                const rowClass = cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                    'hover:bg-white/10 dark:hover:bg-accent dark:hover:text-accent-foreground',
                    highlighted
                        ? 'bg-white/15 text-white shadow-lg shadow-black/5 ring-1 ring-white/10'
                        : 'text-white/70 hover:text-white dark:text-muted-foreground dark:hover:text-foreground',
                )

                if (!hasChildren) {
                    return (
                        <Link
                            key={idx}
                            href={item.href || '#'}
                            onClick={onNavigate}
                            className={rowClass}
                        >
                            <item.icon size={20} className={cn(highlighted && 'text-white')} />
                            <span className={cn('truncate', highlighted && 'font-semibold')}>
                                {label}
                            </span>
                        </Link>
                    )
                }

                // Group row — either a Link + chevron button (if href set)
                // or a single button (pure group).
                return (
                    <div key={idx}>
                        {item.href ? (
                            <div className={cn(rowClass, 'pr-1.5')}>
                                <Link
                                    href={item.href}
                                    onClick={onNavigate}
                                    className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                    <item.icon size={20} className={cn(highlighted && 'text-white')} />
                                    <span className={cn('truncate', highlighted && 'font-semibold')}>
                                        {label}
                                    </span>
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => toggle(item.label)}
                                    aria-label={isOpen ? 'ย่อรายการย่อย' : 'ขยายรายการย่อย'}
                                    aria-expanded={isOpen}
                                    className="ml-1 p-1 rounded hover:bg-white/15 text-white/60 hover:text-white transition-colors"
                                >
                                    <ChevronDown
                                        size={16}
                                        className={cn('transition-transform', isOpen && 'rotate-180')}
                                    />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => toggle(item.label)}
                                aria-expanded={isOpen}
                                className={cn(rowClass, 'w-full text-left')}
                            >
                                <item.icon size={20} className={cn(highlighted && 'text-white')} />
                                <span className={cn('flex-1 truncate', highlighted && 'font-semibold')}>
                                    {label}
                                </span>
                                <ChevronDown
                                    size={16}
                                    className={cn(
                                        'transition-transform shrink-0',
                                        isOpen ? 'rotate-180 text-white/80' : 'text-white/40',
                                    )}
                                />
                            </button>
                        )}

                        {/* Submenu */}
                        {isOpen && (
                            <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-0.5">
                                {item.children!.map((child, ci) => {
                                    const childActive = isLeafActive(child.href, pathname, currentQuery)
                                    return (
                                        <Link
                                            key={ci}
                                            href={child.href || '#'}
                                            onClick={onNavigate}
                                            className={cn(
                                                'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all duration-150',
                                                'hover:bg-white/10',
                                                childActive
                                                    ? 'bg-white/10 text-white'
                                                    : 'text-white/60 hover:text-white/90',
                                            )}
                                        >
                                            {child.icon && (
                                                <child.icon
                                                    size={15}
                                                    className={cn('shrink-0', childActive && 'text-white')}
                                                />
                                            )}
                                            <span className={cn('truncate', childActive && 'font-semibold')}>
                                                {t(child.label)}
                                            </span>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </>
    )
}
