import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { ClaimCategory, ExpenseClaim } from '@/lib/expense-claims-shared'

export const CLAIM_RECEIPT_BUCKET = 'employee-expenses'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

const CLAIM_COLUMNS =
    'id, employee_id, category_id, category_name, title, amount, expense_date, description, receipt_path, receipt_file_name, status, submitted_by_name, reviewed_by_name, reviewed_at, review_note, paid_by_name, paid_on, payment_note, created_at'

/** True when the migration hasn't been applied yet — pages show a hint instead of crashing. */
export function isMissingClaimTable(error: { code?: string | null; message?: string | null } | null) {
    if (!error) return false
    const message = (error.message ?? '').toLowerCase()
    return error.code === '42P01' || error.code === 'PGRST205' || message.includes('expense_claim')
}

function normalize(rows: unknown[]): ExpenseClaim[] {
    return (rows as (ExpenseClaim & { amount: number | string })[]).map((row) => ({
        ...row,
        amount: Number(row.amount),
    }))
}

export async function fetchClaimCategories(includeInactive = false) {
    let query = supabaseAdmin
        .from('expense_claim_categories')
        .select('id, name, sort_order, is_active')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
    if (!includeInactive) query = query.eq('is_active', true)
    const { data, error } = await query
    if (error) {
        if (isMissingClaimTable(error)) return { categories: [] as ClaimCategory[], missing: true }
        throw new Error(error.message)
    }
    return { categories: (data ?? []) as ClaimCategory[], missing: false }
}

export async function fetchEmployeeClaims(employeeId: string) {
    const { data, error } = await supabaseAdmin
        .from('expense_claims')
        .select(CLAIM_COLUMNS)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
    if (error) {
        if (isMissingClaimTable(error)) return { claims: [] as ExpenseClaim[], missing: true }
        throw new Error(error.message)
    }
    return { claims: normalize(data ?? []), missing: false }
}

export async function fetchAllClaims() {
    const { data, error } = await supabaseAdmin
        .from('expense_claims')
        .select(`${CLAIM_COLUMNS}, employee:employees(employee_code, first_name_th, last_name_th, nickname, department)`)
        .order('created_at', { ascending: false })
        .limit(1000)
    if (error) {
        if (isMissingClaimTable(error)) return { claims: [] as ExpenseClaim[], missing: true }
        throw new Error(error.message)
    }
    return { claims: normalize(data ?? []), missing: false }
}

/** Validate + upload an optional receipt. Returns null fields when no file was sent. */
export async function uploadClaimReceipt(employeeId: string, file: FormDataEntryValue | null) {
    if (!(file instanceof File) || file.size === 0) {
        return { ok: true as const, receipt: { receipt_path: null, receipt_file_name: null, receipt_mime_type: null } }
    }
    if (file.size > MAX_FILE_SIZE) return { ok: false as const, error: 'ไฟล์ใหญ่เกิน 10MB' }
    const type = file.type || 'application/octet-stream'
    if (!ALLOWED_TYPES.has(type)) return { ok: false as const, error: 'รองรับเฉพาะ PDF, JPG, PNG, WEBP' }

    const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'receipt'
    const path = `claims/${employeeId}/${Date.now()}-${safeName}`
    const { error } = await supabaseAdmin.storage
        .from(CLAIM_RECEIPT_BUCKET)
        .upload(path, file, { contentType: type, upsert: false })
    if (error) return { ok: false as const, error: `อัปโหลดใบเสร็จไม่สำเร็จ: ${error.message}` }

    return { ok: true as const, receipt: { receipt_path: path, receipt_file_name: file.name, receipt_mime_type: type } }
}

/** Parse the shared claim form fields (used by both employee and HR create). */
export async function parseClaimForm(form: FormData) {
    const categoryId = String(form.get('category_id') ?? '').trim()
    const title = String(form.get('title') ?? '').trim()
    const amount = Number(String(form.get('amount') ?? '').replace(/,/g, ''))
    const expenseDate = String(form.get('expense_date') ?? '').trim()
    const description = String(form.get('description') ?? '').trim() || null

    if (!categoryId) return { ok: false as const, error: 'กรุณาเลือกประเภท' }
    if (!title) return { ok: false as const, error: 'กรุณากรอกรายการ' }
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false as const, error: 'จำนวนเงินไม่ถูกต้อง' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return { ok: false as const, error: 'วันที่ไม่ถูกต้อง' }

    const { data: category } = await supabaseAdmin
        .from('expense_claim_categories')
        .select('id, name')
        .eq('id', categoryId)
        .maybeSingle()
    if (!category) return { ok: false as const, error: 'ไม่พบประเภทที่เลือก' }

    return {
        ok: true as const,
        values: {
            category_id: category.id as string,
            category_name: category.name as string,
            title: title.slice(0, 200),
            amount: Math.round(amount * 100) / 100,
            expense_date: expenseDate,
            description: description?.slice(0, 1000) ?? null,
        },
    }
}
