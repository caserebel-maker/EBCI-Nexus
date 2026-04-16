'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home, Users, Bell, Megaphone, MoreHorizontal, Clock, CalendarDays,
    ClipboardCheck, CheckSquare, LogOut, FileText, UserCircle,
    Settings, ChevronRight, X, UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'hr_admin' | 'manager' | 'employee'

interface NavItem {
    label: string
    href: string
    icon: React.ElementType
    exact?: boolean
}

interface MoreItem {
    label: string
    desc?: string
    href?: string
    icon: React.ElementType
    danger?: boolean
}

const NAV_CONFIG: Record<Role, NavItem[]> = {
    hr_admin: [
        { label: 'หน้าแรก',  href: '/portal/dashboard',           icon: Home,      exact: true },
        { label: 'พนักงาน',  href: '/dashboard/employees',         icon: Users },
        { label: 'ประกาศ',   href: '/dashboard/hr/announcements',  icon: Megaphone },
        { label: 'แจ้งเตือน', href: '/portal/notifications',       icon: Bell },
    ],
    manager: [
        { label: 'หน้าแรก',  href: '/portal/dashboard',      icon: Home,       exact: true },
        { label: 'โปรไฟล์',  href: '/portal/profile',         icon: UserRound },
        { label: 'ยื่นใบลา', href: '/portal/leave',           icon: CalendarDays },
        { label: 'แจ้งเตือน', href: '/portal/notifications',  icon: Bell },
    ],
    employee: [
        { label: 'หน้าแรก',  href: '/portal/dashboard',      icon: Home,       exact: true },
        { label: 'โปรไฟล์',  href: '/portal/profile',         icon: UserRound },
        { label: 'ยื่นใบลา', href: '/portal/leave',           icon: CalendarDays },
        { label: 'แจ้งเตือน', href: '/portal/notifications',  icon: Bell },
    ],
}

const MORE_CONFIG: Record<Role, MoreItem[]> = {
    hr_admin: [
        { label: 'อนุมัติการลา', desc: 'จัดการคำขอลาพนักงาน', href: '/dashboard/leave/admin', icon: ClipboardCheck },
        { label: 'จัดการระบบ',   desc: 'ตั้งค่าและการจัดการ',  href: '/dashboard/settings',   icon: Settings },
        { label: 'รายงาน',       desc: 'ดูรายงานต่าง ๆ',        href: '/dashboard/reports',    icon: FileText },
        { label: 'ออกจากระบบ', icon: LogOut, danger: true },
    ],
    manager: [
        { label: 'อนุมัติการลา', desc: 'พิจารณาคำขอลาลูกทีม', href: '/portal/approve',   icon: CheckSquare },
        { label: 'ปฏิทิน',       desc: 'ดูตารางงาน',           href: '/portal/calendar',  icon: CalendarDays },
        { label: 'ลงเวลา',       desc: 'เช็คอิน/เช็คเอาท์',   href: '/portal/checkin',   icon: Clock },
        { label: 'ออกจากระบบ', icon: LogOut, danger: true },
    ],
    employee: [
        { label: 'ปฏิทิน',  desc: 'ดูตารางงาน',         href: '/portal/calendar', icon: CalendarDays },
        { label: 'ลงเวลา',  desc: 'เช็คอิน/เช็คเอาท์', href: '/portal/checkin',  icon: Clock },
        { label: 'ออกจากระบบ', icon: LogOut, danger: true },
    ],
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
}

interface PortalBottomNavProps {
    role: Role
}

export function PortalBottomNav({ role }: PortalBottomNavProps) {
    const pathname = usePathname()
    const [moreOpen, setMoreOpen] = useState(false)

    console.log('[bottomnav] role:', role, '| navItems:', NAV_CONFIG[role]?.map(i => i.label))

    // role comes directly from the server (portal/layout.tsx → DashboardShell → here)
    const navItems = NAV_CONFIG[role] ?? NAV_CONFIG.employee
    const moreItems = MORE_CONFIG[role] ?? MORE_CONFIG.employee

    const isNavActive = (item: NavItem) =>
        item.exact ? pathname === item.href : pathname?.startsWith(item.href)

    const isMoreActive = moreOpen || moreItems.some(
        (m) => m.href && pathname?.startsWith(m.href)
    )

    return (
        <>
            {/* Slide-up "เพิ่มเติม" panel */}
            {moreOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
                    onClick={() => setMoreOpen(false)}
                />
            )}
            <div
                className={cn(
                    'fixed left-0 right-0 z-[70] lg:hidden transition-all duration-300 ease-out',
                    moreOpen ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-4'
                )}
                style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
            >
                <div
                    className="mx-3 mb-2 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                    style={{ background: 'linear-gradient(160deg, #6b2228 0%, #8b3540 60%, #a04a55 100%)' }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <span className="text-white font-bold text-sm">เพิ่มเติม</span>
                        <button
                            onClick={() => setMoreOpen(false)}
                            className="text-white/50 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                        {moreItems.map((item, idx) => {
                            if (item.danger) {
                                return (
                                    <button
                                        key={idx}
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-red-500/20 active:bg-red-500/30 transition-colors text-left"
                                    >
                                        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/20">
                                            <item.icon size={18} className="text-red-300" />
                                        </span>
                                        <span className="text-red-300 font-semibold text-sm flex-1">{item.label}</span>
                                    </button>
                                )
                            }
                            return (
                                <Link
                                    key={idx}
                                    href={item.href!}
                                    onClick={() => setMoreOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 active:bg-white/15 transition-colors"
                                >
                                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10">
                                        <item.icon size={18} className="text-white" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-semibold text-sm">{item.label}</p>
                                        {item.desc && <p className="text-white/45 text-xs">{item.desc}</p>}
                                    </div>
                                    <ChevronRight size={14} className="text-white/30" />
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Nav Bar */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
                style={{
                    background: 'linear-gradient(135deg, #561e23 0%, #7a2d35 50%, #ad5f6c 100%)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
            >
                <div className="flex items-stretch border-t border-white/10 shadow-[0_-4px_20px_rgba(86,30,35,0.4)]">
                    {/* Regular nav items */}
                    {navItems.map((item) => {
                        const active = isNavActive(item)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMoreOpen(false)}
                                className={cn(
                                    'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 relative transition-all duration-200',
                                    active ? 'text-white' : 'text-white/50 hover:text-white/75'
                                )}
                            >
                                <item.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                                <span className={cn('text-[10px] leading-tight tracking-wide', active ? 'font-bold' : 'font-medium')}>
                                    {item.label}
                                </span>
                                {active && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                                )}
                            </Link>
                        )
                    })}

                    {/* เพิ่มเติม button */}
                    <button
                        onClick={() => setMoreOpen((v) => !v)}
                        className={cn(
                            'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 relative transition-all duration-200',
                            isMoreActive ? 'text-white' : 'text-white/50 hover:text-white/75'
                        )}
                    >
                        <MoreHorizontal size={22} strokeWidth={isMoreActive ? 2.5 : 1.8} />
                        <span className={cn('text-[10px] leading-tight tracking-wide', isMoreActive ? 'font-bold' : 'font-medium')}>
                            เพิ่มเติม
                        </span>
                        {isMoreActive && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                        )}
                    </button>
                </div>
            </nav>
        </>
    )
}
