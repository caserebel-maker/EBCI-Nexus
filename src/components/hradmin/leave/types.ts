// Shared types between Tab 2 components — avoids `any` + cross-file
// duplication when the view + drawer + table all need the same shape.

export interface LeaveTypeLite {
    id: string
    name_th: string
    color: string | null
    icon: string | null
    display_order: number | null
}

export interface EmployeeLite {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    department: string | null
    position: string | null
    photo_url: string | null
    email: string | null
}

export interface ApproverLite {
    id: string
    nickname: string | null
    first_name_th: string | null
    last_name_th: string | null
    photo_url: string | null
}

export interface LeaveRequestItem {
    id: string
    reference_code: string | null
    status: string
    start_date: string
    end_date: string
    total_days: number
    reason: string | null
    submitted_at: string | null
    created_at: string
    updated_at: string | null
    approved_at: string | null
    approval_notes: string | null
    rejection_reason: string | null
    attachment_url: string | null
    attachment_name: string | null
    is_half_day: boolean | null
    half_day_period: string | null
    contact_during_leave: string | null
    leave_type: {
        id: string
        name_th: string
        color: string | null
        icon: string | null
    } | null
    employee: EmployeeLite | null
    approver: ApproverLite | null
}

export interface RequestsFilterState {
    status: string[]
    leave_type: string[]
    department: string[]
    q: string
    from: string
    to: string
}

export interface RequestsPagination {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

export const STATUS_META: Record<string, { label: string; color: string; bg: string; ring: string }> = {
    pending:   { label: 'รออนุมัติ',  color: '#fcd34d', bg: 'rgba(251,191,36,0.18)', ring: 'rgba(251,191,36,0.35)' },
    approved:  { label: 'อนุมัติแล้ว', color: '#6ee7b7', bg: 'rgba(52,211,153,0.18)', ring: 'rgba(52,211,153,0.35)' },
    rejected:  { label: 'ปฏิเสธ',      color: '#fca5a5', bg: 'rgba(239,68,68,0.18)',  ring: 'rgba(239,68,68,0.35)' },
    cancelled: { label: 'ยกเลิก',      color: '#cbd5e1', bg: 'rgba(255,255,255,0.10)', ring: 'rgba(255,255,255,0.20)' },
}

export const STATUS_ORDER = ['pending', 'approved', 'rejected', 'cancelled'] as const
