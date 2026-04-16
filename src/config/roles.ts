export const ROLES = {
    HR_ADMIN: 'hr_admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]

export interface RoleConfig {
    label: string
    homePath: string
    allowedPrefixes: string[]
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
    [ROLES.HR_ADMIN]: {
        label: 'HR Admin',
        homePath: '/hradmin/dashboard',
        allowedPrefixes: ['/hradmin', '/employees', '/recruitment', '/portal', '/careers', '/leave'],
    },
    [ROLES.MANAGER]: {
        label: 'Manager',
        homePath: '/portal',
        allowedPrefixes: ['/portal', '/leave', '/hradmin/leave/approve'],
    },
    [ROLES.EMPLOYEE]: {
        label: 'Employee',
        homePath: '/portal',
        allowedPrefixes: ['/portal', '/leave'],
    },
}

// Helper to check if a path is allowed for a role
export function isRouteAllowed(role: UserRole, path: string): boolean {
    const config = ROLE_CONFIG[role]
    if (!config) return false

    return config.allowedPrefixes.some(prefix => path.startsWith(prefix))
}
