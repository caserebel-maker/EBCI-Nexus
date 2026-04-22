'use client'

import {
    Bell, Calendar, CheckCircle, XCircle, Ban, Megaphone, UserPlus,
    Briefcase, Info, type LucideIcon,
} from 'lucide-react'
import type { NotificationRow } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

/** Map icon names (from `notifications.icon` column) to Lucide components. */
const ICON_MAP: Record<string, LucideIcon> = {
    Bell, Calendar, CheckCircle, XCircle, Ban, Megaphone, UserPlus,
    Briefcase, Info,
}

type Color = NonNullable<NotificationRow['color']>

// Per-color palette for the left stripe + unread dot + icon bubble.
// Keep the whole item on the same dark brand canvas — the stripe +
// icon tint carries the semantic.
const COLORS: Record<Color, {
    stripe: string       // solid bg class for the left accent
    iconBg: string       // bg for the icon bubble
    iconFg: string       // fg for the icon
    dot: string          // unread dot
}> = {
    maroon: { stripe: 'bg-[#ad5f6c]', iconBg: 'bg-[#ad5f6c]/20', iconFg: 'text-[#f9c5cd]', dot: 'bg-[#ad5f6c]' },
    green:  { stripe: 'bg-emerald-400', iconBg: 'bg-emerald-400/15', iconFg: 'text-emerald-200', dot: 'bg-emerald-400' },
    red:    { stripe: 'bg-red-400',    iconBg: 'bg-red-400/15',    iconFg: 'text-red-200',    dot: 'bg-red-400' },
    amber:  { stripe: 'bg-amber-400',  iconBg: 'bg-amber-400/15',  iconFg: 'text-amber-200',  dot: 'bg-amber-400' },
    blue:   { stripe: 'bg-sky-400',    iconBg: 'bg-sky-400/15',    iconFg: 'text-sky-200',    dot: 'bg-sky-400' },
    gray:   { stripe: 'bg-white/30',   iconBg: 'bg-white/10',      iconFg: 'text-white/70',   dot: 'bg-white/50' },
}

export function NotificationItem({
    n,
    onClick,
}: {
    n: NotificationRow
    onClick: (n: NotificationRow) => void
}) {
    const palette = COLORS[n.color ?? 'maroon']
    const Icon = ICON_MAP[n.icon ?? 'Bell'] ?? Bell
    const isUnread = !n.is_read

    return (
        <button
            type="button"
            onClick={() => onClick(n)}
            className={cn(
                'relative w-full flex items-start gap-3 pl-4 pr-3 py-3 text-left transition-colors',
                'hover:bg-white/5 active:bg-white/10',
                !isUnread && 'opacity-65 hover:opacity-90',
            )}
        >
            {/* Left accent stripe — colored for unread, muted for read */}
            <span
                aria-hidden="true"
                className={cn(
                    'absolute left-0 top-2 bottom-2 w-1 rounded-r',
                    isUnread ? palette.stripe : 'bg-white/10',
                )}
            />

            {/* Icon bubble */}
            <span className={cn(
                'flex-shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center',
                palette.iconBg,
            )}>
                <Icon size={16} className={palette.iconFg} />
            </span>

            {/* Body */}
            <div className="flex-1 min-w-0">
                <p className="flex items-center gap-2 text-white text-sm font-semibold leading-snug">
                    {isUnread && (
                        <span
                            aria-label="ยังไม่ได้อ่าน"
                            className={cn('w-2 h-2 rounded-full flex-shrink-0', palette.dot)}
                        />
                    )}
                    <span className="truncate">{n.title}</span>
                </p>
                {n.body && (
                    <p className="mt-0.5 text-xs text-white/70 line-clamp-2 leading-relaxed">
                        {n.body}
                    </p>
                )}
                <p className="mt-1 text-[11px] text-white/45">
                    {n.sender_name && <span>โดย {n.sender_name} · </span>}
                    {formatRelative(n.created_at)}
                </p>
            </div>
        </button>
    )
}

// Relative Thai time formatter — small enough to inline rather than
// pulling in dayjs for just this one use.
function formatRelative(iso: string): string {
    const d = new Date(iso)
    const diffMs = Date.now() - d.getTime()
    const sec = Math.floor(diffMs / 1000)
    if (sec < 60) return 'เมื่อสักครู่'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min} นาทีที่แล้ว`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr} ชม.ที่แล้ว`
    const day = Math.floor(hr / 24)
    if (day < 7) return `${day} วันที่แล้ว`
    return d.toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short', year: '2-digit',
    })
}
