'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home, Users, Megaphone, MoreHorizontal, Clock, CalendarDays,
    ClipboardCheck, LogOut, FileText,
    Settings, ChevronRight, X, UserRound, Network,
    UserPlus, Upload, Activity,
    MapPin, Briefcase, BarChart3, Wallet, ScrollText, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRole, type Role } from '@/contexts/role-context'

interface NavItem {
    label: string
    href: string
    icon: React.ElementType
    exact?: boolean
}

interface MoreItem {
    accent?: 'blue' | 'amber'
    label: string
    desc?: string
    href?: string
    icon: React.ElementType
    danger?: boolean
    groupLabel?: string // render a small section header above this item
}

// HR-admin shortcut block surfaced inside the /portal-mode More menu so
// admins previewing as employees can still reach admin pages without
// switching shells. Order mirrors the desktop sidebar's admin section.
const HR_ADMIN_QUICK_ACTIONS: MoreItem[] = [
    { groupLabel: 'HR Admin', label: 'จัดการประกาศ',  href: '/hradmin/announcements',         icon: Megaphone },
    {                          label: 'รับสมัครงาน',   href: '/hradmin/applicants',            icon: UserPlus },
    {                          label: 'การเข้างาน',    href: '/hradmin/attendance/reconcile',  icon: Clock },
    {                          label: 'นำเข้าข้อมูลบัตร', href: '/hradmin/attendance/import',    icon: Upload },
    {                          label: 'ระบบและทรัพยากร', href: '/hradmin/settings/quota',     icon: Activity },
]

// hr_admin has two variants depending on whether they're in /hradmin or /portal.
// The "แจ้งเตือน" bell tab was removed — it duplicated the topbar bell. Replaced
// with a role-appropriate shortcut (อนุมัติการลา in admin mode, การลา in portal).
const HR_ADMIN_NAV_HRADMIN: NavItem[] = [
    { label: 'หน้าแรก',     href: '/hradmin/dashboard',        icon: Home,      exact: true },
    { label: 'พนักงาน',     href: '/hradmin/employees',        icon: Users },
    { label: 'ประกาศ',      href: '/hradmin/hr/announcements', icon: Megaphone },
    { label: 'อนุมัติการลา', href: '/hradmin/leave/inbox',      icon: ClipboardCheck },
]
const HR_ADMIN_NAV_PORTAL: NavItem[] = [
    { label: 'หน้าแรก',  href: '/portal/dashboard',         icon: Home,      exact: true },
    { label: 'พนักงาน',  href: '/hradmin/employees',        icon: Users },
    { label: 'ประกาศ',   href: '/hradmin/hr/announcements', icon: Megaphone },
    { label: 'การลา',    href: '/portal/leave',             icon: CalendarDays },
]

const NAV_CONFIG: Record<Role, NavItem[]> = {
    hr_admin: HR_ADMIN_NAV_PORTAL, // default; overridden dynamically in component

    manager: [
        { label: 'หน้าแรก', href: '/portal/dashboard', icon: Home,        exact: true },
        { label: 'เช็คอิน', href: '/portal/checkin',   icon: Clock },
        { label: 'การลา',   href: '/portal/leave',     icon: CalendarDays },
        { label: 'โปรไฟล์', href: '/portal/profile',   icon: UserRound },
    ],
    employee: [
        { label: 'หน้าแรก', href: '/portal/dashboard', icon: Home,        exact: true },
        { label: 'เช็คอิน', href: '/portal/checkin',   icon: Clock },
        { label: 'การลา',   href: '/portal/leave',     icon: CalendarDays },
        { label: 'โปรไฟล์', href: '/portal/profile',   icon: UserRound },
    ],
}

// HR-admin variant of the More menu when viewing the /portal experience.
// Mirrors the EMPLOYEE desktop sidebar order (since portal mode = preview
// as employee), then appends the HR Admin quick-actions block so admins
// can jump back to admin pages without first switching modes via the
// topbar user-menu.
const HR_ADMIN_PORTAL_MORE: MoreItem[] = [
    { label: 'ผังองค์กร',     desc: 'ดูลำดับขั้นและสายอนุมัติ', href: '/portal/organization',  icon: Network },
    { label: 'ปฏิทิน',         desc: 'วันหยุด + WFH',             href: '/portal/calendar',     icon: CalendarDays },
    { label: 'ประกาศข่าวสาร', desc: 'ฟีดประกาศจาก HR',           href: '/portal/announcements', icon: Megaphone },
    { label: 'สลิปของฉัน',     desc: 'ดูสลิปเงินเดือนของตน',      href: '/portal/payroll',      icon: FileText },
    { label: 'ตั้งค่า',         desc: 'เปลี่ยนรหัสผ่านและบัญชี',  href: '/portal/settings',     icon: Settings },
    ...HR_ADMIN_QUICK_ACTIONS,
    { label: 'ออกจากระบบ', icon: LogOut, danger: true },
]

// Each role's More-panel order is intentionally aligned with the
// desktop sidebar order in src/config/navigation.tsx, minus the items
// already covered by the 4 fixed bottom-nav tabs above. This keeps the
// vertical scan order identical between desktop and mobile so users
// don't have to re-learn where things live.
const MORE_CONFIG: Record<Role, MoreItem[]> = {
    hr_admin: [
        // 1. Employees group — รายชื่อ is the bottom-tab "พนักงาน"; the
        //    sub-page that's NOT in the tab is ผังองค์กร.
        { label: 'ผังองค์กร',     desc: 'โครงสร้างบริษัท',        href: '/hradmin/organization',          icon: Network, groupLabel: 'พนักงาน' },
        // 2. เวลาทำงาน group
        { label: 'การเข้างาน',     desc: 'Dashboard เช็คอิน',     href: '/hradmin/attendance',            icon: MapPin, groupLabel: 'เวลาทำงาน' },
        { label: 'เช็คอินภาคสนาม', desc: 'พนักงานออกพื้นที่',     href: '/hradmin/attendance/field',      icon: Briefcase },
        { label: 'ปฏิทินบริษัท',   desc: 'วันหยุด + WFH',         href: '/hradmin/holidays',              icon: CalendarDays },
        // 3. การลา group — อนุมัติการลา is in the bottom tab.
        { label: 'ภาพรวมการลา',   desc: 'แดชบอร์ดสรุปลา',         href: '/hradmin/leave',                 icon: BarChart3, groupLabel: 'การลา' },
        { label: 'ใบลาทั้งหมด',    desc: 'รายการใบลา',             href: '/hradmin/leave?tab=requests',    icon: FileText },
        { label: 'วันลาพนักงาน',   desc: 'Balance ของพนักงาน',     href: '/hradmin/leave?tab=balances',    icon: Wallet },
        { label: 'นโยบายการลา',    desc: 'จัดการสิทธิ์การลา',      href: '/hradmin/leave/policies',        icon: ScrollText },
        // 4. รับสมัครงาน + 5. ตั้งค่าระบบ group
        { label: 'รับสมัครงาน',   desc: 'จัดการผู้สมัคร',           href: '/hradmin/applicants',            icon: UserPlus, groupLabel: 'อื่น ๆ' },
        { label: 'ระบบและทรัพยากร', desc: 'Quota + storage',      href: '/hradmin/settings/quota',        icon: Activity },
        { label: 'รายงาน',         desc: 'CSV exports',           href: '/hradmin/reports',               icon: FileText },
        { label: 'แบ็กอัพข้อมูล',  desc: 'Download ZIP สำรอง',    href: '/hradmin/settings/backup',       icon: ShieldCheck },
        { label: 'ตั้งค่าทั่วไป',   desc: 'Permission + ระบบ',     href: '/hradmin/settings',              icon: Settings },
        // Mode switching lives in the topbar user-menu dropdown.
        { label: 'ออกจากระบบ', icon: LogOut, danger: true },
    ],
    manager: [
        // Manager desktop order: Home, เช็คอิน, การลา, อนุมัติการลา,
        // ผังองค์กร, ปฏิทิน, ประกาศ, ตั้งค่า. First three live in the
        // bottom tabs; the rest go here.
        { label: 'อนุมัติการลา',   desc: 'พิจารณาคำขอลาลูกทีม',   href: '/portal/leave/inbox',  icon: ClipboardCheck },
        { label: 'ผังองค์กร',     desc: 'ดูลำดับขั้นและสายอนุมัติ', href: '/portal/organization', icon: Network },
        { label: 'ปฏิทิน',         desc: 'วันหยุด + WFH',           href: '/portal/calendar',     icon: CalendarDays },
        { label: 'ประกาศข่าวสาร', desc: 'ฟีดประกาศจาก HR',         href: '/portal/announcements', icon: Megaphone },
        { label: 'ตั้งค่า',         desc: 'เปลี่ยนรหัสผ่านและบัญชี', href: '/portal/settings',     icon: Settings },
        { label: 'ออกจากระบบ', icon: LogOut, danger: true },
    ],
    employee: [
        // Employee desktop order: Home, เช็คอิน, ข้อมูลส่วนตัว, การลา,
        // ผังองค์กร, ปฏิทิน, ประกาศ, สลิป, ตั้งค่า. The bottom tabs hold
        // Home/เช็คอิน/การลา/โปรไฟล์ — the rest belong in More.
        { label: 'ผังองค์กร',     desc: 'ดูลำดับขั้นและสายอนุมัติ', href: '/portal/organization',  icon: Network },
        { label: 'ปฏิทิน',         desc: 'วันหยุด + WFH',           href: '/portal/calendar',     icon: CalendarDays },
        { label: 'ประกาศข่าวสาร', desc: 'ฟีดประกาศจาก HR',         href: '/portal/announcements', icon: Megaphone },
        { label: 'สลิปของฉัน',     desc: 'ดูสลิปเงินเดือน',         href: '/portal/payroll',      icon: FileText },
        { label: 'ตั้งค่า',         desc: 'เปลี่ยนรหัสผ่านและบัญชี', href: '/portal/settings',     icon: Settings },
        { label: 'ออกจากระบบ', icon: LogOut, danger: true },
    ],
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
}

export function PortalBottomNav() {
    const role = useRole()
    const pathname = usePathname()
    const [moreOpen, setMoreOpen] = useState(false)

    const navItems = pathname?.startsWith('/hradmin')
        ? HR_ADMIN_NAV_HRADMIN
        : NAV_CONFIG.employee
    const moreItems = pathname?.startsWith('/hradmin')
        ? MORE_CONFIG.hr_admin
        : (role === 'hr_admin' ? HR_ADMIN_PORTAL_MORE : MORE_CONFIG.employee)

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
                    <div className="p-2 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
                        {moreItems.map((item, idx) => {
                            const header = item.groupLabel
                                ? (
                                    <div
                                        key={`${idx}-header`}
                                        className="px-3 pt-3 pb-1.5 mt-1 border-t border-white/10 first:border-t-0 first:mt-0 first:pt-1"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
                                            {item.groupLabel}
                                        </span>
                                    </div>
                                )
                                : null

                            if (item.danger) {
                                return (
                                    <div key={idx}>
                                        {header}
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 w-full px-3 py-3 min-h-[56px] rounded-xl hover:bg-red-500/20 active:bg-red-500/30 transition-colors text-left"
                                        >
                                            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/20">
                                                <item.icon size={18} className="text-red-300" />
                                            </span>
                                            <span className="text-red-300 font-semibold text-sm flex-1">{item.label}</span>
                                        </button>
                                    </div>
                                )
                            }
                            const accentClass = item.accent === 'blue'
                                ? 'bg-blue-500/90 hover:bg-blue-500 active:bg-blue-600 ring-1 ring-blue-400/50 shadow-lg shadow-blue-500/20'
                                : item.accent === 'amber'
                                    ? 'bg-amber-500/90 hover:bg-amber-500 active:bg-amber-600 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/20'
                                    : 'hover:bg-white/10 active:bg-white/15'
                            const iconBgClass = item.accent
                                ? 'bg-white/20'
                                : 'bg-white/10'
                            return (
                                <div key={idx}>
                                    {header}
                                    <Link
                                        href={item.href!}
                                        onClick={() => setMoreOpen(false)}
                                        className={cn("flex items-center gap-3 px-3 py-3 min-h-[56px] rounded-xl transition-colors", accentClass)}
                                    >
                                        <span className={cn("flex items-center justify-center w-9 h-9 rounded-full", iconBgClass)}>
                                            <item.icon size={18} className="text-white" />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold text-sm">{item.label}</p>
                                            {item.desc && <p className={cn("text-xs", item.accent ? "text-white/80" : "text-white/45")}>{item.desc}</p>}
                                        </div>
                                        <ChevronRight size={14} className={item.accent ? "text-white/70" : "text-white/30"} />
                                    </Link>
                                </div>
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
