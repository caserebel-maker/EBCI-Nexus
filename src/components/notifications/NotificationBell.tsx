'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationDropdown } from './NotificationDropdown'

/**
 * Bell icon + unread-count badge + dropdown trigger.
 *
 * Sits in the shell topbar. Owns the `useNotifications` hook so the
 * count badge stays accurate without the dropdown being mounted.
 */
export function NotificationBell() {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const state = useNotifications()

    // Outside-click closes the desktop dropdown (mobile uses the
    // backdrop inside NotificationDropdown itself).
    useEffect(() => {
        if (!open) return
        const onClick = (e: MouseEvent) => {
            const target = e.target as Node
            if (rootRef.current && !rootRef.current.contains(target)) {
                setOpen(false)
            }
        }
        window.addEventListener('mousedown', onClick)
        return () => window.removeEventListener('mousedown', onClick)
    }, [open])

    const badge = state.count > 0
        ? state.count > 9 ? '9+' : String(state.count)
        : null

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-label={badge ? `การแจ้งเตือน ${badge} รายการใหม่` : 'การแจ้งเตือน'}
                className={cn(
                    'relative h-14 w-14 rounded-full flex items-center justify-center transition-all',
                    'text-white/80 hover:text-white hover:bg-white/10 active:scale-95',
                    open && 'bg-white/10 text-white',
                )}
            >
                <Bell size={28} strokeWidth={open ? 2.5 : 2.2} />
                {badge && (
                    <span
                        className="absolute top-1 right-1 min-w-[22px] h-[22px] rounded-full bg-red-500 text-white text-[12px] font-bold flex items-center justify-center px-1 ring-2 ring-[rgb(60,15,20)] shadow-lg shadow-red-500/40"
                        aria-hidden="true"
                    >
                        {badge}
                    </span>
                )}
            </button>

            <NotificationDropdown
                open={open}
                onClose={() => setOpen(false)}
                state={state}
            />
        </div>
    )
}
