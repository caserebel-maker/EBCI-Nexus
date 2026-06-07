import type { UserPermissions } from './permissions'

export const PERMISSION_PRESETS = {
    super_admin: {
        label: '🔑 Super Admin',
        description: 'ทุก permission — จัดการระบบได้เต็มที่ + ดู/อัปโหลดสลิปเงินเดือน + audit log',
        permissions: {
            can_view_all_employees:   true,
            can_edit_employees:       true,
            can_view_approval_limits: true,
            can_edit_approval_limits: true,
            can_approve_leave:        true,
            can_manage_system:        true,
            can_manage_payroll:       true,
            can_view_audit_log:       true,
        },
    },
    executive: {
        label: '👑 Executive Viewer',
        description: 'ดูทุกอย่าง + อนุมัติลา · ไม่แก้ไขข้อมูล · ไม่เห็นสลิป',
        permissions: {
            can_view_all_employees:   true,
            can_edit_employees:       false,
            can_view_approval_limits: true,
            can_edit_approval_limits: false,
            can_approve_leave:        true,
            can_manage_system:        false,
            can_manage_payroll:       false,
            can_view_audit_log:       false,
        },
    },
    hr_manager: {
        label: '👥 HR Manager',
        description: 'จัดการพนักงาน + อนุมัติลา · payroll ต้อง grant แยก',
        permissions: {
            can_view_all_employees:   true,
            can_edit_employees:       true,
            can_view_approval_limits: true,
            can_edit_approval_limits: false,
            can_approve_leave:        true,
            can_manage_system:        false,
            can_manage_payroll:       false,
            can_view_audit_log:       false,
        },
    },
    mis_admin: {
        label: '🛠️ MIS Admin',
        description: 'ดู/แก้ไขข้อมูลพนักงาน + ดู audit log สำหรับดูแลข้อมูล · ไม่มี payroll และไม่ใช่ super-admin',
        permissions: {
            can_view_all_employees:   true,
            can_edit_employees:       true,
            can_view_approval_limits: true,
            can_edit_approval_limits: false,
            can_approve_leave:        true,
            can_manage_system:        false,
            can_manage_payroll:       false,
            can_view_audit_log:       true,
        },
    },
    payroll_manager: {
        label: '💰 Payroll Manager',
        description: 'อัปโหลด/ดูสลิปเงินเดือน · ไม่เห็นข้อมูลพนักงานอื่น',
        permissions: {
            can_view_all_employees:   false,
            can_edit_employees:       false,
            can_view_approval_limits: false,
            can_edit_approval_limits: false,
            can_approve_leave:        false,
            can_manage_system:        false,
            can_manage_payroll:       true,
            can_view_audit_log:       false,
        },
    },
    employee: {
        label: '👤 Employee',
        description: 'ดูเฉพาะข้อมูลตัวเอง',
        permissions: {
            can_view_all_employees:   false,
            can_edit_employees:       false,
            can_view_approval_limits: false,
            can_edit_approval_limits: false,
            can_approve_leave:        false,
            can_manage_system:        false,
            can_manage_payroll:       false,
            can_view_audit_log:       false,
        },
    },
} as const satisfies Record<string, { label: string; description: string; permissions: UserPermissions }>

export type PresetName = keyof typeof PERMISSION_PRESETS

/**
 * Convenience: stable iteration order for the editor's preset dropdown.
 * Object.keys() ordering happens to match insertion order in V8 but
 * making it explicit removes any doubt.
 */
export const PRESET_ORDER: PresetName[] = [
    'super_admin', 'hr_manager', 'mis_admin', 'payroll_manager', 'executive', 'employee',
]

export function detectPreset(perms: UserPermissions): PresetName | 'custom' {
    for (const [name, preset] of Object.entries(PERMISSION_PRESETS)) {
        const match = (Object.keys(preset.permissions) as (keyof UserPermissions)[]).every(
            (k) => perms[k] === preset.permissions[k]
        )
        if (match) return name as PresetName
    }
    return 'custom'
}
