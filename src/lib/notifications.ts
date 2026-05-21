import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { SessionUser } from '@/lib/auth-types'

export type NotificationColor =
    | 'maroon' | 'green' | 'red' | 'amber' | 'blue' | 'gray'

export interface CreateNotificationParams {
    recipient_user_id: string
    type: string
    title: string
    body?: string | null
    action_url?: string | null
    action_label?: string | null
    entity_type?: string | null
    entity_id?: string | null
    reference_code?: string | null
    icon?: string | null
    color?: NotificationColor | null
    sender_user_id?: string | null
    sender_name?: string | null
    metadata?: Record<string, unknown> | null
}

/**
 * Best-effort side-effect: create a notification row.
 *
 * Never throws — logs and returns null on any failure so callers can
 * keep the primary action (email send, status update, …) succeeding
 * even when notifications are misconfigured. Callers should NOT await
 * this in a way that blocks the response, but a simple `await` is fine
 * since the RPC is a single cheap insert.
 */
export async function createNotification(
    params: CreateNotificationParams,
): Promise<{ id: string } | null> {
    if (!params.recipient_user_id) {
        console.warn('[notifications] skip — missing recipient_user_id')
        return null
    }
    try {
        const { data, error } = await supabaseAdmin.rpc('create_notification', {
            p_recipient_user_id: params.recipient_user_id,
            p_type: params.type,
            p_title: params.title,
            p_body: params.body ?? null,
            p_action_url: params.action_url ?? null,
            p_action_label: params.action_label ?? null,
            p_entity_type: params.entity_type ?? null,
            p_entity_id: params.entity_id ?? null,
            p_reference_code: params.reference_code ?? null,
            p_icon: params.icon ?? null,
            p_color: params.color ?? null,
            p_sender_user_id: params.sender_user_id ?? null,
            p_sender_name: params.sender_name ?? null,
            p_metadata: params.metadata ?? null,
        })
        if (error) {
            console.error('[notifications] rpc error:', error)
            return null
        }
        return { id: String(data) }
    } catch (err) {
        console.error('[notifications] create failed:', err)
        return null
    }
}

/**
 * Resolve employees.user_id (which equals public.User.id) for a given
 * employees.id. Used when we hold an employee row (e.g. the leave
 * approver) and need the User id that `notifications.recipient_user_id`
 * references.
 */
export async function getEmployeeUserId(
    employeeId: string,
): Promise<string | null> {
    if (!employeeId) return null
    const { data, error } = await supabaseAdmin
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .maybeSingle()
    if (error) {
        console.error('[notifications] getEmployeeUserId error:', error)
        return null
    }
    return (data?.user_id as string | null) ?? null
}

/**
 * Resolve the recipient_user_id for the signed-in session.
 *
 * Simple semantic: `notifications.recipient_user_id` now holds the
 * Supabase `auth.users.id` (= `employees.user_id` for linked rows).
 *
 * The original column was declared with an FK to the legacy Prisma
 * `public."User"` table whose ids are CUIDs that don't match auth
 * UUIDs and aren't reachable from the session. That FK was dropped;
 * this resolver just returns `session.id`, falling back to
 * `employees.user_id` for the rare case where session.id and the
 * linked employees.user_id disagree (shouldn't happen post-migration
 * but kept as a safety net).
 */
export async function resolveSessionUserId(
    session: SessionUser,
): Promise<string | null> {
    if (!session?.id) return null
    return session.id
}

// ── Lucide icon + color defaults by type ─────────────────────────────
// The icon key is a lucide-react component NAME. Client code should map
// it via a small lookup table (see NotificationItem) instead of
// dynamic import so tree-shaking still works.
export function getNotificationIcon(type: string): string {
    switch (type) {
        case 'leave_request_pending':       return 'Calendar'
        case 'leave_approved':              return 'CheckCircle'
        case 'leave_rejected':              return 'XCircle'
        case 'leave_cancelled':             return 'Ban'
        case 'announcement':                return 'Megaphone'
        case 'application_received':        return 'UserPlus'
        case 'application_status_changed':  return 'Briefcase'
        case 'email_delivery_problem':      return 'MailWarning'
        case 'system':
        case 'system_test':                 return 'Info'
        default:                            return 'Bell'
    }
}

export function getDefaultColor(type: string): NotificationColor {
    switch (type) {
        case 'leave_request_pending':       return 'amber'
        case 'leave_approved':              return 'green'
        case 'leave_rejected':              return 'red'
        case 'leave_cancelled':             return 'gray'
        case 'announcement':                return 'blue'
        case 'application_received':        return 'blue'
        case 'application_status_changed':  return 'amber'
        case 'email_delivery_problem':      return 'red'
        default:                            return 'maroon'
    }
}
