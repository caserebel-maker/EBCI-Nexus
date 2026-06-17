'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, canManageSystem, isLegacyHrAdmin } from '@/lib/route-auth'
import {
    EMPTY_PERMISSIONS,
    type UserPermissions,
} from '@/lib/permissions'
import { detectPreset } from '@/lib/permission-presets'
import { checkPasswordPolicy } from '@/lib/password-policy'
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
    'can_view_attendance_insights',
]

interface UpdatePayload {
    targetUserId: string
    permissions: UserPermissions
    /**
     * Optional new role. When set, we also patch
     * auth.users.user_metadata.role so login resolution picks it up
     * on the next session. Pass undefined to leave the role
     * untouched (most flag-only edits do this).
     */
    role?: 'employee' | 'manager' | 'hr_admin'
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
        .select('role, can_view_all_employees, can_edit_employees, can_view_approval_limits, can_edit_approval_limits, can_approve_leave, can_manage_system, can_manage_payroll, can_view_audit_log, can_view_attendance_insights')
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
        can_view_attendance_insights: Boolean(before.can_view_attendance_insights),
    }

    // Role validation. Only accept the three known values; null/undefined
    // means "don't touch the role" (flag-only edit).
    const roleBefore = (before.role as string | null) ?? null
    let roleAfter: string | null = roleBefore
    if (payload.role !== undefined) {
        if (!['employee', 'manager', 'hr_admin'].includes(payload.role)) {
            return { success: false, error: 'role ไม่ถูกต้อง' }
        }
        roleAfter = payload.role
    }

    // No-op detection — same flags AND same role means nothing to write.
    const flagsUnchanged = FLAG_KEYS.every(k => beforePerms[k] === after[k])
    const roleUnchanged = roleBefore === roleAfter
    if (flagsUnchanged && roleUnchanged) {
        return { success: true }
    }

    // Apply to public."User" — flags + role (only when changed).
    const updateBody: Record<string, unknown> = {
        ...after,
        updatedAt: new Date().toISOString(),
    }
    if (!roleUnchanged) updateBody.role = roleAfter

    const { error: updateErr } = await supabaseAdmin
        .from('User')
        .update(updateBody)
        .eq('id', targetUserId)
    if (updateErr) {
        console.error('[permissions/update] apply error:', updateErr)
        return { success: false, error: updateErr.message }
    }

    // If role changed, mirror it into auth.users.user_metadata.role so
    // the next login resolves to the new role (login.ts checks
    // user_metadata first; without this update the cached metadata
    // would keep the old role even after our public.User row changed).
    // Best-effort — log on failure but don't roll back the User row.
    if (!roleUnchanged) {
        try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
            const existingMeta = authUser?.user?.user_metadata ?? {}
            await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
                user_metadata: { ...existingMeta, role: roleAfter },
            })
        } catch (err) {
            console.error('[permissions/update] auth metadata role sync failed:', err)
        }
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
                role_before:        roleBefore,
                role_after:         roleAfter,
                note:               payload.note?.trim() || null,
            })
    } catch (err) {
        console.error('[permissions/update] audit insert failed:', err)
    }

    revalidatePath('/hradmin/settings/permissions')
    return { success: true }
}

// ─── Create User ─────────────────────────────────────────────────────

interface CreateUserPayload {
    email: string
    password: string
    name: string
    role: 'employee' | 'manager' | 'hr_admin'
    employeeId?: string | null   // optional link to employees.id
    permissions: UserPermissions
    note?: string | null
}

interface CreateUserResult {
    success: boolean
    error?: string
    userId?: string
}

/**
 * Create a brand-new user account end-to-end:
 *   1. supabaseAdmin.auth.admin.createUser — registers with Supabase Auth
 *      so the email/password actually works at /login.
 *   2. INSERT INTO public."User" — mirrors the auth user row with the
 *      role + permission flags the editor will key off.
 *   3. (Optional) UPDATE employees.user_id — link to an existing
 *      employee so portal pages like /portal/profile light up.
 *   4. Append a row to user_permission_audit_log so creation shows up
 *      in the same audit feed as flag edits.
 *
 * Same auth gate as updateUserPermissions — Super Admin only.
 *
 * If step 1 succeeds but step 2 fails we attempt to roll back the
 * auth user so we don't leak orphaned auth identities. Step 4 is
 * best-effort (no rollback on audit failure).
 */
export async function createUser(payload: CreateUserPayload): Promise<CreateUserResult> {
    const auth = await getAuth()
    if (!auth) return { success: false, error: 'Unauthorized' }
    if (!canManageSystem(auth) && !isLegacyHrAdmin(auth)) {
        return { success: false, error: 'เฉพาะ Super Admin เท่านั้นที่สร้างผู้ใช้ใหม่ได้' }
    }

    // ── Validate ──────────────────────────────────────────────────────
    const email = payload.email?.trim().toLowerCase()
    const password = payload.password ?? ''
    const name = payload.name?.trim()
    const role = payload.role
    const employeeId = payload.employeeId?.trim() || null

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: 'อีเมลไม่ถูกต้อง' }
    }
    // Same policy used everywhere passwords are picked — see
    // src/lib/password-policy.ts. Centralised so the createUser modal
    // can't sneak weak temps through while /portal/settings rejects them.
    const policyCheck = checkPasswordPolicy(password)
    if (!policyCheck.ok) {
        return { success: false, error: policyCheck.error ?? 'รหัสผ่านไม่ผ่านเกณฑ์' }
    }
    if (!name) {
        return { success: false, error: 'ต้องระบุชื่อผู้ใช้' }
    }
    if (!['employee', 'manager', 'hr_admin'].includes(role)) {
        return { success: false, error: 'role ไม่ถูกต้อง' }
    }

    // Sanitize permission flags — accept only known keys.
    const after: UserPermissions = { ...EMPTY_PERMISSIONS }
    for (const k of FLAG_KEYS) {
        const v = (payload.permissions as Record<string, unknown>)[k]
        after[k] = Boolean(v)
    }

    // Pre-flight: email already taken?
    const { data: emailClash } = await supabaseAdmin
        .from('User')
        .select('id')
        .ilike('username', email)
        .maybeSingle()
    if (emailClash?.id) {
        return { success: false, error: `อีเมล "${email}" ถูกใช้งานแล้ว` }
    }

    // ── 1. Create Supabase auth user ──────────────────────────────────
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,  // skip the confirmation email
        user_metadata: {
            name,
            role,
            ...(employeeId ? { employeeId } : {}),
        },
    })
    if (authErr || !authData.user) {
        console.error('[permissions/createUser] auth create error:', authErr)
        return {
            success: false,
            error: authErr?.message ?? 'สร้าง auth user ไม่สำเร็จ',
        }
    }
    const newUserId = authData.user.id

    // ── 2. INSERT public."User" row (id matches auth.users.id) ────────
    const { error: userInsertErr } = await supabaseAdmin
        .from('User')
        .insert({
            id: newUserId,
            username: email,
            // public.User.password is legacy/unused for login (auth.users
            // owns the real password) but the column is NOT NULL on the
            // existing schema. Store a marker rather than the plain
            // password — login goes through Supabase Auth anyway.
            password: 'auth:supabase',
            name,
            role,
            ...after,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
    if (userInsertErr) {
        console.error('[permissions/createUser] User row insert error:', userInsertErr)
        // Roll back the auth user so we don't leave an orphan.
        await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(err =>
            console.error('[permissions/createUser] auth rollback failed:', err),
        )
        return { success: false, error: userInsertErr.message }
    }

    // ── 3. Optional: link to employee row ─────────────────────────────
    if (employeeId) {
        const { error: linkErr } = await supabaseAdmin
            .from('employees')
            .update({ user_id: newUserId })
            .eq('id', employeeId)
        if (linkErr) {
            // Non-fatal — the user account exists and works, the link
            // can be added later from the employee profile editor.
            console.error('[permissions/createUser] employee link failed:', linkErr)
        }
    }

    // ── 4. Audit log (best-effort) ────────────────────────────────────
    try {
        await supabaseAdmin
            .from('user_permission_audit_log')
            .insert({
                target_user_id:     newUserId,
                changed_by_user_id: auth.session.id,
                permissions_before: EMPTY_PERMISSIONS,
                permissions_after:  after,
                preset_before:      null,
                preset_after:       detectPreset(after),
                role_before:        null,
                role_after:         role,
                note:               (payload.note?.trim() || `สร้างผู้ใช้ใหม่: ${email}`),
            })
    } catch (err) {
        console.error('[permissions/createUser] audit insert failed:', err)
    }

    revalidatePath('/hradmin/settings/permissions')
    return { success: true, userId: newUserId }
}
