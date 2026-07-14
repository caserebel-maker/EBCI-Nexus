import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { EXPENSE_CATEGORIES } from '@/lib/employee-expense-shared'

async function requireHr() {
    const auth = await getAuth()
    return auth && isHrStaff(auth) ? auth : null
}

async function resolveEmployeeId(idOrCode: string): Promise<string | null> {
    const byCode = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('employee_code', idOrCode)
        .maybeSingle()
    if (byCode.data?.id) return byCode.data.id as string

    const byId = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('id', idOrCode)
        .maybeSingle()
    return (byId.data?.id as string | null) ?? null
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

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await requireHr()
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const employeeId = await resolveEmployeeId(id)
    if (!employeeId) return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const title = String(body.title ?? '').trim()
    const category = String(body.category ?? 'other')
    const validCategory = EXPENSE_CATEGORIES.some((item) => item.value === category)

    if (!title) return NextResponse.json({ error: 'กรุณาระบุชื่อค่าใช้จ่าย' }, { status: 400 })
    if (!validCategory) return NextResponse.json({ error: 'ประเภทค่าใช้จ่ายไม่ถูกต้อง' }, { status: 400 })

    const { data, error } = await supabaseAdmin
        .from('employee_expense_benefits')
        .insert({
            employee_id: employeeId,
            title,
            category,
            description: nullableText(body.description),
            default_amount: nullableAmount(body.default_amount),
            start_month: nullableMonth(body.start_month),
            end_month: nullableMonth(body.end_month),
            is_active: body.is_active === undefined ? true : Boolean(body.is_active),
            created_by: auth.session.id,
        })
        .select('id')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
}
