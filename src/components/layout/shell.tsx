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
import { LogOut, RefreshCw, Wallet, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAVIGATION_CONFIG, type NavItem } from '@/config/navigation'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useTranslation } from '@/contexts/language-context'
import { PortalBottomNav } from '@/components/layout/portal-bottom-nav'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { UserMenu } from '@/components/layout/user-menu'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { EMPTY_PERMISSIONS, type UserPermissions } from '@/lib/permissions'

interface DashboardShellProps {
    children: React.ReactNode
    role: 'hr_admin' | 'manager' | 'employee'
    userName?: string
    showBottomNav?: boolean
    emergencyBanner?: React.ReactNode
    /**
     * Per-user permission flags resolved server-side. Used to append
     * permission-gated nav items (e.g. payroll bulk upload) on top of
     * the role's base navigation. Defaults to EMPTY_PERMISSIONS so
     * callers that don't pass it (older usages) keep working — no
     * extras get appended in that case.
     */
    permissions?: UserPermissions
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
        isApprover: boolean
    }
}

export function DashboardShell({ children, role, userName, showBottomNav = false, profile, emergencyBanner, permissions }: DashboardShellProps) {
    const pathname = usePathname()
    const { t } = useTranslation()

    // Navigation Items — HR Admin in /portal sees employee nav (their "portal mode")
    const effectiveRole = (role === 'hr_admin' && pathname?.startsWith('/portal')) ? 'employee' : role
    const baseItems = NAVIGATION_CONFIG[effectiveRole] || []

    // Permission-driven extras — appended on top of the role's base nav
    // for users who hold an allow-list flag the role itself doesn't grant.
    // Per user request (Apr 28): keep admin/manager/employee shells as-is,
    // just bolt one extra menu onto the employee that bridges them into a
    // single /hradmin admin page. No mode toggle needed.
    const perms = permissions ?? EMPTY_PERMISSIONS
    const navItems: NavItem[] = [...baseItems]
    // Payroll bulk upload is an admin action — hide it when an HR admin is
    // previewing /portal so the employee-mode sidebar stays clean. The link
    // would jump them out to /hradmin anyway, which breaks the preview.
    const inPortalPreview = role === 'hr_admin' && pathname?.startsWith('/portal')
    if (
        perms.can_manage_payroll
        && !inPortalPreview
        && !navItems.some(i => i.href === '/hradmin/payroll/bulk')
    ) {
        navItems.push({
            label: 'อัปโหลดสลิปเงินเดือน',
            href: '/hradmin/payroll/bulk',
            icon: Wallet,
        })
    }
    // "อนุมัติการลา" was removed from the EMPLOYEE default — append it back
    // only when the employee has been designated an approver via
    // employees.is_approver. HR admins are excluded from this branch
    // because they already get /hradmin/leave/inbox in their main nav,
    // and the /portal preview should mirror a regular-employee experience.
    if (
        effectiveRole === 'employee'
        && role !== 'hr_admin'
        && profile?.isApprover
        && !navItems.some(i => i.href === '/portal/leave/inbox')
    ) {
        navItems.push({
            label: 'อนุมัติการลา',
            href: '/portal/leave/inbox',
            icon: ClipboardCheck,
        })
    }

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

                {/* Nav Links — SidebarNav handles nesting, active-chain,
                    and localStorage-persisted expand/collapse per group. */}
                <nav className="p-4 space-y-2 lg:space-y-1 flex-1 overflow-y-auto min-h-0 text-[11px] 2xl:text-sm [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded">
                    <SidebarNav items={navItems} />
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
                    className="h-auto flex items-center justify-between border-b border-white/10 dark:bg-card/80 dark:border-border text-white dark:text-foreground px-3 lg:px-8 pb-1 lg:py-1 print:hidden"
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

                    {/* Right: refresh (mobile only) + toggles.
                        Each control wears a persistent bg-white/10 chip
                        so the cluster reads as a grouped action bar
                        (Facebook/Messenger pattern) even with a small
                        gap between circles.

                        z-[60] creates a stacking context that sits ABOVE
                        the mobile bottom-nav (z-50) so the bell/language
                        dropdowns (which use z-[60]/[70] internally) still
                        cover the nav when open, but BELOW portaled
                        drawers/modals (z-[80]+) so a leave detail sheet
                        doesn't leave these chips floating over it. */}
                    <div className="flex items-center gap-1.5 relative z-[60] ml-auto">
                        <button
                            onClick={() => window.location.reload()}
                            className="lg:hidden h-10 w-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
                            aria-label="Refresh"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </button>
                        <NotificationBell />
                        <LanguageToggle />
                        <UserMenu
                            fullName={profile?.fullName ?? userName ?? 'User'}
                            email={profile?.email ?? null}
                            roleLabel={profile?.roleLabel ?? role}
                            role={role}
                            photoUrl={profile?.photoUrl ?? null}
                        />
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-auto pt-3 px-4 pb-4 lg:p-8">
                    {/* Priority alerts — top of content on every viewport.
                        Hidden on print so a one-off "ส้วมระเบิด..." banner
                        doesn't tag along with every PDF export. */}
                    {emergencyBanner && <div className="mb-4 print:hidden">{emergencyBanner}</div>}

                    {/* Mobile Identity Header — shown on every page.
                        `lg:hidden` only kicks in at the desktop breakpoint;
                        the print engine emulates a narrower viewport so
                        without `print:hidden` this whole identity card —
                        the daily greeting, the photo, the role line —
                        leaks into PDF exports of unrelated pages
                        (e.g. an HR printing someone else's profile would
                        see their own name + email at the top). */}
                    <div className="lg:hidden mb-3 pb-3 border-b border-white/10 print:hidden">
                        {/* Greeting — daily/payday/birthday */}
                        <DailyGreeting
                            variant="mobile"
                            nickname={profile?.nickname}
                            dateOfBirth={profile?.dateOfBirth}
                            className="mb-2 pb-2 border-b border-white/10"
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
                                {(profile?.position || profile?.department) && (() => {
                                    // Department often repeats inside the position string
                                    // ("หัวหน้าฝ่าย<dept> · ฝ่าย<dept>"). Strip the
                                    // prefix + trim, then hide the second line when
                                    // the position already carries the same name.
                                    const position = profile?.position ?? ''
                                    const department = profile?.department ?? ''
                                    const normalizedDept = department.replace(/^ฝ่าย|^แผนก/, '').trim()
                                    const isDeptInPosition =
                                        !!normalizedDept && position.includes(normalizedDept)
                                    const showDepartment = !!department && !isDeptInPosition
                                    return (
                                        <div className="mt-1 text-xs text-white/70 leading-tight">
                                            {position && (
                                                <span className="block sm:inline break-words">
                                                    {position}
                                                </span>
                                            )}
                                            {showDepartment && (
                                                <>
                                                    <span className="hidden sm:inline text-white/30 mx-1.5">·</span>
                                                    <span className="block sm:inline text-white/60 break-words">
                                                        {department}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )
                                })()}
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
                    {/* Mobile bottom nav spacer — height = nav bar + iPhone safe area.
                        print:hidden because the print engine uses a narrow
                        viewport, which makes `lg:hidden` evaluate true and
                        this spacer reserves dead space at the bottom of
                        every PDF page. */}
                    <div
                        className="lg:hidden shrink-0 print:hidden"
                        aria-hidden="true"
                        style={{ height: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
                    />
                </div>
            </main>

            {/* Mobile Bottom Navigation — portal only.
                Wrapped print:hidden for the same lg:hidden-leaks-on-print
                reason as the spacer above. */}
            {showBottomNav && (
                <div className="print:hidden">
                    <PortalBottomNav />
                </div>
            )}
        </div>
    )
}
