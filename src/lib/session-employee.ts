import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { SessionUser } from '@/lib/auth-types'

/**
 * Resolve the employees.id for the signed-in user.
 *
 * Priority:
 *   1. session.employeeId when present (newer logins store this)
 *   2. employees WHERE user_id = session.id (covers linked legacy rows)
 *   3. fallback: match by auth email
 *
 * Returns null when the user has no employee record at all (rare —
 * would be a service-style auth without an employees row).
 */
export async function resolveSessionEmployeeId(
    session: SessionUser,
): Promise<string | null> {
    if (session.employeeId) return session.employeeId

    const { data: byUser } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('user_id', session.id)
        .maybeSingle()
    if (byUser?.id) return byUser.id as string

    // Email fallback — costly but keeps us functional for older accounts
    // whose employees row never got user_id filled.
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(session.id)
    const email = authUser?.user?.email
    if (!email) return null
    const { data: byEmail } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('email', email)
        .maybeSingle()
    return (byEmail?.id as string | undefined) ?? null
}
