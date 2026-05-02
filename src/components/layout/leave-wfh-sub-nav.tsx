'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Palmtree, Home, CalendarHeart, Calendar, ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Shared chip-row sub-nav for the "การลาและ WFH" hub pages. Sits at
 * the top of /portal/leave, /portal/wfh, /portal/comp-days,
 * /portal/calendar, /portal/leave-policy so the user can hop between
 * leave-adjacent surfaces in one tap without going back to the main
 * nav.
 *
 * Why: the mobile bottom-nav now has a single "ลา/WFH" tab pointing at
 * /portal/leave. Without this row, getting from ใบลาของฉัน to ขอ WFH
 * was 3 taps (More → expand "การลาและ WFH" → "ขอ WFH"). This makes
 * it 1 tap, on every leave-adjacent page.
 *
 * Active item is detected from pathname; all others render as muted
 * chips with hover state.
 */

interface ChipDef {
    label: string
    href: string
    icon: React.ElementType
    /** Match the entire path tree (e.g. "/portal/wfh" should also be
     *  active on "/portal/wfh/inbox"). Empty array = exact match only. */
    activePrefixes?: string[]
}

const CHIPS: ChipDef[] = [
    { label: 'ใบลา',         href: '/portal/leave',        icon: Palmtree,      activePrefixes: ['/portal/leave'] },
    { label: 'ขอ WFH',       href: '/portal/wfh',          icon: Home,          activePrefixes: ['/portal/wfh'] },
    { label: 'วันหยุดสะสม',  href: '/portal/comp-days',    icon: CalendarHeart, activePrefixes: ['/portal/comp-days'] },
    { label: 'ปฏิทิน',       href: '/portal/calendar',     icon: Calendar,      activePrefixes: ['/portal/calendar'] },
    { label: 'นโยบาย',       href: '/portal/leave-policy', icon: ScrollText,    activePrefixes: ['/portal/leave-policy'] },
]

/** Treat /portal/leave/inbox as ใบลา (approver inbox is a leave action,
 *  not its own hub stop). Same for /portal/wfh/inbox under ขอ WFH. */
function isChipActive(chip: ChipDef, pathname: string | null): boolean {
    if (!pathname) return false
    const prefixes = chip.activePrefixes ?? [chip.href]
    return prefixes.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function LeaveWfhSubNav() {
    const pathname = usePathname()
    return (
        <nav
            className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide"
            aria-label="การลาและ WFH"
        >
            {CHIPS.map(chip => {
                const active = isChipActive(chip, pathname)
                const Icon = chip.icon
                return (
                    <Link
                        key={chip.href}
                        href={chip.href}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors shrink-0 whitespace-nowrap border',
                            active
                                ? 'bg-amber-400 text-black border-amber-300 shadow-sm'
                                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                        )}
                        aria-current={active ? 'page' : undefined}
                    >
                        <Icon size={13} />
                        {chip.label}
                    </Link>
                )
            })}
        </nav>
    )
}
