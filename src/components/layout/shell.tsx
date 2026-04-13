'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, X, ChevronRight, ChevronLeft } from 'lucide-react'
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)
    const { t } = useTranslation() // Hook

    // Navigation Items based on Role (Dynamic)
    const navItems = NAVIGATION_CONFIG[role] || []

    return (
        <div className="flex h-screen overflow-hidden bg-brand-gradient bg-fixed dark:bg-background pt-16 lg:pt-0 transition-colors duration-300">
            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={toggleMobileMenu} />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen flex flex-col transition-all duration-300 ease-in-out",
                    "bg-brand-gradient bg-fixed dark:bg-card border-r border-white/10 dark:border-border",
                    "text-white dark:text-card-foreground",
                    "w-64 shadow-2xl",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
                <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-white/10 dark:bg-card/80 dark:border-border text-white dark:text-foreground">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-white/80 hover:text-white dark:text-muted-foreground dark:hover:text-foreground">
                            <Menu size={24} />
                        </button>
                        {/* Mobile Logo */}
                        <Link href="/dashboard" className="lg:hidden flex items-center gap-2 group">
                            <img
                                src="/sidebar-logo.png"
                                alt="EBCI NEXUS"
                                className="h-10 drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)] group-active:scale-95 transition-transform"
                            />
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] self-end mb-1">V 1.0</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4 relative z-[100]">
                        <LanguageToggle />
                        <ModeToggle />
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto p-4 lg:p-8 pb-20 lg:pb-8">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation — all roles */}
            <PortalBottomNav role={role} />
        </div>
    )
}
