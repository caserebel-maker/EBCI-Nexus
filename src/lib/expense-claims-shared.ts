// Shared (client + server) types and helpers for expense claims.

export const CLAIM_STATUSES = [
    { value: 'pending', label: 'รออนุมัติ' },
    { value: 'approved', label: 'อนุมัติแล้ว · รอจ่าย' },
    { value: 'paid', label: 'จ่ายแล้ว' },
    { value: 'rejected', label: 'ไม่อนุมัติ' },
    { value: 'cancelled', label: 'ยกเลิก' },
] as const

export type ClaimStatus = typeof CLAIM_STATUSES[number]['value']

export interface ClaimCategory {
    id: string
    name: string
    sort_order: number
    is_active: boolean
}

export interface ExpenseClaim {
    id: string
    employee_id: string
    category_id: string | null
    category_name: string
    title: string
    amount: number
    expense_date: string
    description: string | null
    receipt_path: string | null
    receipt_file_name: string | null
    status: ClaimStatus
    submitted_by_name: string | null
    reviewed_by_name: string | null
    reviewed_at: string | null
    review_note: string | null
    paid_by_name: string | null
    paid_on: string | null
    payment_note: string | null
    created_at: string
    employee?: {
        employee_code: string | null
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
        department: string | null
    } | null
}

export function claimStatusLabel(status: string) {
    return CLAIM_STATUSES.find((s) => s.value === status)?.label ?? status
}

export function claimStatusClass(status: string) {
    if (status === 'paid') return 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100'
    if (status === 'approved') return 'border-cyan-300/40 bg-cyan-400/15 text-cyan-100'
    if (status === 'pending') return 'border-yellow-300/40 bg-yellow-400/15 text-yellow-100'
    return 'border-rose-300/40 bg-rose-400/15 text-rose-100'
}

export function formatBaht(value: number | null | undefined) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—'
    return value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function formatThaiDate(value: string | null | undefined) {
    if (!value) return '—'
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function claimEmployeeName(claim: ExpenseClaim) {
    const e = claim.employee
    if (!e) return '—'
    const name = [e.first_name_th, e.last_name_th].filter(Boolean).join(' ') || e.employee_code || '—'
    return e.nickname ? `${name} (${e.nickname})` : name
}
