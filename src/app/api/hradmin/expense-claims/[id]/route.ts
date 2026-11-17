import { NextRequest, NextResponse } from 'next/server'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'
import { formatBaht } from '@/lib/expense-claims-shared'

type Action = 'approve' | 'reject' | 'pay'

// Which status each action is allowed from, and where it goes.
const TRANSITIONS: Record<Action, { from: string[]; to: string }> = {
    approve: { from: ['pending'], to: 'approved' },
    reject: { from: ['pending', 'approved'], to: 'rejected' },
    pay: { from: ['approved'], to: 'paid' },
}

const MESSAGES: Record<Action, { title: string; color: 'green' | 'red' | 'blue' }> = {
    approve: { title: 'คำขอเบิกได้รับการอนุมัติ', color: 'blue' },
    reject: { title: 'คำขอเบิกไม่ได้รับการอนุมัติ', color: 'red' },
    pay: { title: 'ได้รับเงินเบิกแล้ว', color: 'green' },
}

/** HR approves / rejects / marks a claim as paid. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { action?: string; note?: string; paid_on?: string }
    const action = body.action as Action
    const rule = TRANSITIONS[action]
    if (!rule) return NextResponse.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })

    const note = (body.note ?? '').trim().slice(0, 500) || null
    if (action === 'reject' && !note) return NextResponse.json({ error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' }, { status: 400 })

    const { session } = auth
    const update: Record<string, unknown> = { status: rule.to }
    if (action === 'pay') {
        const paidOn = (body.paid_on ?? '').trim() || new Date().toISOString().slice(0, 10)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return NextResponse.json({ error: 'วันที่จ่ายไม่ถูกต้อง' }, { status: 400 })
        Object.assign(update, { paid_by: session.id, paid_by_name: session.name, paid_on: paidOn, payment_note: note })
    } else {
        Object.assign(update, {
            reviewed_by: session.id,
            reviewed_by_name: session.name,
            reviewed_at: new Date().toISOString(),
            review_note: note,
        })
    }

    const { data, error } = await supabaseAdmin
        .from('expense_claims')
        .update(update)
        .eq('id', id)
        .in('status', rule.from)
        .select('employee_id, title, amount')
        .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'สถานะของรายการเปลี่ยนไปแล้ว กรุณารีเฟรช' }, { status: 409 })

    // Best-effort: tell the employee.
    const recipient = await getEmployeeUserId(data.employee_id as string)
    if (recipient) {
        const message = MESSAGES[action]
        await createNotification({
            recipient_user_id: recipient,
            type: `expense_claim_${rule.to}`,
            title: message.title,
            body: `${data.title} · ${formatBaht(Number(data.amount))} บาท${note ? ` · ${note}` : ''}`,
            action_url: '/portal/expenses',
            action_label: 'ดูรายการ',
            entity_type: 'expense_claim',
            entity_id: id,
            color: message.color,
            sender_user_id: session.id,
            sender_name: session.name,
        })
    }

    return NextResponse.json({ ok: true })
}
