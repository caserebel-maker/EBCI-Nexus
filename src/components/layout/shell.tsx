'use client'

import { DailyGreeting } from '@/components/daily-greeting'

// Calculate tenure in Thai (e.g. "10 ปี 2 เดือน")
function calcTenure(startDate: string): string {
    const start = new Date(startDate)
    const now = new Date()
    let years = now.getFullYear() - start.getFullYear()
    let months = now.getMonth() - start.getMonth()
    if (months < 0) { years--; months += 12 }
    if (now.getDate() < start.getDate()) { months-- }
    if (months < 0) { years--; months += 12 }
    if (years <= 0 && months <= 0) return 'น้อยกว่า 1 เดือน'
    const parts: string[] = []
    if (years > 0) parts.push(`${years} ปี`)
    if (months > 0) parts.push(`${months} เดือน`)
    return parts.join(' ')
}

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAVIGATION_CONFIG } from '@/config/navigation'
import { ModeToggle } from '@/components/mode-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useTranslation } from '@/contexts/language-context'
import { PortalBottomNav } from '@/components/layout/portal-bottom-nav'

interface DashboardShellProps {
    children: React.ReactNode
    role: 'hr_admin' | 'manager' | 'employee'
    userName?: string
    showBottomNav?: boolean
    emergencyBanner?: React.ReactNode
    profile?: {
        fullName: string
        nickname: string | null
        email: string
        photoUrl: string | null
        roleLabel: string
        position: string | null
        department: string | null
        startDate: string | null
        dateOfBirth: string | null
    }
}

export function DashboardShell({ children, role, userName, showBottomNav = false, profile, emergencyBanner }: DashboardShellProps) {
    const pathname = usePathname()
    const { t } = useTranslation()

    // Navigation Items — HR Admin in /portal sees employee nav (their "portal mode")
    const effectiveRole = (role === 'hr_admin' && pathname?.startsWith('/portal')) ? 'employee' : role
    const navItems = NAVIGATION_CONFIG[effectiveRole] || []

    return (
        <div className="flex h-screen overflow-hidden bg-brand-gradient bg-fixed dark:bg-background lg:pt-0 transition-colors duration-300">
            {/* Sidebar — hidden on mobile (bottom nav handles navigation), visible on desktop */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen flex flex-col transition-all duration-300 ease-in-out",
                    "bg-brand-gradient bg-fixed dark:bg-card",
                    "text-white dark:text-card-foreground",
                    "w-64 shadow-2xl",
                    "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Sidebar Header */}
                <div className="flex flex-col shrink-0 pt-3 pb-1 2xl:pt-6 2xl:pb-4">
                    <div className="flex flex-col items-center justify-center px-4 w-full">
                        <Link href="/hradmin" className="flex flex-col items-center gap-1 2xl:gap-4 group">
                            <img
                                src="/sidebar-logo.png"
                                alt="EBCI NEXUS"
                                className="transition-all duration-300 drop-shadow-[0_4px_6px_rgba(255,255,255,0.25)] h-10 2xl:h-12"
                            />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] ml-1 group-hover:text-white/40 transition-colors">V 1.0</span>
                        </Link>
                    </div>
                </div>

                {/* User Profile Card — compact horizontal */}
                <div className="px-4 pb-3 pt-0 shrink-0 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden shadow-lg shadow-black/40 ring-2 ring-white/25 bg-white/10 shrink-0">
                        {profile?.photoUrl ? (
                            <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-base font-bold text-white">
                                {(profile?.fullName ?? userName ?? 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">
                            {profile?.fullName ?? userName ?? 'User'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60"></span>
                            <p className="text-[11px] text-white/70 truncate">
                                {profile?.roleLabel ?? role} · Online
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mode Switcher (HR Admin only) — below profile */}
                {role === 'hr_admin' && (
                    <div className="shrink-0 w-full px-3 pb-3">
                        <Link
                            href={pathname?.startsWith('/hradmin') ? '/portal/dashboard' : '/hradmin/dashboard'}
                            className={cn(
                                "flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg transition-all font-semibold shadow-lg",
                                pathname?.startsWith('/hradmin')
                                    ? "bg-blue-500/90 hover:bg-blue-500 text-white shadow-blue-500/30 ring-1 ring-blue-400/50"
                                    : "bg-amber-500/90 hover:bg-amber-500 text-white shadow-amber-500/30 ring-1 ring-amber-400/50"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <RefreshCw size={14} />
                                <span className="text-xs">
                                    {pathname?.startsWith('/hradmin') ? 'สลับเป็นพนักงาน' : 'กลับเป็น HR Admin'}
                                </span>
                            </div>
                            <span className="text-sm">→</span>
                        </Link>
                    </div>
                )}

                {/* Nav Links */}
                <nav className="p-4 space-y-2 lg:space-y-1 flex-1 overflow-y-auto min-h-0 text-[11px] 2xl:text-sm [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded">
                    {navItems.map((item, idx) => {
                        const isActive = item.href === '/hradmin'
                            ? pathname === '/hradmin'
                            : pathname?.startsWith(item.href)

                        return (
                            <Link
                                key={idx}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200",
                                    "hover:bg-white/10 dark:hover:bg-accent dark:hover:text-accent-foreground",
                                    isActive
                                        ? "bg-white/15 text-white shadow-lg shadow-black/5 ring-1 ring-white/10"
                                        : "text-white/70 hover:text-white dark:text-muted-foreground dark:hover:text-foreground"
                                )}
                            >
                                <item.icon size={20} className={cn(isActive && "text-white")} />
                                <span className={cn(isActive && "font-semibold")}>{t(item.label)}</span>
                            </Link>
                        )
                    })}
                </nav>


                {/* Sign Out (Bottom) */}
                <div className="shrink-0 w-full px-2 pb-3">
                    <button
                        onClick={async () => {
                            await fetch('/api/auth/logout', { method: 'POST' })
                            window.location.href = '/login'
                        }}
                        className={cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-all duration-200",
                            "text-red-300 hover:bg-red-500/20 hover:text-red-200 font-semibold"
                        )}
                    >
                        <LogOut size={16} />
                        <span>{t('auth.signOut')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area — offset for fixed sidebar on desktop */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent lg:pl-64">
                {/* Top Navbar */}
                <header
                    className="h-auto flex items-center justify-between border-b border-white/10 dark:bg-card/80 dark:border-border text-white dark:text-foreground px-3 lg:px-8 pb-1 lg:py-1"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: '8px' }}
                >
                    {/* Mobile Logo — left-aligned */}
                    <Link
                        href={role === 'hr_admin' ? '/hradmin' : '/portal'}
                        className="lg:hidden flex items-center group"
                    >
                        <img
                            src="/sidebar-logo.png"
                            alt="EBCI NEXUS"
                            className="h-[42px] lg:h-10 drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)] group-active:scale-95 transition-transform"
                        />
                    </Link>

                    {/* Right: refresh (mobile only) + toggles */}
                    <div className="flex items-center gap-3 relative z-[100] ml-auto">
                        <button
                            onClick={() => window.location.reload()}
                            className="lg:hidden p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                            aria-label="Refresh"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </button>
                        <LanguageToggle />
                        <ModeToggle />
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto p-4 lg:p-8">
                    {/* Priority alerts — top of content on every viewport */}
                    {emergencyBanner && <div className="mb-4">{emergencyBanner}</div>}

                    {/* Mobile Identity Header — shown on every page */}
                    <div className="lg:hidden mb-4 pb-4 border-b border-white/10">
                        {/* Greeting — daily/payday/birthday */}
                        <DailyGreeting
                            variant="mobile"
                            nickname={profile?.nickname}
                            dateOfBirth={profile?.dateOfBirth}
                            className="mb-3 pb-3 border-b border-white/10"
                        />
                        <div className="flex items-center gap-3">
                            <div className="h-14 w-14 rounded-full overflow-hidden shadow-md shadow-black/30 ring-2 ring-white/20 bg-white/10 shrink-0">
                                {profile?.photoUrl ? (
                                    <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-lg font-bold text-white">
                                        {(profile?.fullName ?? userName ?? 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-white truncate leading-tight">
                                    {profile?.fullName ?? userName ?? 'User'}
                                </p>
                                {(profile?.position || profile?.department) && (
                                    <p className="text-xs text-white/70 truncate mt-1">
                                        {profile?.position}
                                        {profile?.position && profile?.department && <span className="text-white/30 mx-1.5">·</span>}
                                        {profile?.department}
                                    </p>
                                )}
                                {profile?.startDate && (
                                    <p className="text-xs text-white/55 truncate mt-0.5">
                                        อายุงาน {calcTenure(profile.startDate)}
                                    </p>
                                )}
                                <p className="text-xs text-white/55 truncate mt-0.5">
                                    {profile?.email ?? ''} &middot; {profile?.roleLabel ?? role}
                                </p>
                            </div>
                        </div>
                    </div>

                    {children}
                    {/* Mobile bottom nav spacer — height = nav bar + iPhone safe area */}
                    <div
                        className="lg:hidden shrink-0"
                        aria-hidden="true"
                        style={{ height: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
                    />
                </div>
            </main>

            {/* Mobile Bottom Navigation — portal only */}
            {showBottomNav && <PortalBottomNav />}
        </div>
    )
}
