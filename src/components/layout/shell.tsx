'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
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
}

export function DashboardShell({ children, role, userName }: DashboardShellProps) {
    const pathname = usePathname()
    const { t } = useTranslation()

    useEffect(() => {
        console.log('[shell] role prop received:', role)
    }, [role])

    // Navigation Items based on Role (Dynamic)
    const navItems = NAVIGATION_CONFIG[role] || []

    return (
        <div className="flex h-screen overflow-hidden bg-brand-gradient bg-fixed dark:bg-background lg:pt-0 transition-colors duration-300">
            {/* Sidebar — hidden on mobile (bottom nav handles navigation), visible on desktop */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen flex flex-col transition-all duration-300 ease-in-out",
                    "bg-brand-gradient bg-fixed dark:bg-card border-r border-white/10 dark:border-border",
                    "text-white dark:text-card-foreground",
                    "w-64 shadow-2xl",
                    "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Sidebar Header */}
                <div className="flex flex-col shrink-0 pt-12 pb-10">
                    <div className="flex flex-col items-center justify-center px-4 w-full">
                        <Link href="/dashboard" className="flex flex-col items-center gap-4 group">
                            <img
                                src="/sidebar-logo.png"
                                alt="EBCI NEXUS"
                                className="transition-all duration-300 drop-shadow-[0_4px_6px_rgba(255,255,255,0.25)] h-16"
                            />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] ml-1 group-hover:text-white/40 transition-colors">V 1.0</span>
                        </Link>
                    </div>
                </div>

                {/* User Profile (Top) */}
                <div className="p-4 border-b border-white/10 dark:border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-white/20 dark:bg-muted flex items-center justify-center text-sm font-bold text-white dark:text-primary">
                            {userName ? userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{userName || 'User'}</p>
                            <p className="text-xs text-white/90 dark:text-muted-foreground capitalize font-medium">{role.replace('_', ' ')}</p>
                        </div>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="p-4 space-y-2 flex-1 overflow-y-auto pb-20">
                    {navItems.map((item, idx) => {
                        const isActive = item.href === '/dashboard'
                            ? pathname === '/dashboard'
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
                <div className="absolute bottom-0 w-full p-4 border-t border-white/10 dark:border-border">
                    <button
                        onClick={async () => {
                            await fetch('/api/auth/logout', { method: 'POST' })
                            window.location.href = '/login'
                        }}
                        className={cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-colors",
                            "text-white hover:bg-white/10 hover:text-white dark:text-destructive dark:hover:bg-destructive/10"
                        )}
                    >
                        <LogOut size={20} />
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
                        href={role === 'hr_admin' ? '/dashboard' : '/portal'}
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
                    {children}
                    {/* Mobile bottom nav spacer — height = nav bar + iPhone safe area */}
                    <div
                        className="lg:hidden shrink-0"
                        aria-hidden="true"
                        style={{ height: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
                    />
                </div>
            </main>

            {/* Mobile Bottom Navigation — all roles */}
            <PortalBottomNav role={role} />
        </div>
    )
}
