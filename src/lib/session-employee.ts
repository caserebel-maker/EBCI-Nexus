import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { SessionUser } from '@/lib/auth-types'

/**
 * Resolve the employees.id for the signed-in user.
 *
 * Priority:
 *   1. session.employeeId — but verified to still match the session user.
 *      A stale cookie (e.g. user re-linked after an account switch)
 *      could point at an employees row whose `user_id` no longer equals
 *      the session id. In that case we fall through instead of trusting
 *      the cookie blindly.
 *   2. employees WHERE user_id = session.id (covers every linked row
 *      whose auth account is still wired up).
 *   3. fallback: match by auth email.
 *
 * Returns null when the user has no employee record at all (rare —
 * would be a service-style auth without an employees row).
 */
export async function resolveSessionEmployeeId(
    session: SessionUser,
): Promise<string | null> {
    // Step 1: verified cookie hint.
    if (session.employeeId) {
        const { data: verify } = await supabaseAdmin
            .from('employees')
            .select('id, user_id')
            .eq('id', session.employeeId)
            .maybeSingle()
        if (verify?.id && verify.user_id && verify.user_id === session.id) {
            return verify.id as string
        }
        // Stale / mismatched — log once per request and fall through so
        // the resolver can still answer for this user.
        if (verify?.id) {
            console.warn('[session-employee] session.employeeId points to an employees row with a different user_id; falling back to user_id lookup', {
                sessionId: session.id,
                staleEmployeeId: session.employeeId,
                employeesUserId: verify.user_id,
            })
        } else {
            console.warn('[session-employee] session.employeeId does not exist; falling back to user_id lookup', {
                sessionId: session.id,
                staleEmployeeId: session.employeeId,
            })
        }
    }

    // Step 2: by user_id.
    const { data: byUser } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('user_id', session.id)
        .maybeSingle()
    if (byUser?.id) return byUser.id as string

    // Step 3: email fallback — costly but keeps us functional for older
    // accounts whose employees row never got user_id filled.
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
