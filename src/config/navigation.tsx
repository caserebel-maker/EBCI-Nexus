import { LayoutDashboard, Users, UserCircle, FileText, Settings } from 'lucide-react'
import { ROLES, type UserRole } from './roles'

export interface NavItem {
    label: string
    href: string
    icon: any // LucideIcon type
}

export const NAVIGATION_CONFIG: Record<UserRole, NavItem[]> = {
    [ROLES.HR_ADMIN]: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Employees', href: '/dashboard/employees', icon: Users },
        { label: 'Recruitment', href: '/dashboard/recruitment', icon: UserCircle },
        // Future roles/menus can be easily added here
        { label: 'Reports', href: '/dashboard/reports', icon: FileText },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
    [ROLES.EMPLOYEE]: [
        { label: 'My Portal', href: '/portal', icon: LayoutDashboard },
        { label: 'My Profile', href: '/portal/profile', icon: UserCircle },
        { label: 'Payslips', href: '/portal/payslips', icon: FileText },
    ],
}
