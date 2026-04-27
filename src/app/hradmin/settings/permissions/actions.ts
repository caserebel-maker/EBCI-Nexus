'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, canManageSystem, isLegacyHrAdmin } from '@/lib/route-auth'
import {
    EMPTY_PERMISSIONS,
    type UserPermissions,
} from '@/lib/permissions'
import { detectPreset } from '@/lib/permission-presets'
import { revalidatePath } from 'next/cache'

const FLAG_KEYS: Array<keyof UserPermissions> = [
    'can_view_all_employees',
    'can_edit_employees',
    'can_view_approval_limits',
    'can_edit_approval_limits',
    'can_approve_leave',
    'can_manage_system',
    'can_manage_payroll',
    'can_view_audit_log',
]

interface UpdatePayload {
    targetUserId: string
    permissions: UserPermissions
    note?: string | null
}

interface UpdateResult {
    success: boolean
    error?: string
}

/**
 * Edit another user's permission flags. Super-admin gated.
 *
 * Writes the new flag set + appends a row to `user_permission_audit_log`
 * with a full before/after snapshot. Audit row is best-effort — if it
 * fails after the flag UPDATE landed we still report success because
 * the authoritative state (the User row) is correct; a missing audit
 * row is recoverable, a half-applied edit is not.
 */
export async function updateUserPermissions(
    payload: UpdatePayload,
): Promise<UpdateResult> {
    const auth = await getAuth()
    if (!auth) return { success: false, error: 'Unauthorized' }
    if (!canManageSystem(auth) && !isLegacyHrAdmin(auth)) {
        return { success: false, error: 'เฉพาะ Super Admin เท่านั้นที่แก้ไขสิทธิ์ของคนอื่นได้' }
    }

    const targetUserId = payload.targetUserId?.trim()
    if (!targetUserId) return { success: false, error: 'ไม่ระบุผู้ใช้ปลายทาง' }

    // Read current state for the audit before/after snapshot.
    const { data: before, error: readErr } = await supabaseAdmin
        .from('User')
        .select('role, can_view_all_employees, can_edit_employees, can_view_approval_limits, can_edit_approval_limits, can_approve_leave, can_manage_system, can_manage_payroll, can_view_audit_log')
        .eq('id', targetUserId)
        .maybeSingle()
    if (readErr) {
        console.error('[permissions/update] read before-state error:', readErr)
        return { success: false, error: readErr.message }
    }
    if (!before) return { success: false, error: 'ไม่พบผู้ใช้' }

    // Build a sanitized permissions object — accept only the known flag
    // keys, coerce to bool, and drop anything else the client sent.
    const after: UserPermissions = { ...EMPTY_PERMISSIONS }
    for (const k of FLAG_KEYS) {
        const v = (payload.permissions as Record<string, unknown>)[k]
        after[k] = Boolean(v)
    }

    const beforePerms: UserPermissions = {
        can_view_all_employees:   Boolean(before.can_view_all_employees),
        can_edit_employees:       Boolean(before.can_edit_employees),
        can_view_approval_limits: Boolean(before.can_view_approval_limits),
        can_edit_approval_limits: Boolean(before.can_edit_approval_limits),
        can_approve_leave:        Boolean(before.can_approve_leave),
        can_manage_system:        Boolean(before.can_manage_system),
        can_manage_payroll:       Boolean(before.can_manage_payroll),
        can_view_audit_log:       Boolean(before.can_view_audit_log),
    }

    // No-op detection — same flag set means nothing to write. Skip the
    // UPDATE + audit row entirely so re-saves don't pollute history.
    const noChange = FLAG_KEYS.every(k => beforePerms[k] === after[k])
    if (noChange) {
        return { success: true }
    }

    // Apply the edit.
    const { error: updateErr } = await supabaseAdmin
        .from('User')
        .update({
            ...after,
            updatedAt: new Date().toISOString(),
        })
        .eq('id', targetUserId)
    if (updateErr) {
        console.error('[permissions/update] apply error:', updateErr)
        return { success: false, error: updateErr.message }
    }

    // Audit log — best-effort. Any failure here logs but does not roll
    // back the User UPDATE. The flag state is the authoritative truth;
    // an audit gap is recoverable, a partial UPDATE is not.
    try {
        await supabaseAdmin
            .from('user_permission_audit_log')
            .insert({
                target_user_id:     targetUserId,
                changed_by_user_id: auth.session.id,
                permissions_before: beforePerms,
                permissions_after:  after,
                preset_before:      detectPreset(beforePerms),
                preset_after:       detectPreset(after),
                role_before:        (before.role as string | null) ?? null,
                role_after:         (before.role as string | null) ?? null,
                note:               payload.note?.trim() || null,
            })
    } catch (err) {
        console.error('[permissions/update] audit insert failed:', err)
    }

    revalidatePath('/hradmin/settings/permissions')
    return { success: true }
}
