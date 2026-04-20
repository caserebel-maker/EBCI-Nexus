import type { UserPermissions } from './permissions'

export const PERMISSION_PRESETS = {
    super_admin: {
        label: '🔑 Super Admin',
        description: 'ทุก permission — จัดการระบบได้เต็มที่',
        permissions: {
            can_view_all_employees:   true,
            can_edit_employees:       true,
            can_view_approval_limits: true,
            can_edit_approval_limits: true,
            can_approve_leave:        true,
            can_manage_system:        true,
        },
    },
    executive: {
        label: '👑 Executive Viewer',
        description: 'ดูทุกอย่าง + อนุมัติลา · ไม่แก้ไขข้อมูล',
        permissions: {
            can_view_all_employees:   true,
            can_edit_employees:       false,
            can_view_approval_limits: true,
            can_edit_approval_limits: false,
            can_approve_leave:        true,
            can_manage_system:        false,
        },
    },
    hr_manager: {
        label: '👥 HR Manager',
        description: 'จัดการพนักงาน + อนุมัติลา',
        permissions: {
            can_view_all_employees:   true,
            can_edit_employees:       true,
            can_view_approval_limits: true,
            can_edit_approval_limits: false,
            can_approve_leave:        true,
            can_manage_system:        false,
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
        },
    },
} as const satisfies Record<string, { label: string; description: string; permissions: UserPermissions }>

export type PresetName = keyof typeof PERMISSION_PRESETS

export function detectPreset(perms: UserPermissions): PresetName | 'custom' {
    for (const [name, preset] of Object.entries(PERMISSION_PRESETS)) {
        const match = (Object.keys(preset.permissions) as (keyof UserPermissions)[]).every(
            (k) => perms[k] === preset.permissions[k]
        )
        if (match) return name as PresetName
    }
    return 'custom'
}
