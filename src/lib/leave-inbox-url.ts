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
    const portalUrl = '/portal/leave/inbox'
    if (!userId) return portalUrl
    try {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (error || !data?.user) return portalUrl
        const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>
        const appMeta = (data.user.app_metadata ?? {}) as Record<string, unknown>
        const role = (meta.role ?? appMeta.role) as string | undefined
        return role === 'hr_admin' ? '/hradmin/leave/inbox' : portalUrl
    } catch (err) {
        console.warn('[leave-inbox-url] resolution failed — falling back to portal', err)
        return portalUrl
    }
}
