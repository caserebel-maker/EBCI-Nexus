import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseClaimForm, uploadClaimReceipt } from '@/lib/expense-claims'
import { findHrNotifyTargets } from '@/lib/hr-notify'
import { createNotification } from '@/lib/notifications'
import { formatBaht } from '@/lib/expense-claims-shared'

/** Employee submits a new claim → status pending. */
export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงานของบัญชีนี้' }, { status: 404 })

    const form = await request.formData()
    const parsed = await parseClaimForm(form)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const upload = await uploadClaimReceipt(employeeId, form.get('receipt'))
    if (!upload.ok) return NextResponse.json({ error: upload.error }, { status: 400 })

    const { data, error } = await supabaseAdmin
        .from('expense_claims')
        .insert({
            employee_id: employeeId,
            ...parsed.values,
            ...upload.receipt,
            status: 'pending',
            submitted_by: session.id,
            submitted_by_name: session.name,
        })
        .select('id')
        .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Best-effort: tell HR there's a new claim waiting.
    const targets = await findHrNotifyTargets().catch(() => [])
    await Promise.all(
        targets
            .filter((t) => t.userId)
            .map((t) =>
                createNotification({
                    recipient_user_id: t.userId as string,
                    type: 'expense_claim_submitted',
                    title: `${session.name} ขอเบิก ${parsed.values.category_name}`,
                    body: `${parsed.values.title} · ${formatBaht(parsed.values.amount)} บาท`,
                    action_url: '/hradmin/expenses',
                    action_label: 'ตรวจสอบ',
                    entity_type: 'expense_claim',
                    entity_id: data.id as string,
                    color: 'amber',
                    sender_user_id: session.id,
                    sender_name: session.name,
                }),
            ),
    )

    return NextResponse.json({ id: data.id })
}
