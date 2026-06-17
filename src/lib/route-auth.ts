import 'server-only'

import { getSession, type SessionUser } from '@/lib/auth'
import { getCurrentPermissions } from '@/lib/permissions-server'
import { EMPTY_PERMISSIONS, type UserPermissions } from '@/lib/permissions'

/**
 * Server-side route authorization built on top of the permission flags.
 *
 * Why this exists: until APR25 every /hradmin route + API was gated by
 * `session.role === 'hr_admin'`. That excluded users like มด (HR Manager
 * preset, role='manager') even though her permission flags grant full HR
 * capability. This module replaces those role gates with composable flag
 * checks, while keeping legacy hr_admin role as a passing condition for
 * backward compat.
 *
 * Pattern:
 *   const auth = await getAuth()
 *   if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401 })
 *   if (!isHrStaff(auth)) return Response.json({ error: 'Forbidden' }, { status: 403 })
 *
 * Or in pages:
 *   const auth = await getAuth()
 *   if (!auth) redirect('/login')
 *   if (!isHrStaff(auth)) redirect('/portal/dashboard')
 */

export interface AuthContext {
    session: SessionUser
    permissions: UserPermissions
}

export type AuthCheck = (ctx: AuthContext) => boolean

// ── Atomic checks ─────────────────────────────────────────────────────

/** Legacy: the original role-only check, kept for backward compat. */
export const isLegacyHrAdmin: AuthCheck = ({ session }) => session.role === 'hr_admin'

export const canManageSystem: AuthCheck = ({ permissions }) => permissions.can_manage_system === true
export const canEditEmployees: AuthCheck = ({ permissions }) => permissions.can_edit_employees === true
export const canViewAllEmployees: AuthCheck = ({ permissions }) => permissions.can_view_all_employees === true
export const canApproveLeave: AuthCheck = ({ permissions }) => permissions.can_approve_leave === true
export const canViewApprovalLimits: AuthCheck = ({ permissions }) => permissions.can_view_approval_limits === true
export const canEditApprovalLimits: AuthCheck = ({ permissions }) => permissions.can_edit_approval_limits === true
export const canViewAuditLog: AuthCheck = ({ permissions }) => permissions.can_view_audit_log === true
export const canViewAttendanceInsights: AuthCheck = ({ permissions }) => permissions.can_view_attendance_insights === true

/**
 * Salary-slip access. Standalone allow-list flag — does NOT inherit
 * from hr_admin or any other HR check. Mirrors the can_view_audit_log
 * pattern used elsewhere: HR Manager privileges are the baseline,
 * payroll visibility is opt-in per user. Employees viewing their OWN
 * slips bypass this check via a separate code path in the portal API.
 */
export const canManagePayroll: AuthCheck = ({ permissions }) => permissions.can_manage_payroll === true

// ── Composite checks (the most common ones) ──────────────────────────

/**
 * "HR staff" = the audience that should reach the /hradmin tree.
 * Currently: anyone who can edit employees OR manage the system OR
 * holds the legacy hr_admin role. Captures มด (HR Manager preset),
 * ปอนด์ (Super Admin / hr_admin), and any future HR hire.
 */
export const isHrStaff: AuthCheck = (ctx) =>
    isLegacyHrAdmin(ctx) || canEditEmployees(ctx) || canManageSystem(ctx)

// ── Combinators ───────────────────────────────────────────────────────

export function anyOf(...checks: AuthCheck[]): AuthCheck {
    return (ctx) => checks.some((c) => c(ctx))
}
export function allOf(...checks: AuthCheck[]): AuthCheck {
    return (ctx) => checks.every((c) => c(ctx))
}

// ── Resolver ──────────────────────────────────────────────────────────

/**
 * Resolve the current session + permissions in one trip. Returns null
 * if there's no signed-in session. Permissions default to
 * EMPTY_PERMISSIONS when the User row is missing — caller decides
 * whether that's a 403.
 */
export async function getAuth(): Promise<AuthContext | null> {
    const session = await getSession()
    if (!session) return null
    const permissions = await getCurrentPermissions().catch(() => EMPTY_PERMISSIONS)
    return { session, permissions }
}
