import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { EXPENSE_CATEGORIES } from '@/lib/employee-expense-shared'

async function requireHr() {
    const auth = await getAuth()
    return auth && isHrStaff(auth) ? auth : null
}

async function assertBenefit(employeeIdOrCode: string, benefitId: string): Promise<{ employeeId: string } | null> {
    const employee = await supabaseAdmin
        .from('employees')
        .select('id')
        .or(`id.eq.${employeeIdOrCode},employee_code.eq.${employeeIdOrCode}`)
        .maybeSingle()
    if (!employee.data?.id) return null

    const benefit = await supabaseAdmin
        .from('employee_expense_benefits')
        .select('id')
        .eq('id', benefitId)
        .eq('employee_id', employee.data.id)
        .maybeSingle()
    if (!benefit.data?.id) return null
    return { employeeId: employee.data.id as string }
}

function nullableText(value: unknown) {
    const text = String(value ?? '').trim()
    return text.length ? text : null
}

function nullableAmount(value: unknown) {
    const text = String(value ?? '').trim()
    if (!text) return null
    const amount = Number(text)
    return Number.isFinite(amount) ? amount : null
}

function nullableMonth(value: unknown) {
    const text = String(value ?? '').trim()
    return /^\d{4}-\d{2}$/.test(text) ? text : null
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string; benefitId: string }> },
) {
    const auth = await requireHr()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, benefitId } = await context.params
    const resolved = await assertBenefit(id, benefitId)
    if (!resolved) return NextResponse.json({ error: 'ไม่พบรายการค่าใช้จ่าย' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}

    if (body.title !== undefined) {
        const title = String(body.title ?? '').trim()
        if (!title) return NextResponse.json({ error: 'กรุณาระบุชื่อค่าใช้จ่าย' }, { status: 400 })
        patch.title = title
    }
    if (body.category !== undefined) {
        const category = String(body.category)
        const validCategory = EXPENSE_CATEGORIES.some((item) => item.value === category)
        if (!validCategory) return NextResponse.json({ error: 'ประเภทค่าใช้จ่ายไม่ถูกต้อง' }, { status: 400 })
        patch.category = category
    }
    if (body.description !== undefined) patch.description = nullableText(body.description)
    if (body.default_amount !== undefined) patch.default_amount = nullableAmount(body.default_amount)
    if (body.start_month !== undefined) patch.start_month = nullableMonth(body.start_month)
    if (body.end_month !== undefined) patch.end_month = nullableMonth(body.end_month)
    if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active)

    const { error } = await supabaseAdmin
        .from('employee_expense_benefits')
        .update(patch)
        .eq('id', benefitId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string; benefitId: string }> },
) {
    const auth = await requireHr()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, benefitId } = await context.params
    const resolved = await assertBenefit(id, benefitId)
    if (!resolved) return NextResponse.json({ error: 'ไม่พบรายการค่าใช้จ่าย' }, { status: 404 })

    const { data: files } = await supabaseAdmin
        .from('employee_expense_payments')
        .select('receipt_path')
        .eq('benefit_id', benefitId)
        .not('receipt_path', 'is', null)

    const paths = (files ?? []).map((row) => row.receipt_path).filter(Boolean) as string[]
    if (paths.length) {
        await supabaseAdmin.storage.from('employee-expenses').remove(paths)
    }

    const { error } = await supabaseAdmin
        .from('employee_expense_benefits')
        .delete()
        .eq('id', benefitId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
