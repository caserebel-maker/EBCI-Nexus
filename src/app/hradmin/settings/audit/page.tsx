import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
    getAuth,
    canManageSystem,
    canViewAuditLog,
    isLegacyHrAdmin,
} from '@/lib/route-auth'
import { AuditView, type EmployeeAudit, type PermissionAudit } from './audit-view'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

interface SearchParams {
    tab?: string
    page?: string
}

interface RawEmployeeAudit {
    id: string
    created_at: string
    actor_user_id: string | null
    target_employee_id: string
    action: string
    field_name: string | null
    old_value: unknown
    new_value: unknown
    reason: string | null
}

interface RawPermissionAudit {
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

export default async function AuditLogPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    // Audit reading is super-admin territory. Three paths qualify:
    // - explicit can_view_audit_log flag (preferred, granular)
    // - can_manage_system (Super Admin always sees system audit)
    // - legacy hr_admin role (backward compat with pre-flag installs)
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!canViewAuditLog(auth) && !canManageSystem(auth) && !isLegacyHrAdmin(auth)) {
        redirect('/hradmin/dashboard')
    }

    const sp = await searchParams
    const tab: 'permission' | 'employee' = sp.tab === 'employee' ? 'employee' : 'permission'
    const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
    const fromRow = (page - 1) * PAGE_SIZE
    const toRow = fromRow + PAGE_SIZE - 1

    // Fetch both tables in parallel — pagination only applies to the
    // active tab; the other tab gets a small slice for tab-badge counts.
    const [permissionRes, employeeRes, usersRes, employeesRes] = await Promise.all([
        tab === 'permission'
            ? supabaseAdmin
                .from('user_permission_audit_log')
                .select('id, target_user_id, changed_by_user_id, changed_at, permissions_before, permissions_after, preset_before, preset_after, role_before, role_after, note', { count: 'exact' })
                .order('changed_at', { ascending: false })
                .range(fromRow, toRow)
            : supabaseAdmin
                .from('user_permission_audit_log')
                .select('id', { count: 'exact', head: true }),
        tab === 'employee'
            ? supabaseAdmin
                .from('employee_audit_log')
                .select('id, created_at, actor_user_id, target_employee_id, action, field_name, old_value, new_value, reason', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(fromRow, toRow)
            : supabaseAdmin
                .from('employee_audit_log')
                .select('id', { count: 'exact', head: true }),
        // Users for actor + target name resolution
        supabaseAdmin
            .from('User')
            .select('id, username, name'),
        supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname'),
    ])

    const permRaw = (permissionRes.data ?? []) as RawPermissionAudit[]
    const empRaw = (employeeRes.data ?? []) as RawEmployeeAudit[]
    const userMap = new Map(((usersRes.data ?? []) as Array<{ id: string; username: string | null; name: string | null }>).map(u => [u.id, u.name ?? u.username ?? '—']))
    const employeeMap = new Map(((employeesRes.data ?? []) as Array<{ id: string; employee_code: string | null; first_name_th: string | null; last_name_th: string | null; nickname: string | null }>).map(e => {
        const full = [e.first_name_th, e.last_name_th].filter(Boolean).join(' ').trim()
        const display = e.nickname ? `${full} (${e.nickname})` : full || e.employee_code || '—'
        return [e.id, display]
    }))

    const permissionEntries: PermissionAudit[] = permRaw.map(a => ({
        id: a.id,
        target_name:    userMap.get(a.target_user_id) ?? a.target_user_id,
        actor_name:     a.changed_by_user_id ? userMap.get(a.changed_by_user_id) ?? '—' : '—',
        changed_at:     a.changed_at,
        permissions_before: (a.permissions_before ?? {}) as Record<string, boolean>,
        permissions_after:  (a.permissions_after  ?? {}) as Record<string, boolean>,
        preset_before:  a.preset_before,
        preset_after:   a.preset_after,
        note:           a.note,
    }))

    const employeeEntries: EmployeeAudit[] = empRaw.map(a => ({
        id: a.id,
        target_name: employeeMap.get(a.target_employee_id) ?? a.target_employee_id,
        actor_name:  a.actor_user_id ? userMap.get(a.actor_user_id) ?? '—' : '—',
        created_at:  a.created_at,
        action:      a.action,
        field_name:  a.field_name,
        old_value:   a.old_value as Record<string, unknown> | null,
        new_value:   a.new_value as Record<string, unknown> | null,
        reason:      a.reason,
    }))

    const permissionTotal = permissionRes.count ?? 0
    const employeeTotal = employeeRes.count ?? 0

    return (
        <AuditView
            tab={tab}
            page={page}
            pageSize={PAGE_SIZE}
            permissionEntries={permissionEntries}
            employeeEntries={employeeEntries}
            permissionTotal={permissionTotal}
            employeeTotal={employeeTotal}
        />
    )
}
