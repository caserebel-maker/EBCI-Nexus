export const EXPENSE_CATEGORIES = [
    { value: 'phone', label: 'ค่าโทรศัพท์' },
    { value: 'travel', label: 'ค่าเดินทาง' },
    { value: 'fuel', label: 'ค่าน้ำมัน' },
    { value: 'uniform', label: 'ค่าเครื่องแบบ' },
    { value: 'medical', label: 'ค่ารักษาพยาบาล' },
    { value: 'training', label: 'ค่าอบรม' },
    { value: 'welfare', label: 'สวัสดิการ' },
    { value: 'other', label: 'อื่น ๆ' },
] as const

export const EXPENSE_PAYMENT_STATUSES = [
    { value: 'pending', label: 'รอจ่าย' },
    { value: 'paid', label: 'จ่ายแล้ว' },
    { value: 'not_eligible', label: 'ไม่เข้าเงื่อนไข' },
    { value: 'cancelled', label: 'ยกเลิก' },
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value']
export type ExpensePaymentStatus = typeof EXPENSE_PAYMENT_STATUSES[number]['value']

export interface EmployeeExpensePayment {
    id: string
    benefit_id: string
    employee_id: string
    payment_year: number
    payment_month: number
    amount: number | null
    status: ExpensePaymentStatus
    paid_on: string | null
    receipt_path: string | null
    receipt_file_name: string | null
    receipt_file_size: number | null
    receipt_mime_type: string | null
    notes: string | null
    recorded_by: string | null
    created_at: string
    updated_at: string
}

export interface EmployeeExpenseBenefit {
    id: string
    employee_id: string
    title: string
    category: ExpenseCategory
    description: string | null
    default_amount: number | null
    start_month: string | null
    end_month: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    payments: EmployeeExpensePayment[]
}

export const THAI_MONTHS_FULL = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
]

export function formatExpenseMonth(year: number, month: number) {
    return `${THAI_MONTHS_FULL[month - 1] ?? month} ${year + 543}`
}

export function getCategoryLabel(value: string) {
    return EXPENSE_CATEGORIES.find((category) => category.value === value)?.label ?? value
}

export function getStatusLabel(value: string) {
    return EXPENSE_PAYMENT_STATUSES.find((status) => status.value === value)?.label ?? value
}

export function formatExpenseAmount(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return '—'
    const amount = Number(value)
    if (!Number.isFinite(amount)) return '—'
    return amount.toLocaleString('th-TH', {
        minimumFractionDigits: amount % 1 ? 2 : 0,
        maximumFractionDigits: 2,
    })
}
