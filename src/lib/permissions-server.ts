import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { EMPTY_PERMISSIONS, type UserPermissions } from './permissions'

// Resolve permissions of the currently logged-in user from the session cookie.
// Returns EMPTY_PERMISSIONS if no session or user row is missing.
export async function getCurrentPermissions(): Promise<UserPermissions> {
    const session = await getSession()
    if (!session) return EMPTY_PERMISSIONS

    const { data } = await supabaseAdmin
        .from('User')
        .select('can_view_all_employees, can_edit_employees, can_view_approval_limits, can_edit_approval_limits, can_approve_leave, can_manage_system, can_manage_payroll, can_view_audit_log')
        .eq('id', session.id)
        .maybeSingle()

    if (!data) return EMPTY_PERMISSIONS
    return {
        can_view_all_employees:   Boolean(data.can_view_all_employees),
        can_edit_employees:       Boolean(data.can_edit_employees),
        can_view_approval_limits: Boolean(data.can_view_approval_limits),
        can_edit_approval_limits: Boolean(data.can_edit_approval_limits),
        can_approve_leave:        Boolean(data.can_approve_leave),
        can_manage_system:        Boolean(data.can_manage_system),
        can_manage_payroll:       Boolean(data.can_manage_payroll),
        can_view_audit_log:       Boolean(data.can_view_audit_log),
    }
}
