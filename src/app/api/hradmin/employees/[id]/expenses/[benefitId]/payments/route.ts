import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { EXPENSE_PAYMENT_STATUSES } from '@/lib/employee-expense-shared'

const BUCKET = 'employee-expenses'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

async function requireHr() {
    const auth = await getAuth()
    return auth && isHrStaff(auth) ? auth : null
}

async function resolveEmployeeId(idOrCode: string): Promise<string | null> {
    const { data } = await supabaseAdmin
        .from('employees')
        .select('id')
        .or(`id.eq.${idOrCode},employee_code.eq.${idOrCode}`)
        .maybeSingle()
    return (data?.id as string | undefined) ?? null
}

async function assertBenefit(employeeId: string, benefitId: string) {
    const { data } = await supabaseAdmin
        .from('employee_expense_benefits')
        .select('id')
        .eq('id', benefitId)
        .eq('employee_id', employeeId)
        .maybeSingle()
    return Boolean(data?.id)
}

function getInt(value: FormDataEntryValue | null, fallback: number) {
    const number = Number(value)
    return Number.isInteger(number) ? number : fallback
}

function getAmount(value: FormDataEntryValue | null) {
    const text = String(value ?? '').trim()
    if (!text) return null
    const amount = Number(text)
    return Number.isFinite(amount) ? amount : null
}

function getText(value: FormDataEntryValue | null) {
    const text = String(value ?? '').trim()
    return text.length ? text : null
}

function safeFileName(name: string) {
    return name.replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'receipt'
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string; benefitId: string }> },
) {
    const auth = await requireHr()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, benefitId } = await context.params
    const employeeId = await resolveEmployeeId(id)
    if (!employeeId) return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })
    if (!(await assertBenefit(employeeId, benefitId))) {
        return NextResponse.json({ error: 'ไม่พบรายการค่าใช้จ่าย' }, { status: 404 })
    }

    const form = await request.formData()
    const now = new Date()
    const paymentYear = getInt(form.get('payment_year'), now.getFullYear())
    const paymentMonth = getInt(form.get('payment_month'), now.getMonth() + 1)
    const status = String(form.get('status') ?? 'pending')
    if (paymentMonth < 1 || paymentMonth > 12) {
        return NextResponse.json({ error: 'เดือนไม่ถูกต้อง' }, { status: 400 })
    }
    if (!EXPENSE_PAYMENT_STATUSES.some((item) => item.value === status)) {
        return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 })
    }

    const file = form.get('receipt')
    let receiptPath: string | null = null
    let receiptName: string | null = null
    let receiptSize: number | null = null
    let receiptType: string | null = null

    if (file instanceof File && file.size > 0) {
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'ไฟล์ใหญ่เกิน 10MB' }, { status: 400 })
        }
        if (file.type && !ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json({ error: 'รองรับเฉพาะ PDF, JPG, PNG หรือ WebP' }, { status: 400 })
        }
        receiptName = file.name
        receiptSize = file.size
        receiptType = file.type || 'application/octet-stream'
        receiptPath = `${employeeId}/${benefitId}/${paymentYear}-${String(paymentMonth).padStart(2, '0')}-${Date.now()}-${safeFileName(file.name)}`

        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(receiptPath, file, { contentType: receiptType, upsert: false })
        if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
        .from('employee_expense_payments')
        .insert({
            benefit_id: benefitId,
            employee_id: employeeId,
            payment_year: paymentYear,
            payment_month: paymentMonth,
            amount: getAmount(form.get('amount')),
            status,
            paid_on: getText(form.get('paid_on')),
            notes: getText(form.get('notes')),
            receipt_path: receiptPath,
            receipt_file_name: receiptName,
            receipt_file_size: receiptSize,
            receipt_mime_type: receiptType,
            recorded_by: auth.session.id,
        })
        .select('id')
        .single()

    if (error) {
        if (receiptPath) await supabaseAdmin.storage.from(BUCKET).remove([receiptPath])
        const duplicate = error.code === '23505'
        return NextResponse.json(
            { error: duplicate ? 'เดือนนี้มีรายการแล้ว กรุณาลบหรือแก้รายการเดิมก่อน' : error.message },
            { status: duplicate ? 409 : 500 },
        )
    }

    return NextResponse.json({ ok: true, id: data.id })
}
