import { LayoutDashboard, Users, UserCircle, FileText, Settings, Megaphone, CalendarDays, ClipboardCheck, ShieldCheck, CalendarOff, MapPin, Network, Activity, ScrollText } from 'lucide-react'
import { ROLES, type UserRole } from './roles'

export interface NavItem {
    label: string
    href: string
    icon: any // LucideIcon type
}

export const NAVIGATION_CONFIG: Record<UserRole, NavItem[]> = {
    [ROLES.HR_ADMIN]: [
        { label: 'dashboard.title', href: '/hradmin/dashboard', icon: LayoutDashboard },
        { label: 'dashboard.employees', href: '/hradmin/employees', icon: Users },
        { label: 'ผังองค์กร', href: '/hradmin/organization', icon: Network },
        // The legacy /hradmin/recruitment page still exists but reads the
        // old applicants / applicant_educations tables. The modern view
        // against job_applications lives at /hradmin/applicants and is
        // the only entry point from the sidebar now.
        { label: 'รับสมัครงาน', href: '/hradmin/applicants', icon: UserCircle },
        { label: 'ประกาศข่าวสาร', href: '/hradmin/announcements', icon: Megaphone },
        { label: 'การเข้างาน', href: '/hradmin/attendance', icon: MapPin },
        { label: 'dashboard.holidays', href: '/hradmin/holidays', icon: CalendarOff },
        { label: 'leave.title', href: '/hradmin/leave/admin', icon: CalendarDays },
        { label: 'นโยบายการลา', href: '/hradmin/leave/policies', icon: ScrollText },
        { label: 'common.view', href: '/hradmin/reports', icon: FileText },
        { label: 'common.actions', href: '/hradmin/settings', icon: Settings },
        { label: 'ระบบและทรัพยากร', href: '/hradmin/settings/quota', icon: Activity },
    ],
    [ROLES.MANAGER]: [
        { label: 'dashboard.title', href: '/hradmin/dashboard', icon: LayoutDashboard },
        { label: 'เช็คอิน', href: '/portal/checkin', icon: MapPin },
        { label: 'leave.myLeave', href: '/portal/leave', icon: CalendarDays },
        { label: 'leave.approveLeave', href: '/portal/approve', icon: ClipboardCheck },
        { label: 'ผังองค์กร', href: '/portal/organization', icon: Network },
        { label: 'dashboard.announcements', href: '/portal/announcements', icon: Megaphone },
    ],
    [ROLES.EMPLOYEE]: [
        { label: 'dashboard.portal', href: '/portal', icon: LayoutDashboard },
        { label: 'เช็คอิน', href: '/portal/checkin', icon: MapPin },
        { label: 'recruitment.personalInfo', href: '/portal/profile', icon: UserCircle },
        { label: 'leave.myLeave', href: '/portal/leave', icon: CalendarDays },
        { label: 'ผังองค์กร', href: '/portal/organization', icon: Network },
        { label: 'dashboard.announcements', href: '/portal/announcements', icon: Megaphone },
        { label: 'common.view', href: '/portal/payslips', icon: FileText },
    ],
}
