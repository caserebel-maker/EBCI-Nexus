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

    React.useEffect(() => {
        const sendHeartbeat = () => {
            fetch('/api/portal/heartbeat', { method: 'POST' }).catch(() => {})
        }
        sendHeartbeat()
        const interval = setInterval(sendHeartbeat, 120 * 1000)
        return () => clearInterval(interval)
    }, [])

    // Navigation Items — HR Admin in /portal sees employee nav (their "portal mode")
    const effectiveRole = (role === 'hr_admin' && pathname?.startsWith('/portal')) ? 'employee' : role
    const baseItems = NAVIGATION_CONFIG[effectiveRole] || []

    // Permission-driven extras — appended on top of the role's base nav
    // for users who hold an allow-list flag the role itself doesn't grant.
    // Per user request (Apr 28): keep admin/manager/employee shells as-is,
    // just bolt one extra menu onto the employee that bridges them into a
    // single /hradmin admin page. No mode toggle needed.
    const perms = permissions ?? EMPTY_PERMISSIONS
    const navItems: NavItem[] = baseItems
        .map(item => ({
            ...item,
            children: item.children?.filter(child =>
                child.href !== '/hradmin/attendance/insights'
                || perms.can_view_attendance_insights,
            ),
        }))
        .filter(item => item.href || (item.children?.length ?? 0) > 0)
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
    // Approver inbox injection — "อนุมัติการลา" + "อนุมัติ WFH" were
    // removed from the EMPLOYEE default and instead appended only when
    // the employee has been designated an approver via
    // employees.is_approver. HR admins are excluded from this branch
    // because they already get /hradmin/leave/inbox in their main nav,
    // and the /portal preview should mirror a regular-employee experience.
    //
    // The "การลาและ WFH" group is the home for these inboxes. We inject
    // both right after "ใบลาของฉัน" and "ขอ WFH" respectively so they
    // sit next to the surfaces they review. Clone the group so we never
    // mutate the imported config (modules are singletons across renders).
    if (
        effectiveRole === 'employee'
        && profile?.isApprover
    ) {
        const leaveInbox: NavItem = {
            label: 'อนุมัติการลา',
            href: '/portal/leave/inbox',
            icon: ClipboardCheck,
        }
        const wfhInbox: NavItem = {
            label: 'อนุมัติ WFH',
            href: '/portal/wfh/inbox',
            icon: ClipboardCheck,
        }
        const groupIndex = navItems.findIndex(
            i => i.label === 'การลาและ WFH' && Array.isArray(i.children),
        )
        if (groupIndex >= 0) {
            const group = navItems[groupIndex]
            const children = [...(group.children ?? [])]
            // Insert each approver inbox immediately after the matching
            // "submit" surface so the order is: ใบลาของฉัน → อนุมัติการลา
            // → ขอ WFH → อนุมัติ WFH → (rest). Skip injection if it's
            // already there (fast-refresh / re-render).
            const insertAfter = (afterHref: string, item: NavItem) => {
                if (children.some(c => c.href === item.href)) return
                const idx = children.findIndex(c => c.href === afterHref)
                if (idx < 0) { children.push(item); return }
                children.splice(idx + 1, 0, item)
            }
            insertAfter('/portal/leave', leaveInbox)
            insertAfter('/portal/wfh', wfhInbox)
            navItems[groupIndex] = { ...group, children }
        } else {
            // Defensive fallback: if the group is missing entirely (config
            // drift), append the inboxes as top-level items so they stay
            // reachable.
            if (!navItems.some(i => i.href === '/portal/leave/inbox')) navItems.push(leaveInbox)
            if (!navItems.some(i => i.href === '/portal/wfh/inbox')) navItems.push(wfhInbox)
        }
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
                        <Link
                            href={pathname?.startsWith('/portal') ? '/portal/dashboard' : '/hradmin/dashboard'}
                            className="flex flex-col items-center gap-1 2xl:gap-4 group"
                        >
                            <img
                                src="/sidebar-logo.png"
                                alt="EBCI NEXUS"
                                className="transition-all duration-300 drop-shadow-[0_4px_6px_rgba(255,255,255,0.25)] h-10 2xl:h-12"
                            />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] ml-1 group-hover:text-white/40 transition-colors">V 1.0</span>
                        </Link>
                    </div>
                </div>

                {/* User Profile Card — compact horizontal.
                    Dual-role users (HR Admin who can toggle into /portal
                    preview) get a coloured ring + mode indicator dot so
                    "which mode am I in" is unambiguous at a glance.
                    Single-role employees keep the original neutral ring. */}
                {(() => {
                    // Mode-indicator palette mirrors the chunky "สลับเป็น
                    // พนักงาน" / "กลับเป็น HR Admin" toggle button below:
                    //   /hradmin (HR Admin mode) → blue
                    //   /portal  (employee preview) → amber
                    // Single source of truth for "what colour means which
                    // mode" across the desktop sidebar + the mobile topbar
                    // user-menu trigger (see user-menu.tsx).
                    const isDualRole = role === 'hr_admin'
                    const inHradminMode = isDualRole && pathname?.startsWith('/hradmin')
                    const ringClass = isDualRole
                        ? (inHradminMode ? 'ring-[3px] ring-blue-500' : 'ring-[3px] ring-amber-500')
                        : 'ring-2 ring-white/25'
                    const dotColor = inHradminMode ? '#3b82f6' : '#f59e0b'
                    const adminModeLabel = profile?.roleLabel ?? 'Admin'
                    const modeLabel = !isDualRole
                        ? null
                        : inHradminMode ? `โหมด ${adminModeLabel}` : 'โหมดพนักงาน'
                    return (
                        <div className="px-4 pb-3 pt-0 shrink-0 flex items-center gap-3">
                            <div className="relative shrink-0">
                                <div className={cn(
                                    'h-10 w-10 rounded-full overflow-hidden shadow-lg shadow-black/40 bg-white/10',
                                    ringClass,
                                )}>
                                    {profile?.photoUrl ? (
                                        <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-base font-bold text-white">
                                            {(profile?.fullName ?? userName ?? 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                {/* Mode dot — only on dual-role accounts.
                                    border-[3px] punches the dot away from the
                                    avatar ring so the two coloured pieces
                                    don't blur into one. Border colour comes
                                    from the maroon sidebar gradient (closest
                                    eyeballed match) so the dot reads as
                                    "stuck on" rather than floating. */}
                                {isDualRole && (
                                    <span
                                        aria-hidden="true"
                                        title={modeLabel ?? undefined}
                                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full"
                                        style={{
                                            background: dotColor,
                                            border: '3px solid rgb(86,30,35)',
                                        }}
                                    />
                                )}
                            </div>
                            {/* Meta lines — name + position + tenure·role + email.
                                Bumped from text-[11px] up to text-xs (12px) and
                                allowed to wrap instead of truncating; profile
                                cards on narrow sidebars used to clip "หัวหน้าฝ่าย…"
                                with no way for the user to read past the
                                ellipsis. The role + Online status share a row
                                with a green presence dot so the line still
                                reads at a glance. */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white leading-snug break-words">
                                    {profile?.fullName ?? userName ?? 'User'}
                                </p>
                                {profile?.position && (
                                    <p className="text-xs text-white/85 leading-snug break-words mt-0.5">
                                        {profile.position}
                                    </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60 shrink-0"></span>
                                    <p className="text-xs text-white/75 leading-snug">
                                        {profile?.startDate
                                            ? `อายุงาน ${calcTenure(profile.startDate)} · ${profile?.roleLabel ?? role}`
                                            : `${profile?.roleLabel ?? role} · Online`}
                                    </p>
                                </div>
                                {profile?.email && (
                                    <p className="text-xs text-white/55 leading-snug break-words mt-0.5">
                                        {profile.email}
                                    </p>
                                )}
                            </div>
                        </div>
                    )
                })()}

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
                                    {pathname?.startsWith('/hradmin') ? 'สลับเป็นพนักงาน' : `กลับเป็น ${profile?.roleLabel ?? 'Admin'}`}
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
                            "text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 font-semibold"
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
                    // Drop the dark-mode bg (`dark:bg-card/80`) — on machines
                    // whose OS / browser is in dark mode the maroon gradient
                    // body shines through but the header gets a darker
                    // overlay, producing a horizontal "stripe" across the
                    // top that didn't appear on light-mode machines. Now the
                    // header is fully transparent in both modes; the body
                    // gradient is the single source of truth for the page
                    // background.
                    className="h-auto flex items-center justify-between border-b border-white/10 text-white px-3 lg:px-8 pb-1 lg:py-1 print:hidden"
                    style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: '8px' }}
                >
                    {/* Mobile Logo — left-aligned */}
                    <Link
                        href={pathname?.startsWith('/portal') ? '/portal/dashboard' : '/hradmin/dashboard'}
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
                    {/* Topbar right cluster — slimmed down to refresh + bell
                        + user menu. The previous language toggle moved into
                        the user menu's preferences section, freeing up ~40px
                        of horizontal real estate that was crowding iPhones. */}
                    <div className="flex items-center gap-1 relative z-[60] ml-auto">
                        <button
                            onClick={() => window.location.reload()}
                            className="lg:hidden h-9 w-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
                            aria-label="Refresh"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </button>
                        <NotificationBell />
                        <UserMenu
                            fullName={profile?.fullName ?? userName ?? 'User'}
                            email={profile?.email ?? null}
                            roleLabel={profile?.roleLabel ?? role}
                            role={role}
                            photoUrl={profile?.photoUrl ?? null}
                            position={profile?.position}
                            department={profile?.department}
                            tenure={profile?.startDate ? calcTenure(profile.startDate) : null}
                        />
                    </div>
                </header>

                {/* Page Content
                    overflow-x-hidden locks horizontal scroll. Some pages
                    (employee profile, especially profiles with long
                    Thai address strings or absolute-positioned cards)
                    were producing a sliver of horizontal scroll that
                    made vertical scroll on iOS feel "wobbly" — the
                    rubber-band effect would drift sideways instead of
                    snapping. min-w-0 lets flex children shrink below
                    their intrinsic width without forcing the parent
                    to grow. */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pt-3 px-4 pb-4 lg:p-8">
                    {/* Priority alerts — top of content on every viewport.
                        Hidden on print so a one-off "ส้วมระเบิด..." banner
                        doesn't tag along with every PDF export. */}
                    {emergencyBanner && <div className="mb-4 print:hidden">{emergencyBanner}</div>}

                    {/* Mobile daily greeting — birthday / payday / dated
                        salutations. Mod's 4 May call: only show this on the
                        dashboard landing pages, not on every screen (it
                        was eating screen real-estate at the top of every
                        sub-page). The desktop dashboard has its own
                        greeting block in dashboard-client; mobile uses
                        this one because the desktop sidebar profile card
                        isn't visible on phones. */}
                    {(() => {
                        const isDashboardLanding = pathname === '/portal'
                            || pathname === '/portal/dashboard'
                            || pathname === '/hradmin/dashboard'
                        if (!isDashboardLanding) return null
                        return (
                            <div className="lg:hidden mb-3 pb-3 border-b border-white/10 print:hidden">
                                <DailyGreeting
                                    variant="mobile"
                                    nickname={profile?.nickname}
                                    dateOfBirth={profile?.dateOfBirth}
                                />
                            </div>
                        )
                    })()}

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
                    <PortalBottomNav
                        canManagePayroll={perms.can_manage_payroll && !inPortalPreview}
                        canViewAttendanceInsights={perms.can_view_attendance_insights && !inPortalPreview}
                        isApprover={!!profile?.isApprover}
                    />
                </div>
            )}
        </div>
    )
}
