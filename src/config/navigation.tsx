import {
    LayoutDashboard, Users, UserCircle, FileText, Settings, Megaphone,
    CalendarDays, CalendarCheck, ClipboardCheck, ShieldCheck, CalendarOff, MapPin, Network,
    Activity, ScrollText, BarChart3, Clock, Calendar, Briefcase, User,
    Gift, Wallet, CheckCircle, Database,
} from 'lucide-react'
import { ROLES, type UserRole } from './roles'

/**
 * Navigation node — supports either a leaf (just `href`) or a group
 * (no `href`, has `children`). When both are set, clicking the parent
 * still navigates to `href` but `children` are rendered as a submenu.
 *
 * `matchPrefix` lets a group stay highlighted on URLs that don't start
 * with its own href — e.g. the "การลา" group aggregates both /hradmin/leave
 * and /portal/leave paths so it lights up for either.
 */
export interface NavItem {
    label: string
    href?: string
    icon: any // LucideIcon
    children?: NavItem[]
    /** Extra URL prefixes that should mark this item active. */
    matchPrefix?: string[]
}

export const NAVIGATION_CONFIG: Record<UserRole, NavItem[]> = {
    [ROLES.HR_ADMIN]: [
        {
            label: 'dashboard.title',
            href: '/hradmin/dashboard',
            icon: LayoutDashboard,
        },
        {
            label: 'dashboard.employees',
            icon: Users,
            matchPrefix: ['/hradmin/employees', '/hradmin/organization'],
            children: [
                { label: 'รายชื่อ',   href: '/hradmin/employees',    icon: User },
                { label: 'ผังองค์กร', href: '/hradmin/organization', icon: Network },
            ],
        },
        {
            label: 'ประกาศข่าวสาร',
            href: '/hradmin/announcements',
            icon: Megaphone,
        },
        {
            label: 'เวลาทำงาน',
            icon: Clock,
            matchPrefix: ['/hradmin/attendance', '/hradmin/holidays', '/hradmin/reports'],
            children: [
                { label: 'การเข้างาน',          href: '/hradmin/attendance',                icon: MapPin },
                { label: 'เช็คอินภาคสนาม',      href: '/hradmin/attendance/field',          icon: Briefcase },
                { label: 'ปฏิทินบริษัท',        href: '/hradmin/holidays',                  icon: CalendarDays },
                { label: 'ส่งออกข้อมูล (CSV)', href: '/hradmin/reports?tab=attendance',    icon: FileText },
            ],
        },
        {
            label: 'การลา',
            icon: Calendar,
            // The group lights up on /hradmin/leave* AND /portal/leave*
            // because "ของฉัน" lives under /portal.
            matchPrefix: ['/hradmin/leave', '/portal/leave'],
            children: [
                { label: 'ภาพรวม',        href: '/hradmin/leave',              icon: BarChart3 },
                { label: 'ใบลาทั้งหมด',   href: '/hradmin/leave?tab=requests', icon: FileText },
                { label: 'วันลาพนักงาน',  href: '/hradmin/leave?tab=balances', icon: Wallet },
                { label: 'ปฏิทิน',        href: '/hradmin/leave?tab=calendar', icon: CalendarDays },
                { label: 'ของฉัน',        href: '/portal/leave',               icon: UserCircle },
                // HR admins get the /hradmin variant of the inbox so approving
                // a request doesn't flip the shell into employee mode. Manager
                // + employee nav entries (below) still use /portal.
                { label: 'อนุมัติการลา',   href: '/hradmin/leave/inbox',        icon: CheckCircle },
                { label: 'นโยบายการลา',  href: '/hradmin/leave/policies',     icon: ScrollText },
            ],
        },
        {
            label: 'รับสมัครงาน',
            href: '/hradmin/applicants',
            icon: Briefcase,
        },
        {
            label: 'ตั้งค่าระบบ',
            icon: Settings,
            matchPrefix: ['/hradmin/settings', '/hradmin/reports'],
            children: [
                { label: 'ระบบและทรัพยากร', href: '/hradmin/settings/quota',  icon: Database },
                { label: 'รายงาน',           href: '/hradmin/reports',         icon: FileText },
                { label: 'แบ็กอัพข้อมูล',    href: '/hradmin/settings/backup', icon: ShieldCheck },
                { label: 'ตั้งค่าทั่วไป',      href: '/hradmin/settings',        icon: Settings },
            ],
        },
    ],
    [ROLES.MANAGER]: [
        { label: 'dashboard.title', href: '/hradmin/dashboard', icon: LayoutDashboard },
        { label: 'เช็คอิน', href: '/portal/checkin', icon: MapPin },
        { label: 'leave.myLeave', href: '/portal/leave', icon: CalendarCheck },
        { label: 'อนุมัติการลา', href: '/portal/leave/inbox', icon: ClipboardCheck },
        { label: 'ผังองค์กร', href: '/portal/organization', icon: Network },
        { label: 'ปฏิทิน', href: '/portal/calendar', icon: Calendar },
        { label: 'dashboard.announcements', href: '/portal/announcements', icon: Megaphone },
        { label: 'ตั้งค่า', href: '/portal/settings', icon: Settings },
    ],
    [ROLES.EMPLOYEE]: [
        { label: 'dashboard.portal', href: '/portal', icon: LayoutDashboard },
        { label: 'เช็คอิน', href: '/portal/checkin', icon: MapPin },
        { label: 'recruitment.personalInfo', href: '/portal/profile', icon: UserCircle },
        { label: 'leave.myLeave', href: '/portal/leave', icon: CalendarCheck },
        // "อนุมัติการลา" intentionally NOT in the default — it's appended
        // dynamically in shell.tsx for users with employees.is_approver = true.
        // Pure-employee accounts who never approve anyone don't see an empty
        // inbox menu item.
        { label: 'ผังองค์กร', href: '/portal/organization', icon: Network },
        { label: 'ปฏิทิน', href: '/portal/calendar', icon: Calendar },
        { label: 'dashboard.announcements', href: '/portal/announcements', icon: Megaphone },
        // Was '/portal/payslips' which doesn't exist as a route — the actual
        // page is at '/portal/payroll'. Fixed Apr 28.
        { label: 'สลิปของฉัน', href: '/portal/payroll', icon: FileText },
        { label: 'ตั้งค่า', href: '/portal/settings', icon: Settings },
    ],
}
