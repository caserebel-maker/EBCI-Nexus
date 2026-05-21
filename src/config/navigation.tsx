import {
    LayoutDashboard, Users, UserCircle, FileText, Settings, Megaphone,
    CalendarDays, ClipboardCheck, ShieldCheck, MapPin, Network, Palmtree,
    ScrollText, BarChart3, Clock, Calendar, Briefcase, User,
    Wallet, CheckCircle, Database, DoorOpen, GitBranch, CalendarHeart, Home,
    MailWarning, type LucideIcon,
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
    icon: LucideIcon
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
        // "พนักงาน" group covers everyone in the people pipeline —
        // current employees (รายชื่อ + ผังองค์กร) AND candidates flowing
        // through hiring (รับสมัครงาน). Different lifecycle stages of
        // the same domain.
        {
            label: 'dashboard.employees',
            icon: Users,
            matchPrefix: ['/hradmin/employees', '/hradmin/organization', '/hradmin/applicants'],
            children: [
                { label: 'รายชื่อ',     href: '/hradmin/employees',    icon: User },
                { label: 'ผังองค์กร',   href: '/hradmin/organization', icon: Network },
                { label: 'รับสมัครงาน', href: '/hradmin/applicants',   icon: Briefcase },
            ],
        },
        // "การเข้างาน" — renamed from "เวลาทำงาน" (clearer: it's about
        // who's in the office today). ปฏิทินบริษัท sits here because
        // holidays/WFH are inputs into the attendance reckoning, not a
        // leave concept per se.
        {
            label: 'การเข้างาน',
            icon: Clock,
            matchPrefix: ['/hradmin/attendance', '/hradmin/holidays', '/hradmin/reports'],
            children: [
                { label: 'การเข้างาน',          href: '/hradmin/attendance',                icon: MapPin },
                { label: 'เช็คอินภาคสนาม',      href: '/hradmin/attendance/field',          icon: Briefcase },
                { label: 'ปฏิทินบริษัท',        href: '/hradmin/holidays',                  icon: CalendarDays },
                { label: 'ส่งออกข้อมูล (CSV)', href: '/hradmin/reports?tab=attendance',    icon: FileText },
            ],
        },
        // "การลา" — slimmed: removed the duplicate "ของฉัน" link to
        // /portal/leave (HR can preview the employee surfaces via the
        // "สลับเป็นพนักงาน" toggle at the top of the sidebar — no need
        // to bake portal links into the HR menu).
        {
            label: 'การลาและ WFH',
            icon: Calendar,
            matchPrefix: ['/hradmin/leave', '/hradmin/comp-days'],
            children: [
                { label: 'ภาพรวม',        href: '/hradmin/leave',              icon: BarChart3 },
                { label: 'ใบลาทั้งหมด',   href: '/hradmin/leave?tab=requests', icon: FileText },
                { label: 'วันลาพนักงาน',  href: '/hradmin/leave?tab=balances', icon: Wallet },
                { label: 'ปฏิทินการลา',   href: '/hradmin/leave?tab=calendar', icon: CalendarDays },
                { label: 'อนุมัติการลา',   href: '/hradmin/leave/inbox',        icon: CheckCircle },
                { label: 'ตรวจสายอนุมัติ', href: '/hradmin/leave/approval-audit', icon: GitBranch },
                { label: 'วันหยุดสะสม',   href: '/hradmin/comp-days',          icon: CalendarHeart },
                { label: 'นโยบายการลา',  href: '/hradmin/leave/policies',     icon: ScrollText },
            ],
        },
        // "เนื้อหาและกิจกรรม" — new group bundling content + facility
        // booking (announcements + meeting-room). Was two separate top-
        // level items; grouping reduces main-nav count from 8 → 6.
        // (รับสมัครงาน moved up into "พนักงาน" since it's the same
        //  people-pipeline domain.)
        {
            label: 'เนื้อหาและกิจกรรม',
            icon: Megaphone,
            matchPrefix: ['/hradmin/announcements', '/hradmin/meeting-room'],
            children: [
                { label: 'ประกาศข่าวสาร', href: '/hradmin/announcements', icon: Megaphone },
                { label: 'จองห้องประชุม', href: '/hradmin/meeting-room',  icon: DoorOpen },
            ],
        },
        {
            label: 'ตั้งค่าระบบ',
            icon: Settings,
            matchPrefix: ['/hradmin/settings', '/hradmin/reports'],
            children: [
                { label: 'ระบบและทรัพยากร', href: '/hradmin/settings/quota',  icon: Database },
                { label: 'Email Audit',       href: '/hradmin/settings/email',  icon: MailWarning },
                { label: 'รายงาน',           href: '/hradmin/reports',         icon: FileText },
                { label: 'แบ็กอัพข้อมูล',    href: '/hradmin/settings/backup', icon: ShieldCheck },
                { label: 'ตั้งค่าทั่วไป',      href: '/hradmin/settings',        icon: Settings },
            ],
        },
    ],
    [ROLES.MANAGER]: [
        { label: 'dashboard.title', href: '/hradmin/dashboard', icon: LayoutDashboard },
        { label: 'เช็คอิน', href: '/portal/checkin', icon: MapPin },
        // "การลา" group — bundles all leave-adjacent surfaces so the
        // sidebar stays under 6 main items. The approver inbox sits at
        // the top of the group because it's the differentiator vs pure
        // employees (and the action a manager opens the menu to do).
        {
            label: 'การลาและ WFH',
            icon: Palmtree,
            matchPrefix: ['/portal/leave', '/portal/wfh', '/portal/comp-days', '/portal/calendar'],
            children: [
                { label: 'ใบลาของฉัน',    href: '/portal/leave',           icon: Palmtree },
                { label: 'ขอ WFH',        href: '/portal/wfh',             icon: Home },
                { label: 'อนุมัติการลา',  href: '/portal/leave/inbox',     icon: ClipboardCheck },
                { label: 'อนุมัติ WFH',   href: '/portal/wfh/inbox',       icon: ClipboardCheck },
                { label: 'วันหยุดสะสม',   href: '/portal/comp-days',       icon: CalendarHeart },
                { label: 'ปฏิทิน',        href: '/portal/calendar',        icon: Calendar },
                { label: 'นโยบายการลา',  href: '/portal/leave-policy',    icon: ScrollText },
            ],
        },
        // "บริษัท" group — read-only org-wide info that managers consult
        // (announcements they need to read, the org chart for delegation,
        // the meeting room schedule). Distinct from "การลา" because none
        // of these involve a leave-balance decision.
        {
            label: 'บริษัท',
            icon: Network,
            matchPrefix: ['/portal/announcements', '/portal/organization', '/portal/meeting-room'],
            children: [
                { label: 'ประกาศข่าวสาร',  href: '/portal/announcements',  icon: Megaphone },
                { label: 'ผังองค์กร',      href: '/portal/organization',   icon: Network },
                { label: 'จองห้องประชุม',  href: '/portal/meeting-room',   icon: DoorOpen },
            ],
        },
        { label: 'ตั้งค่า', href: '/portal/settings', icon: Settings },
    ],
    [ROLES.EMPLOYEE]: [
        { label: 'dashboard.portal', href: '/portal', icon: LayoutDashboard },
        { label: 'เช็คอิน', href: '/portal/checkin', icon: MapPin },
        // "การลา" group — same shape as MANAGER but without the approver
        // inbox (which gets appended dynamically in shell.tsx for users
        // with employees.is_approver = true).
        {
            label: 'การลาและ WFH',
            icon: Palmtree,
            matchPrefix: ['/portal/leave', '/portal/wfh', '/portal/comp-days', '/portal/calendar'],
            children: [
                { label: 'ใบลาของฉัน',    href: '/portal/leave',           icon: Palmtree },
                { label: 'ขอ WFH',        href: '/portal/wfh',             icon: Home },
                { label: 'วันหยุดสะสม',   href: '/portal/comp-days',       icon: CalendarHeart },
                { label: 'ปฏิทิน',        href: '/portal/calendar',        icon: Calendar },
                { label: 'นโยบายการลา',  href: '/portal/leave-policy',    icon: ScrollText },
            ],
        },
        // "ส่วนตัว" group (renamed from "ของฉัน" 3 May per Mod's call —
        // ของฉัน sounded awkward standing alone). Personal data the
        // employee owns / consults about themselves. Profile + payslip
        // live here; settings stays separate at the bottom (system
        // controls, not personal data).
        {
            label: 'ส่วนตัว',
            icon: UserCircle,
            matchPrefix: ['/portal/profile', '/portal/payroll'],
            children: [
                { label: 'recruitment.personalInfo', href: '/portal/profile', icon: UserCircle },
                { label: 'สลิปเงินเดือน',           href: '/portal/payroll', icon: FileText },
            ],
        },
        // "บริษัท" group — org-wide read-only surfaces.
        {
            label: 'บริษัท',
            icon: Network,
            matchPrefix: ['/portal/announcements', '/portal/organization', '/portal/meeting-room'],
            children: [
                { label: 'dashboard.announcements', href: '/portal/announcements', icon: Megaphone },
                { label: 'ผังองค์กร',                href: '/portal/organization',  icon: Network },
                { label: 'จองห้องประชุม',           href: '/portal/meeting-room',  icon: DoorOpen },
            ],
        },
        { label: 'ตั้งค่า', href: '/portal/settings', icon: Settings },
    ],
}
