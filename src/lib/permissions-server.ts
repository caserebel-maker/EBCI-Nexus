import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { EMPTY_PERMISSIONS, type UserPermissions } from './permissions'

// Resolve permissions of the currently logged-in user from the session cookie.
// Returns EMPTY_PERMISSIONS if no session or user row is missing.
export async function getCurrentPermissions(): Promise<UserPermissions> {
    const session = await getSession()
    if (!session) return EMPTY_PERMISSIONS

    const selectClause = 'can_view_all_employees, can_edit_employees, can_view_approval_limits, can_edit_approval_limits, can_approve_leave, can_manage_system, can_manage_payroll, can_view_audit_log'

    let { data } = await supabaseAdmin
        .from('User')
        .select(selectClause)
        .eq('id', session.id)
        .maybeSingle()

    // Legacy / manually-created payroll users can have auth.users.id that
    // differs from public."User".id. The permissions editor shows the public
    // row correctly, but runtime shells were reading by auth id only, so users
    // like สุชาติ lost their payroll menu after login. Fall back through the
    // employee link and the email/username when the direct id lookup misses.
    if (!data && (session.employeeId || session.email)) {
        let linkedUserId: string | null = null
        let linkedEmail: string | null = session.email?.trim().toLowerCase() ?? null

        if (session.employeeId) {
            const { data: emp } = await supabaseAdmin
                .from('employees')
                .select('user_id, email')
                .eq('id', session.employeeId)
                .maybeSingle()
            linkedUserId = (emp?.user_id as string | null) ?? null
            linkedEmail = ((emp?.email as string | null)?.trim().toLowerCase()) ?? linkedEmail
        }

        if (!linkedUserId && linkedEmail) {
            const { data: empByEmail } = await supabaseAdmin
                .from('employees')
                .select('user_id')
                .eq('email', linkedEmail)
                .maybeSingle()
            linkedUserId = (empByEmail?.user_id as string | null) ?? null
        }

        if (linkedUserId) {
            const { data: byLinkedId } = await supabaseAdmin
                .from('User')
                .select(selectClause)
                .eq('id', linkedUserId)
                .maybeSingle()
            data = byLinkedId
        }

        if (!data && linkedEmail) {
            const { data: byUsername } = await supabaseAdmin
                .from('User')
                .select(selectClause)
                .eq('username', linkedEmail)
                .maybeSingle()
            data = byUsername
        }
    }

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
