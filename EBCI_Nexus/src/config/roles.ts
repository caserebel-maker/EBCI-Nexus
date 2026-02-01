export const ROLES = {
    HR_ADMIN: 'hr_admin',
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
        homePath: '/dashboard',
        allowedPrefixes: ['/dashboard', '/employees', '/recruitment', '/portal', '/careers'],
    },
    [ROLES.EMPLOYEE]: {
        label: 'Employee',
        homePath: '/portal',
        allowedPrefixes: ['/portal'],
    },
}

// Helper to check if a path is allowed for a role
export function isRouteAllowed(role: UserRole, path: string): boolean {
    const config = ROLE_CONFIG[role]
    if (!config) return false

    // Public routes (if any) could be handled here or in middleware
    return config.allowedPrefixes.some(prefix => path.startsWith(prefix))
}
