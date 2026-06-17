// Client-safe permission types + pure helpers.
// Server-only helpers (getCurrentPermissions) live in ./permissions-server.

export type UserPermissions = {
    can_view_all_employees: boolean
    can_edit_employees: boolean
    can_view_approval_limits: boolean
    can_edit_approval_limits: boolean
    can_approve_leave: boolean
    can_manage_system: boolean
    /**
     * Allow-list flag for salary slips. Decoupled from `role` and
     * from the other HR flags so HR Managers can hold full HR
     * access without seeing payroll data. An employee can always
     * view their OWN slips regardless of this flag.
     */
    can_manage_payroll: boolean
    /**
     * Read access to the employee_audit_log + user_permission_audit_log
     * tables. Default off — only Super Admin sees system-wide audit.
     */
    can_view_audit_log: boolean
    /**
     * View HR attendance insights for absence/leave/late coaching.
     * This is deliberately narrower than HR Admin because the page is
     * sensitive and not every HR-capable user should see it.
     */
    can_view_attendance_insights: boolean
}

export const EMPTY_PERMISSIONS: UserPermissions = {
    can_view_all_employees: false,
    can_edit_employees: false,
    can_view_approval_limits: false,
    can_edit_approval_limits: false,
    can_approve_leave: false,
    can_manage_system: false,
    can_manage_payroll: false,
    can_view_audit_log: false,
    can_view_attendance_insights: false,
}

/**
 * Ordered list of every permission flag, paired with a Thai label and a
 * one-line description. The editor renders checkboxes off this list so
 * adding a new flag here makes it appear in the UI without code changes
 * elsewhere.
 */
export const PERMISSION_FLAGS: Array<{
    key: keyof UserPermissions
    label: string
    description: string
}> = [
    { key: 'can_view_all_employees',   label: 'ดูข้อมูลพนักงานทุกคน',     description: 'เข้าถึงรายชื่อ + โปรไฟล์พนักงานทั้งบริษัท' },
    { key: 'can_edit_employees',       label: 'แก้ไขข้อมูลพนักงาน',       description: 'อัปเดต/ลบ/เพิ่มพนักงาน · ตั้งค่าผู้บังคับบัญชา' },
    { key: 'can_view_approval_limits', label: 'ดูวงเงินอนุมัติเป๊ะ',       description: 'เห็นตัวเลข budget เต็ม (ไม่ใช่แค่ tier)' },
    { key: 'can_edit_approval_limits', label: 'แก้ไขวงเงินอนุมัติ',        description: 'กำหนดวงเงิน budget approval ของพนักงาน' },
    { key: 'can_approve_leave',        label: 'อนุมัติการลา',              description: 'อนุมัติ/ปฏิเสธคำขอลานอกเหนือสายบังคับบัญชา' },
    { key: 'can_manage_system',        label: 'จัดการระบบ',                description: 'แก้ไขสิทธิ์ของผู้ใช้คนอื่น · ดู system quota · super-admin' },
    { key: 'can_manage_payroll',       label: 'จัดการเงินเดือน (สลิป)',    description: 'อัปโหลด/ดูสลิปเงินเดือนของพนักงานทุกคน' },
    { key: 'can_view_audit_log',       label: 'ดู audit log',              description: 'อ่านประวัติการแก้ไขข้อมูล + เปลี่ยนสิทธิ์' },
    { key: 'can_view_attendance_insights', label: 'ดูสถิติขาด ลา มาสาย', description: 'เห็นหน้าวิเคราะห์พนักงานที่ควรติดตามเรื่องขาดงาน ลา และมาสาย' },
]

export type ApprovalTier = 'small' | 'medium' | 'large' | 'unlimited'

export const TIER_LABELS: Record<ApprovalTier, { th: string; icon: string }> = {
    small:     { th: 'วงเงินเล็ก',  icon: '💧' },
    medium:    { th: 'วงเงินกลาง',  icon: '💎' },
    large:     { th: 'วงเงินใหญ่',  icon: '🔥' },
    unlimited: { th: 'ไม่จำกัด',    icon: '♾️' },
}

export function limitToTier(limit?: number | null): ApprovalTier {
    if (!limit || limit <= 30_000) return 'small'
    if (limit <= 100_000) return 'medium'
    if (limit <= 500_000) return 'large'
    return 'unlimited'
}

export function canSeeExactAmount(viewer: UserPermissions): boolean {
    return viewer.can_view_approval_limits
}

export function canEditEmployee(
    viewer: { permissions: UserPermissions; approval_level: number; id: string },
    target: { id: string; approval_level: number }
): boolean {
    if (!viewer.permissions.can_edit_employees) return false
    if (viewer.permissions.can_manage_system) return true
    if (target.approval_level >= viewer.approval_level) return false
    if (target.id === viewer.id) return false
    return true
}
