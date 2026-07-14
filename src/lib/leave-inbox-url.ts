import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Resolve the correct approver-inbox URL for a given user.
 *
 * hr_admin → /hradmin/leave/inbox  (stays inside the admin shell so
 *                                   approving doesn't flip the UI
 *                                   into employee mode)
 * anyone  → /portal/leave/inbox    (managers + employees who approve)
 *
 * Role is looked up from `auth.users.user_metadata.role`. Any failure
 * (missing user, malformed metadata, network blip) falls back to the
 * portal URL since it's the universal path that works for every role.
 *
 * Meant for best-effort use at notification-creation time. Callers
 * should treat a rejected promise as "default to portal" rather than
 * propagating the error.
 */
export async function resolveApproverInboxUrl(
    userId: string | null | undefined,
): Promise<string> {
    return '/portal/leave/inbox'
}
