'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogOut, Menu, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/login/action'
import { NAVIGATION_CONFIG } from '@/config/navigation'
import { ModeToggle } from '@/components/mode-toggle'

interface DashboardShellProps {
    children: React.ReactNode
    role: 'hr_admin' | 'employee'
    userName?: string
}

// ... existing imports ...

// ... existing interface ...

// ... imports ...

export function DashboardShell({ children, role, userName }: DashboardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)

    // Navigation Items based on Role (Dynamic)
    const navItems = NAVIGATION_CONFIG[role] || []

    return (
        <div className="flex min-h-screen bg-brand-gradient dark:bg-background pt-16 lg:pt-0 transition-colors duration-300">
            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={toggleMobileMenu} />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen transition-all duration-300 ease-in-out lg:relative",
                    "bg-brand-gradient dark:bg-card border-r border-white/10 dark:border-border",
                    "text-white dark:text-card-foreground",
                    sidebarOpen ? "w-64" : "w-20",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Sidebar Header */}
                <div className="flex flex-col h-auto pt-10 pb-6 border-b border-white/10 dark:border-border bg-black/20 dark:bg-transparent">
                    <div className="flex items-center justify-between px-6">
                        <Link href="/dashboard" className={cn("flex flex-col items-center gap-3", !sidebarOpen && "mx-auto")}>
                            <img
                                src="/logo-white.png"
                                alt="EBCI NEXUS"
                                className={cn(
                                    "transition-all duration-300 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]",
                                    sidebarOpen ? "h-11" : "h-7"
                                )}
                            />
                            {sidebarOpen && (
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] ml-1">V 1.0</span>
                            )}
                        </Link>

                        <div className="flex items-center gap-1">
                            {/* Desktop Toggle */}
                            {sidebarOpen && (
                                <button onClick={toggleSidebar} className="hidden lg:flex p-1.5 hover:bg-white/10 dark:hover:bg-muted rounded text-white/60 hover:text-white transition-colors">
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            {/* Mobile Close Button */}
                            <button onClick={toggleMobileMenu} className="lg:hidden p-1.5 text-white/60 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    {!sidebarOpen && (
                        <button onClick={toggleSidebar} className="hidden lg:flex p-1.5 hover:bg-white/10 dark:hover:bg-muted rounded text-white/60 hover:text-white transition-colors mt-6 mx-auto">
                            <ChevronRight size={18} />
                        </button>
                    )}
                </div>

                {/* User Profile (Top) */}
                <div className="p-4 border-b border-white/10 dark:border-border">
                    <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
                        <div className="h-9 w-9 rounded-full bg-white/20 dark:bg-muted flex items-center justify-center text-sm font-bold text-white dark:text-primary">
                            {userName ? userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        {sidebarOpen && (
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold truncate">{userName || 'User'}</p>
                                <p className="text-xs text-white/90 dark:text-muted-foreground capitalize font-medium">{role.replace('_', ' ')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                    {navItems.map((item, idx) => (
                        <Link
                            key={idx}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                                "hover:bg-white/10 dark:hover:bg-accent dark:hover:text-accent-foreground",
                                "text-white hover:text-white dark:text-muted-foreground dark:hover:text-foreground",
                                !sidebarOpen && "justify-center px-2"
                            )}
                        >
                            <item.icon size={20} />
                            {sidebarOpen && <span>{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                {/* Sign Out (Bottom) */}
                <div className="absolute bottom-0 w-full p-4 border-t border-white/10 dark:border-border">
                    <button
                        onClick={() => logout()}
                        className={cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-colors",
                            "text-white hover:bg-white/10 hover:text-white dark:text-destructive dark:hover:bg-destructive/10",
                            !sidebarOpen && "justify-center"
                        )}
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
                {/* Top Navbar */}
                <header className="h-16 flex items-center justify-between px-4 lg:px-8 absolute top-0 w-full lg:relative z-40 bg-white/5 backdrop-blur-md border-b border-white/10 dark:bg-card/80 dark:border-border text-white dark:text-foreground">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-white/80 hover:text-white dark:text-muted-foreground dark:hover:text-foreground">
                            <Menu size={24} />
                        </button>
                        {/* Mobile Logo */}
                        <Link href="/dashboard" className="lg:hidden flex items-center gap-2 group">
                            <img
                                src="/logo-white.png"
                                alt="EBCI NEXUS"
                                className="h-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-active:scale-95 transition-transform"
                            />
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] self-end mb-1">V 1.0</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <ModeToggle />
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto p-4 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
