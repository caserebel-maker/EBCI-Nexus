import { LayoutDashboard, Users, UserCircle, FileText, Settings, Megaphone } from 'lucide-react'
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
        // Future roles/menus can be easily added here
        { label: 'common.view', href: '/dashboard/reports', icon: FileText }, // Placeholder mapped to common.view for now or add new keys
        { label: 'common.actions', href: '/dashboard/settings', icon: Settings }, // Placeholder
    ],
    [ROLES.EMPLOYEE]: [
        { label: 'dashboard.portal', href: '/portal', icon: LayoutDashboard },
        { label: 'recruitment.personalInfo', href: '/portal/profile', icon: UserCircle },
        { label: 'common.view', href: '/portal/payslips', icon: FileText },
    ],
}
