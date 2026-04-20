// Client-safe permission types + pure helpers.
// Server-only helpers (getCurrentPermissions) live in ./permissions-server.

export type UserPermissions = {
    can_view_all_employees: boolean
    can_edit_employees: boolean
    can_view_approval_limits: boolean
    can_edit_approval_limits: boolean
    can_approve_leave: boolean
    can_manage_system: boolean
}

export const EMPTY_PERMISSIONS: UserPermissions = {
    can_view_all_employees: false,
    can_edit_employees: false,
    can_view_approval_limits: false,
    can_edit_approval_limits: false,
    can_approve_leave: false,
    can_manage_system: false,
}

export type ApprovalTier = 'small' | 'medium' | 'large' | 'unlimited'

export const TIER_LABELS: Record<ApprovalTier, { th: string; icon: string }> = {
    small:     { th: 'วงเงินเล็ก',  icon: '💧' },
    medium:    { th: 'วงเงินกลาง',  icon: '💎' },
    large:     { th: 'วงเงินใหญ่',  icon: '🔥' },
    unlimited: { th: 'ไม่จำกัด',    icon: '♾️' },
}

export function limitToTier(limit?: number | null): ApprovalTier {
    if (!limit || limit <= 30_000) return 'small'
    if (limit <= 100_000) return 'medium'
    if (limit <= 500_000) return 'large'
    return 'unlimited'
}

export function canSeeExactAmount(viewer: UserPermissions): boolean {
    return viewer.can_view_approval_limits
}

export function canEditEmployee(
    viewer: { permissions: UserPermissions; approval_level: number; id: string },
    target: { id: string; approval_level: number }
): boolean {
    if (!viewer.permissions.can_edit_employees) return false
    if (viewer.permissions.can_manage_system) return true
    if (target.approval_level >= viewer.approval_level) return false
    if (target.id === viewer.id) return false
    return true
}
