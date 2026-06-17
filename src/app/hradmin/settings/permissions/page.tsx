import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, canManageSystem, isLegacyHrAdmin } from '@/lib/route-auth'
import { type UserPermissions } from '@/lib/permissions'
import { detectPreset, type PresetName } from '@/lib/permission-presets'
import { PermissionsView, type UserRow, type AuditEntry } from './permissions-view'

export const dynamic = 'force-dynamic'

interface RawUser {
    id: string
    username: string | null
    name: string | null
    role: string | null
    can_view_all_employees: boolean | null
    can_edit_employees: boolean | null
    can_view_approval_limits: boolean | null
    can_edit_approval_limits: boolean | null
    can_approve_leave: boolean | null
    can_manage_system: boolean | null
    can_manage_payroll: boolean | null
    can_view_audit_log: boolean | null
    can_view_attendance_insights: boolean | null
}

interface RawAudit {
    id: string
    target_user_id: string
    changed_by_user_id: string | null
    changed_at: string
    permissions_before: unknown
    permissions_after: unknown
    preset_before: string | null
    preset_after: string | null
    role_before: string | null
    role_after: string | null
    note: string | null
}

export default async function PermissionsSettingsPage() {
    // Super-admin territory: only users with can_manage_system or legacy
    // hr_admin role can edit other users' permissions. Anyone else gets
    // bounced — hard floor matches /api/hradmin/system/quota's gate.
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!canManageSystem(auth) && !isLegacyHrAdmin(auth)) {
        redirect('/hradmin/dashboard')
    }

    const [usersRes, auditRes, employeesRes] = await Promise.all([
        supabaseAdmin
            .from('User')
            .select('id, username, name, role, can_view_all_employees, can_edit_employees, can_view_approval_limits, can_edit_approval_limits, can_approve_leave, can_manage_system, can_manage_payroll, can_view_audit_log, can_view_attendance_insights')
            .order('username', { ascending: true }),
        // Pull last 50 audit entries; the modal slices per-target on click.
        supabaseAdmin
            .from('user_permission_audit_log')
            .select('id, target_user_id, changed_by_user_id, changed_at, permissions_before, permissions_after, preset_before, preset_after, role_before, role_after, note')
            .order('changed_at', { ascending: false })
            .limit(50),
        // Active employees with no linked user_id — these are the
        // candidates HR can pick when creating a new login. Sort by
        // employee_code so the list reads like the org chart.
        supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname, department, position, email')
            .eq('status', 'active')
            .is('user_id', null)
            .order('employee_code', { ascending: true }),
    ])

    const rawUsers = (usersRes.data ?? []) as RawUser[]
    const audits = (auditRes.data ?? []) as RawAudit[]
    const unlinkedEmployees = (employeesRes.data ?? []) as Array<{
        id: string
        employee_code: string
        first_name_th: string
        last_name_th: string
        nickname: string | null
        department: string | null
        position: string | null
        email: string | null
    }>

    // Resolve actor names for audit display from the same User snapshot
    // we already fetched. Map id → display name; fall back to username
    // then literal "—" for orphaned references.
    const nameById = new Map(rawUsers.map(u => [u.id, u.name ?? u.username ?? '—']))

    const users: UserRow[] = rawUsers.map(u => {
        const permissions: UserPermissions = {
            can_view_all_employees:   Boolean(u.can_view_all_employees),
            can_edit_employees:       Boolean(u.can_edit_employees),
            can_view_approval_limits: Boolean(u.can_view_approval_limits),
            can_edit_approval_limits: Boolean(u.can_edit_approval_limits),
            can_approve_leave:        Boolean(u.can_approve_leave),
            can_manage_system:        Boolean(u.can_manage_system),
            can_manage_payroll:       Boolean(u.can_manage_payroll),
            can_view_audit_log:       Boolean(u.can_view_audit_log),
            can_view_attendance_insights: Boolean(u.can_view_attendance_insights),
        }
        const preset: PresetName | 'custom' = detectPreset(permissions)
        return {
            id: u.id,
            username: u.username ?? '',
            name: u.name ?? u.username ?? '—',
            role: u.role ?? 'user',
            permissions,
            preset,
        }
    })

    const auditEntries: AuditEntry[] = audits.map(a => ({
        id: a.id,
        target_user_id: a.target_user_id,
        actor_name: a.changed_by_user_id ? nameById.get(a.changed_by_user_id) ?? '—' : '—',
        changed_at: a.changed_at,
        permissions_before: (a.permissions_before ?? {}) as Partial<UserPermissions>,
        permissions_after:  (a.permissions_after  ?? {}) as Partial<UserPermissions>,
        preset_before: a.preset_before,
        preset_after:  a.preset_after,
        role_before:   a.role_before,
        role_after:    a.role_after,
        note:          a.note,
    }))

    return (
        <PermissionsView
            users={users}
            audits={auditEntries}
            currentUserId={auth.session.id}
            unlinkedEmployees={unlinkedEmployees.map(e => ({
                id: e.id,
                employee_code: e.employee_code,
                display_name: [e.first_name_th, e.last_name_th].filter(Boolean).join(' ')
                    + (e.nickname ? ` (${e.nickname})` : ''),
                department: e.department,
                position: e.position,
                email: e.email,
            }))}
        />
    )
}
