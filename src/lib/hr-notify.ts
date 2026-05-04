import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Find every active HR-staff target that should be CC'd on
 * leave / WFH requests for awareness ("รับทราบ" — NOT a second
 * approval step; HR can't reject).
 *
 * Same filter the leave-approver-chain endpoint uses to pick the
 * "real HR" person at the chain tail (lib pattern locked in 6e8de89):
 *   - `User.role = 'hr_admin'` OR can_edit_employees OR can_manage_system
 *     → has the technical permission set
 *   - AND `employees.department` or `position` contains "บุคคล"
 *     → actually works in HR (excludes management/tech leads who
 *       happen to also have hr_admin flag)
 *
 * Returns one row per qualifying staff member with the fields callers
 * need for both email + in-app notification: employee_id (for db FKs),
 * user_id (for createNotification recipient), email (for sendEmail),
 * and name (for templates).
 *
 * Empty result is a misconfiguration signal — callers should log it
 * but NEVER block the originating action (FYI failure ≠ submit failure).
 */

export interface HrNotifyTarget {
    employeeId: string
    userId: string | null
    email: string | null
    name: string
    nickname: string | null
}

export async function findHrNotifyTargets(): Promise<HrNotifyTarget[]> {
    // 1. HR-permission user IDs.
    const { data: hrUsers } = await supabaseAdmin
        .from('User')
        .select('id')
        .or('role.eq.hr_admin,can_edit_employees.eq.true,can_manage_system.eq.true')
    const userIds = (hrUsers ?? []).map(u => u.id as string).filter(Boolean)
    if (userIds.length === 0) {
        console.warn('[hr-notify] no HR-permission users found — leave/WFH FYI will go nowhere')
        return []
    }

    // 2. Filter to employees who actually work in HR (department/
    //    position contains "บุคคล"). This excludes managers/tech leads
    //    who carry the hr_admin flag for system reasons but aren't who
    //    Mod meant by "ส่งให้ HR ด้วย".
    const { data: hrEmps } = await supabaseAdmin
        .from('employees')
        .select('id, user_id, email, first_name_th, last_name_th, nickname')
        .in('user_id', userIds)
        .eq('status', 'active')
        .or('department.ilike.%บุคคล%,position.ilike.%บุคคล%')

    const targets = (hrEmps ?? []) as Array<{
        id: string
        user_id: string | null
        email: string | null
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
    }>

    if (targets.length === 0) {
        console.warn('[hr-notify] no employees in บุคคล department with HR permissions — FYI will be silent')
        return []
    }

    return targets.map(t => ({
        employeeId: t.id,
        userId: t.user_id,
        email: t.email,
        name: `${(t.first_name_th ?? '').trim()} ${(t.last_name_th ?? '').trim()}`.trim() || 'ฝ่ายบุคคล',
        nickname: t.nickname,
    }))
}
