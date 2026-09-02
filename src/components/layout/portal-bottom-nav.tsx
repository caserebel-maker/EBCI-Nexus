'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home, Users, Megaphone, MoreHorizontal, CalendarDays, Palmtree,
    ClipboardCheck, LogOut, FileText,
    Settings, ChevronRight, ChevronDown, X, UserRound, Network,
    UserPlus, Activity, DoorOpen,
    MapPin, Briefcase, BarChart3, Wallet, ScrollText, ShieldCheck,
    CalendarHeart, UserMinus, AlertTriangle, UserCheck, MessageSquare,
    Calendar, GitBranch, MailWarning, Sparkles, ReceiptText,
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
    isEvent?: boolean
}

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
    { label: 'การลา',    href: '/portal/leave',             icon: Palmtree },
]

const NAV_CONFIG: Record<Role, NavItem[]> = {
    hr_admin: HR_ADMIN_NAV_PORTAL, // default; overridden dynamically in component

    // Bottom tabs = the 4 most-frequent destinations. Slot choices:
    //   หน้าแรก  — daily landing
    //   เช็คอิน   — every workday
    //   ลา/WFH    — open-the-app reason. Label says ลา/WFH (not just
    //              "การลา") to match the desktop sidebar's
    //              "การลาและ WFH" group; the destination is /portal/leave
    //              and that page surfaces a chip-row to the WFH /
    //              comp-day / calendar siblings so any leave-adjacent
    //              action is reachable in 1 more tap.
    //   ประกาศ   — high-frequency open reason (HR broadcasts). Replaces
    //              "โปรไฟล์" on this row — Profile moves to the More
    //              panel's "ส่วนตัว" group where it pairs naturally with
    //              สลิปของฉัน.
    manager: [
        { label: 'หน้าแรก', href: '/portal/dashboard',     icon: Home,     exact: true },
        { label: 'เช็คอิน', href: '/portal/checkin',       icon: MapPin },
        { label: 'ลา/WFH',  href: '/portal/leave',         icon: Palmtree },
        { label: 'ประกาศ',  href: '/portal/announcements', icon: Megaphone },
    ],
    employee: [
        { label: 'หน้าแรก', href: '/portal/dashboard',     icon: Home,     exact: true },
        { label: 'เช็คอิน', href: '/portal/checkin',       icon: MapPin },
        { label: 'ลา/WFH',  href: '/portal/leave',         icon: Palmtree },
        { label: 'ประกาศ',  href: '/portal/announcements', icon: Megaphone },
    ],
}

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
        { label: 'ค่าใช้จ่ายพนักงาน', desc: 'บันทึกค่าใช้จ่ายและใบเสร็จ', href: '/hradmin/expenses',       icon: ReceiptText },
        // 2. เวลาทำงาน group
        { label: 'การเข้างาน',     desc: 'Dashboard เช็คอิน',     href: '/hradmin/attendance',            icon: MapPin, groupLabel: 'การเข้างาน' },
        { label: 'เช็คอินภาคสนาม', desc: 'พนักงานออกพื้นที่',     href: '/hradmin/attendance/field',      icon: Briefcase },
        { label: 'ปฏิทินบริษัท',   desc: 'วันหยุด + WFH',         href: '/hradmin/holidays',              icon: CalendarDays },
        // 3. การลา group — อนุมัติการลา is in the bottom tab.
        { label: 'ภาพรวมการลา',   desc: 'แดชบอร์ดสรุปลา',         href: '/hradmin/leave',                 icon: BarChart3, groupLabel: 'การลา' },
        { label: 'ใบลาทั้งหมด',    desc: 'รายการใบลา',             href: '/hradmin/leave?tab=requests',    icon: FileText },
        { label: 'วันลาพนักงาน',   desc: 'Balance ของพนักงาน',     href: '/hradmin/leave?tab=balances',    icon: Wallet },
        { label: 'ปฏิทินการลา',   desc: 'ปฏิทินสรุปการลา',        href: '/hradmin/leave?tab=calendar',    icon: CalendarDays },
        { label: 'ตรวจสายอนุมัติ', desc: 'ดูผู้มีอำนาจอนุมัติ',     href: '/hradmin/leave/approval-audit', icon: GitBranch },
        { label: 'วันหยุดสะสม',   desc: 'วันหยุดชดเชยสะสม',       href: '/hradmin/comp-days',             icon: CalendarHeart },
        { label: 'นโยบายการลา',    desc: 'จัดการสิทธิ์การลา',      href: '/hradmin/leave/policies',        icon: ScrollText },
        // 4. รับสมัครงาน + 5. ตั้งค่าระบบ group
        { label: 'จองห้องประชุม', desc: 'ห้องประชุมชั้น 2',         href: '/hradmin/meeting-room',          icon: DoorOpen, groupLabel: 'อื่น ๆ' },
        { label: 'รับสมัครงาน',   desc: 'จัดการผู้สมัคร',           href: '/hradmin/applicants',            icon: UserPlus },
        { label: 'สิทธิ์การเข้าถึงระบบ', desc: 'กำหนดสิทธิ์แอดมิน', href: '/hradmin/settings/permissions', icon: ShieldCheck },
        { label: 'Audit log',             desc: 'ประวัติการแก้ไข',    href: '/hradmin/settings/audit',       icon: FileText },
        { label: 'ระบบและทรัพยากร',      desc: 'Quota + storage',    href: '/hradmin/settings/quota',       icon: Activity },
        { label: 'ผู้ใช้งานขณะนี้',        desc: 'ดูใครกำลังเปิดใช้งาน Nexus', href: '/hradmin/settings/login-monitor', icon: UserCheck },
        { label: 'Email Audit',          desc: 'ตรวจสอบประวัติอีเมล', href: '/hradmin/settings/email',        icon: MailWarning },
        { label: 'รายงาน',                desc: 'CSV exports',        href: '/hradmin/reports',              icon: FileText },
        { label: 'แบ็กอัพข้อมูล',         desc: 'Download ZIP สำรอง', href: '/hradmin/settings/backup',      icon: ShieldCheck },
        { label: 'ตั้งค่าทั่วไป',          desc: 'พิกัดออฟฟิศ + ระบบ', href: '/hradmin/settings',             icon: Settings },
        // Mode switching lives in the topbar user-menu dropdown.
        { label: 'ออกจากระบบ', icon: LogOut, danger: true },
    ],
    manager: [
        // Same shape as employee — leave-and-WFH submit surfaces are all
        // reachable via the bottom-tab "ลา/WFH" + chip-row sub-nav.
        // What stays here from the leave domain is the APPROVER inboxes,
        // since those don't appear in the chip row (chip row = submit,
        // inbox = approve). They sit as top-level items so the manager
        // can reach them in one tap from More.
        { label: 'อนุมัติการลา', desc: 'พิจารณาคำขอลาลูกทีม',     href: '/portal/leave/inbox',     icon: ClipboardCheck,  groupLabel: 'การอนุมัติ' },
        { label: 'อนุมัติ WFH',  desc: 'พิจารณาคำขอ WFH ลูกทีม',  href: '/portal/wfh/inbox',       icon: ClipboardCheck },
        // "การลาและ WFH" group
        { label: 'ใบลาของฉัน',    desc: 'ประวัติและยื่นใบลา',     href: '/portal/leave',           icon: Palmtree,        groupLabel: 'การลาและ WFH' },
        { label: 'ขอ WFH',        desc: 'ประวัติและขอ WFH',      href: '/portal/wfh',             icon: Home },
        { label: 'วันหยุดสะสม',   desc: 'วันหยุดพักผ่อนและสิทธิ์',  href: '/portal/comp-days',       icon: CalendarHeart },
        { label: 'ปฏิทิน',        desc: 'ปฏิทินการลาส่วนตัว',     href: '/portal/calendar',        icon: Calendar },
        { label: 'นโยบายการลา',  desc: 'ระเบียบการลาบริษัท',     href: '/portal/leave-policy',    icon: ScrollText },
        // "ส่วนตัว" group: profile + (manager has no payroll mgmt by default).
        { label: 'โปรไฟล์',        desc: 'ข้อมูลส่วนตัวและตำแหน่ง',  href: '/portal/profile',         icon: UserRound,       groupLabel: 'ส่วนตัว' },
        { label: 'ค่าใช้จ่าย/สวัสดิการ', desc: 'รายการที่บริษัทจ่ายให้', href: '/portal/expenses',      icon: ReceiptText },
        { label: 'ใครไม่อยู่วันนี้', desc: 'ลา · WFH · ออกพื้นที่',      href: '/portal/who-is-out',      icon: UserMinus,       groupLabel: 'บริษัท' },
        { label: 'ผังองค์กร',     desc: 'ดูลำดับขั้นและสายอนุมัติ', href: '/portal/organization',    icon: Network },
        { label: 'จองห้องประชุม', desc: 'ห้องประชุมชั้น 2',         href: '/portal/meeting-room',    icon: DoorOpen },
        { label: 'เสนอแนะ',       desc: 'ติชม ปรับปรุง หรือแจ้งปัญหา', href: '/portal/feedback',      icon: MessageSquare,   groupLabel: 'อื่น ๆ' },
        { label: 'ตั้งค่า',         desc: 'เปลี่ยนรหัสผ่านและบัญชี', href: '/portal/settings',        icon: Settings },
        { label: 'ออกจากระบบ', icon: LogOut, danger: true },
    ],
    employee: [
        // "การลาและ WFH" group
        { label: 'ใบลาของฉัน',    desc: 'ประวัติและยื่นใบลา',     href: '/portal/leave',           icon: Palmtree,        groupLabel: 'การลาและ WFH' },
        { label: 'ขอ WFH',        desc: 'ประวัติและขอ WFH',      href: '/portal/wfh',             icon: Home },
        { label: 'วันหยุดสะสม',   desc: 'วันหยุดพักผ่อนและสิทธิ์',  href: '/portal/comp-days',       icon: CalendarHeart },
        { label: 'ปฏิทิน',        desc: 'ปฏิทินการลาส่วนตัว',     href: '/portal/calendar',        icon: Calendar },
        { label: 'นโยบายการลา',  desc: 'ระเบียบการลาบริษัท',     href: '/portal/leave-policy',    icon: ScrollText },
        // "ส่วนตัว" group — personal data only (profile + slip).
        { label: 'โปรไฟล์',        desc: 'ข้อมูลส่วนตัวและตำแหน่ง',  href: '/portal/profile',        icon: UserRound,       groupLabel: 'ส่วนตัว' },
        { label: 'ค่าใช้จ่าย/สวัสดิการ', desc: 'รายการที่บริษัทจ่ายให้', href: '/portal/expenses',     icon: ReceiptText },
        { label: 'ทายบอลโลก',     desc: 'ลุ้นแชมป์เงินรางวัล 3,000 บ. 🏆', href: '/portal/events/world-cup', icon: Sparkles },
        // "บริษัท" group — read-only org-wide info.
        { label: 'ใครไม่อยู่วันนี้', desc: 'ลา · WFH · ออกพื้นที่',     href: '/portal/who-is-out',     icon: UserMinus,       groupLabel: 'บริษัท' },
        { label: 'ผังองค์กร',     desc: 'ดูลำดับขั้นและสายอนุมัติ', href: '/portal/organization',   icon: Network },
        { label: 'จองห้องประชุม', desc: 'ห้องประชุมชั้น 2',         href: '/portal/meeting-room',   icon: DoorOpen },
        { label: 'เสนอแนะ',       desc: 'ติชม ปรับปรุง หรือแจ้งปัญหา', href: '/portal/feedback',     icon: MessageSquare,   groupLabel: 'อื่น ๆ' },
        { label: 'ตั้งค่า',         desc: 'เปลี่ยนรหัสผ่านและบัญชี', href: '/portal/settings',       icon: Settings },
        { label: 'ออกจากระบบ', icon: LogOut, danger: true },
    ],
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
}

/**
 * localStorage key for the More-panel collapsed-group state. Versioned
 * so we can break the schema later without leaving stale collapse
 * states stuck on users' devices.
 */
const MORE_GROUPS_LS_KEY = 'nexus-mobile-more-groups-v1'

/** Items without a groupLabel get auto-bucketed into this fallback so
 *  the "ungrouped" section still renders predictably. */
const UNGROUPED_LABEL = 'อื่น ๆ'

interface MoreGroup {
    label: string
    items: MoreItem[]
    /** Group icon = first child's icon. So the collapsed group header
     *  visually matches a regular row (avatar circle + label) — Mod's
     *  3 May feedback was that the header used to be tiny text-only
     *  and looked nothing like the items below it. */
    icon: React.ElementType
}

/**
 * Walk the moreItems array (which uses sentinel `groupLabel` markers
 * the same way the legacy flat renderer did) and produce an array of
 * groups: { label, items[], icon } in the original order. Items without
 * a group fall back to UNGROUPED_LABEL so nothing's ever orphaned.
 */
function bucketIntoGroups(items: MoreItem[]): MoreGroup[] {
    const groups: MoreGroup[] = []
    let current: MoreGroup | null = null
    for (const item of items) {
        if (item.groupLabel) {
            current = { label: item.groupLabel, items: [item], icon: item.icon }
            groups.push(current)
        } else if (current) {
            current.items.push(item)
        } else {
            // Pre-first-group items (rare; keeps the renderer safe even
            // if a config forgets a leading groupLabel).
            current = { label: UNGROUPED_LABEL, items: [item], icon: item.icon }
            groups.push(current)
        }
    }
    return groups
}

const PENDING_POLL_MS = 5 * 60_000

function usePendingApprovalCount(): number {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let cancelled = false
        let timer: ReturnType<typeof setInterval> | null = null

        const tick = async () => {
            try {
                const res = await fetch('/api/leave/pending-count', { cache: 'no-store' })
                if (!res.ok) return
                const json = await res.json()
                if (!cancelled && typeof json.count === 'number') setCount(json.count)
            } catch {
                // ignore
            }
        }
        const start = () => {
            if (timer) return
            timer = setInterval(tick, PENDING_POLL_MS)
        }
        const stop = () => {
            if (timer) { clearInterval(timer); timer = null }
        }
        const onVisibility = () => {
            if (document.visibilityState === 'visible') { void tick(); start() }
            else stop()
        }

        void tick()
        if (document.visibilityState === 'visible') start()
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            cancelled = true
            stop()
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [])

    return count
}

export function PortalBottomNav({
    canManagePayroll = false,
    canViewAttendanceInsights = false,
    isApprover = false,
}: {
    canManagePayroll?: boolean
    canViewAttendanceInsights?: boolean
    /** True when employees.is_approver is set on the signed-in user.
     *  Drives the dynamic injection of approver inbox items at the top
     *  of the More panel so employee-role approvers can act on requests
     *  from mobile (matches the desktop sidebar injection in shell.tsx). */
    isApprover?: boolean
}) {
    const role = useRole()
    const pathname = usePathname()
    const pendingCount = usePendingApprovalCount()
    const [moreOpen, setMoreOpen] = useState(false)
    /**
     * Per-group expand/collapse state. Default = all collapsed (Mod's
     * request — "ทำเป็น เมนูซ่อนก่อน"). Persisted to localStorage so a
     * user who always opens "การลาและ WFH" doesn't have to re-expand
     * it every time.
     */
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
        if (typeof window === 'undefined') return {}
        try {
            const raw = window.localStorage.getItem(MORE_GROUPS_LS_KEY)
            return raw ? JSON.parse(raw) as Record<string, boolean> : {}
        } catch { /* localStorage disabled / private mode — ignore */ }
        return {}
    })
    const toggleGroup = useCallback((label: string) => {
        setExpandedGroups(prev => {
            const next = { ...prev, [label]: !prev[label] }
            try {
                window.localStorage.setItem(MORE_GROUPS_LS_KEY, JSON.stringify(next))
            } catch { /* ignore */ }
            return next
        })
    }, [])

    const isHrAdminMode = role === 'hr_admin' && pathname?.startsWith('/hradmin')
    const baseMoreItems = role === 'manager'
        ? MORE_CONFIG.manager
        : MORE_CONFIG.employee
    const payrollMoreItems: MoreItem[] = canManagePayroll
        ? [
            {
                label: 'อัปโหลดสลิปเงินเดือน',
                desc: 'สำหรับผู้ดูแลเงินเดือน',
                href: '/hradmin/payroll/bulk',
                icon: Wallet,
                accent: 'blue',
                groupLabel: 'เงินเดือน',
            },
        ]
        : []
    // Approver inboxes — injected only when an EMPLOYEE-role user has
    // employees.is_approver=true. Manager role already has these baked
    // into MORE_CONFIG.manager; HR admins have them in their hr_admin
    // mobile menu. So this branch covers exactly the gap: employees who
    // are also approvers (e.g. หัวหน้าแผนกที่อยู่ใน role 'employee'
    // เพราะไม่ได้ถูกตั้ง role manager). Sits at the top of the More
    // panel so they can act on requests in 1 tap.
    const approverMoreItems: MoreItem[] = ((role === 'employee' || role === 'hr_admin') && isApprover)
        ? [
            {
                label: 'อนุมัติการลา',
                desc: 'พิจารณาคำขอลาลูกทีม',
                href: '/portal/leave/inbox',
                icon: ClipboardCheck,
                groupLabel: 'การอนุมัติ',
            },
            {
                label: 'อนุมัติ WFH',
                desc: 'พิจารณาคำขอ WFH ลูกทีม',
                href: '/portal/wfh/inbox',
                icon: ClipboardCheck,
            },
        ]
        : []
    const attendanceInsightsMoreItems: MoreItem[] = (isHrAdminMode && canViewAttendanceInsights)
        ? [
            {
                label: 'สถิติขาด ลา มาสาย',
                desc: 'พนักงานที่ควรติดตาม',
                href: '/hradmin/attendance/insights',
                icon: AlertTriangle,
            },
        ]
        : []

    const navItems = isHrAdminMode
        ? HR_ADMIN_NAV_HRADMIN
        : (role === 'manager' ? NAV_CONFIG.manager : NAV_CONFIG.employee)
    // Only true HR admins get the admin mobile menu. Payroll-manager
    // employees like สุชาติ may visit /hradmin/payroll/bulk, but their
    // nav should remain a normal employee nav with one extra payroll item.
    const moreItems = isHrAdminMode
        ? [
            MORE_CONFIG.hr_admin[0],
            MORE_CONFIG.hr_admin[1],
            ...attendanceInsightsMoreItems,
            ...MORE_CONFIG.hr_admin.slice(2),
        ]
        : [...payrollMoreItems, ...approverMoreItems, ...baseMoreItems]

    // Pre-compute group buckets for the collapsible renderer. Memoized so
    // we don't re-bucket on every keystroke into the route bar.
    const moreGroups = useMemo(() => bucketIntoGroups(moreItems), [moreItems])

    // Auto-expand groups that contain the active route — saves the user
    // from "where did I just come from" confusion when reopening More
    // after navigating somewhere via search/deep-link. Other groups
    // honour the persisted state.
    const isGroupExpanded = (group: MoreGroup): boolean => {
        const explicit = expandedGroups[group.label]
        if (typeof explicit === 'boolean') return explicit
        // Default behaviour: expand if any child is the active route,
        // otherwise collapsed (matches Mod's "ซ่อนก่อน" request).
        return group.items.some(it => it.href && pathname?.startsWith(it.href))
    }

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
                    style={{
                        // Panel was a flat solid maroon gradient. Drop the
                        // alpha to 0.70 + add backdrop-blur so the page
                        // bleeds through ~30% — the panel reads as "above"
                        // rather than "blocking" while text + dividers
                        // stay fully opaque on top of it.
                        background: 'linear-gradient(160deg, rgba(107,34,40,0.70) 0%, rgba(139,53,64,0.70) 60%, rgba(160,74,85,0.70) 100%)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                    }}
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
                        {moreGroups.map((group) => {
                            const expanded = isGroupExpanded(group)
                            const groupActive = group.items.some(it => it.href && pathname?.startsWith(it.href))
                            const GroupIcon = group.icon
                            return (
                                <div key={group.label} className="mt-1 first:mt-0">
                                    {/* Group header — same row layout as the
                                        items below it (avatar circle + label
                                        + chevron) so collapsed groups don't
                                        feel like a different style of element.
                                        Mod's 3 May call: header was tiny text
                                        + chevron only and looked nothing like
                                        the regular rows below. */}
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.label)}
                                        className={cn(
                                            'flex items-center gap-3 w-full px-3 py-3 min-h-[56px] rounded-xl transition-colors',
                                            groupActive
                                                ? 'bg-white/10 hover:bg-white/15'
                                                : 'hover:bg-white/10 active:bg-white/15'
                                        )}
                                        aria-expanded={expanded}
                                    >
                                        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 shrink-0">
                                            <GroupIcon size={18} className="text-white" />
                                        </span>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-white font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                                                <span>{group.label}</span>
                                                <span className="text-white/45 font-medium text-xs">
                                                    ({group.items.length})
                                                </span>
                                                {group.label === 'การอนุมัติ' && pendingCount > 0 && (
                                                    <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-amber-400 text-[#561e23] px-1.5 py-0.5 text-[9px] font-black ring-1 ring-amber-200/50 shadow">
                                                        {pendingCount}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-white/45">
                                                {expanded ? 'แตะเพื่อย่อเก็บ' : 'แตะเพื่อขยาย'}
                                            </p>
                                        </div>
                                        <ChevronDown
                                            size={16}
                                            className={cn(
                                                'text-white/55 transition-transform shrink-0',
                                                expanded ? 'rotate-0' : '-rotate-90'
                                            )}
                                        />
                                    </button>

                                    {/* Group children — only rendered when
                                        expanded. Inset by pl-3 + a left
                                        border so they read as "nested under
                                        the parent header", not as siblings. */}
                                    {expanded && (
                                        <div className="mt-1 flex flex-col gap-1 pl-3 border-l-2 border-white/10 ml-5">
                                            {group.items.map((item, idx) => {
                                                if (item.danger) {
                                                    return (
                                                        <button
                                                            key={`${group.label}-${idx}`}
                                                            onClick={handleLogout}
                                                            className="flex items-center gap-3 w-full px-3 py-3 min-h-[56px] rounded-xl hover:bg-red-500/20 active:bg-red-500/30 transition-colors text-left"
                                                        >
                                                            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/20">
                                                                <item.icon size={18} className="text-red-300" />
                                                            </span>
                                                            <span className="text-red-300 font-semibold text-sm flex-1">{item.label}</span>
                                                        </button>
                                                    )
                                                }
                                                const isEvent = item.isEvent
                                                const accentClass = item.accent === 'blue'
                                                    ? 'bg-blue-500/90 hover:bg-blue-500 active:bg-blue-600 ring-1 ring-blue-400/50 shadow-lg shadow-blue-500/20'
                                                    : item.accent === 'amber'
                                                        ? 'bg-amber-500/90 hover:bg-amber-500 active:bg-amber-600 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/20'
                                                        : isEvent
                                                            ? 'ring-2 ring-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.4)] border-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 animate-pulse'
                                                            : 'hover:bg-white/10 active:bg-white/15'
                                                const iconBgClass = item.accent ? 'bg-white/20' : isEvent ? 'bg-yellow-400/20' : 'bg-white/10'
                                                const isItemActive = item.href ? pathname?.startsWith(item.href) : false
                                                return (
                                                    <Link
                                                        key={`${group.label}-${idx}`}
                                                        href={item.href!}
                                                        onClick={() => setMoreOpen(false)}
                                                        className={cn(
                                                            'flex items-center gap-3 px-3 py-3 min-h-[56px] rounded-xl transition-colors',
                                                            accentClass,
                                                            !item.accent && !isEvent && isItemActive ? 'bg-white/10' : ''
                                                        )}
                                                        style={isEvent ? { border: '1px solid rgba(250,204,21,0.3)' } : undefined}
                                                    >
                                                        <span className={cn('flex items-center justify-center w-9 h-9 rounded-full', iconBgClass)}>
                                                            <item.icon size={18} className={isEvent ? 'text-yellow-300 animate-bounce' : 'text-white'} />
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={cn('font-semibold text-sm flex items-center gap-1.5', isEvent ? 'text-yellow-100 font-extrabold' : 'text-white')}>
                                                                <span>{item.label}</span>
                                                                {(item.href === '/portal/leave/inbox' || item.href === '/hradmin/leave/inbox') && pendingCount > 0 && (
                                                                    <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-amber-400 text-[#561e23] px-1.5 py-0.5 text-[9px] font-black ring-1 ring-amber-200/50 shadow">
                                                                        {pendingCount}
                                                                    </span>
                                                                )}
                                                            </p>
                                                            {item.desc && <p className={cn('text-xs', item.accent ? 'text-white/80' : isEvent ? 'text-yellow-200/60 font-semibold' : 'text-white/45')}>{item.desc}</p>}
                                                        </div>
                                                        <ChevronRight size={14} className={item.accent ? 'text-white/70' : isEvent ? 'text-yellow-300/80' : 'text-white/30'} />
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
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
                        <div className="relative">
                            <MoreHorizontal size={22} strokeWidth={isMoreActive ? 2.5 : 1.8} />
                            {pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-[#561e23] text-[8px] font-black flex items-center justify-center border border-[#561e23] animate-pulse">
                                    {pendingCount}
                                </span>
                            )}
                        </div>
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
