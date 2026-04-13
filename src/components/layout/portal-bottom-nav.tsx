'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Clock, Bell, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
    { label: 'หน้าแรก', href: '/portal', icon: Home, exact: true },
    { label: 'ปฏิทิน', href: '/portal/calendar', icon: Calendar, exact: false },
    { label: 'ลงเวลา', href: '/portal/checkin', icon: Clock, exact: false },
    { label: 'แจ้งเตือน', href: '/portal/notifications', icon: Bell, exact: false },
    { label: 'เพิ่มเติม', href: '/portal/more', icon: MoreHorizontal, exact: false },
]

export function PortalBottomNav() {
    const pathname = usePathname()

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
            style={{
                background: 'linear-gradient(135deg, #561e23 0%, #7a2d35 50%, #ad5f6c 100%)',
            }}
        >
            <div className="flex items-stretch border-t border-white/10 shadow-[0_-4px_20px_rgba(86,30,35,0.4)]">
                {NAV_ITEMS.map((item) => {
                    const isActive = item.exact
                        ? pathname === item.href || pathname === '/portal/dashboard'
                        : pathname?.startsWith(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 transition-all duration-200 relative',
                                isActive ? 'text-white' : 'text-white/55 hover:text-white/80'
                            )}
                        >
                            <item.icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 1.8}
                                className="transition-transform duration-200"
                            />
                            <span className={cn(
                                'text-[10px] leading-tight tracking-wide',
                                isActive ? 'font-bold' : 'font-medium'
                            )}>
                                {item.label}
                            </span>
                            {isActive && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
