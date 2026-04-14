import { LayoutDashboard, Users, UserCircle, FileText, Settings, Megaphone, CalendarDays, ClipboardCheck, ShieldCheck, CalendarOff } from 'lucide-react'
import { ROLES, type UserRole } from './roles'

export interface NavItem {
    label: string
    href: string
    icon: any // LucideIcon type
}

export const NAVIGATION_CONFIG: Record<UserRole, NavItem[]> = {
    [ROLES.HR_ADMIN]: [
        { label: 'dashboard.title', href: '/dashboard', icon: LayoutDashboard },
        { label: 'dashboard.employees', href: '/dashboard/employees', icon: Users },
        { label: 'dashboard.recruitment', href: '/dashboard/recruitment', icon: UserCircle },
        { label: 'dashboard.announcements', href: '/dashboard/hr/announcements', icon: Megaphone },
        { label: 'dashboard.holidays', href: '/dashboard/holidays', icon: CalendarOff },
        { label: 'leave.title', href: '/dashboard/leave/admin', icon: CalendarDays },
        { label: 'common.view', href: '/dashboard/reports', icon: FileText },
        { label: 'common.actions', href: '/dashboard/settings', icon: Settings },
    ],
    [ROLES.MANAGER]: [
        { label: 'dashboard.title', href: '/dashboard', icon: LayoutDashboard },
        { label: 'leave.myLeave', href: '/portal/leave', icon: CalendarDays },
        { label: 'leave.approveLeave', href: '/portal/approve', icon: ClipboardCheck },
    ],
    [ROLES.EMPLOYEE]: [
        { label: 'dashboard.portal', href: '/portal', icon: LayoutDashboard },
        { label: 'recruitment.personalInfo', href: '/portal/profile', icon: UserCircle },
        { label: 'leave.myLeave', href: '/portal/leave', icon: CalendarDays },
        { label: 'common.view', href: '/portal/payslips', icon: FileText },
    ],
}
