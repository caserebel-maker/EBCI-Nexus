import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leave/inbox
 *
 * Returns the pending leave requests where the caller is the
 * assigned approver. Includes applicant + leave-type + balance join
 * in one round-trip so the inbox UI doesn't need follow-ups.
 */
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const approverId = await resolveSessionEmployeeId(session)
    if (!approverId) {
        console.warn('[leave/inbox] resolveSessionEmployeeId returned null', {
            sessionId: session.id, sessionEmployeeId: session.employeeId,
        })
        return NextResponse.json({ items: [], count: 0 })
    }

    // Primary lookup: approver_id stores employees.id. Surface BOTH
    // pending (initial decision) AND cancellation_requested (the §1.4
    // approved-leave cancel flow) so the approver sees their full
    // action queue in one place.
    const primary = await supabaseAdmin
        .from('leave_requests')
        .select(`
            id, reference_code, status, leave_type_id, start_date, end_date,
            total_days, is_half_day, half_day_period, reason,
            contact_during_leave, attachment_url, attachment_name,
            cancellation_reason, cancellation_requested_at,
            submitted_at, created_at,
            employee_id
        `)
        .eq('approver_id', approverId)
        .in('status', ['pending', 'cancellation_requested'])
        .order('submitted_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
    if (primary.error) {
        console.error('[leave/inbox] primary query error:', primary.error)
        return NextResponse.json({ error: primary.error.message }, { status: 500 })
    }

    let rows = primary.data ?? []

    // Secondary fallback: a small number of older rows were inserted
    // when approver_id referenced a different id (user_id instead of
    // employees.id, depending on the era). If the primary lookup came
    // back empty we retry using the raw session.id so legacy data still
    // surfaces. Any duplicates are de-duped by id before returning.
    if (rows.length === 0 && session.id && session.id !== approverId) {
        const secondary = await supabaseAdmin
            .from('leave_requests')
            .select(`
                id, reference_code, status, leave_type_id, start_date, end_date,
                total_days, is_half_day, half_day_period, reason,
                contact_during_leave, attachment_url, attachment_name,
                cancellation_reason, cancellation_requested_at,
                submitted_at, created_at,
                employee_id
            `)
            .eq('approver_id', session.id)
            .in('status', ['pending', 'cancellation_requested'])
            .order('submitted_at', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true })
        if (!secondary.error && (secondary.data?.length ?? 0) > 0) {
            console.warn('[leave/inbox] matched via session.id fallback — employees.id pathway returned 0', {
                sessionId: session.id, approverId, rowCount: secondary.data?.length,
            })
            rows = secondary.data ?? []
        }
    }

    console.log('[leave/inbox] resolved', {
        sessionId: session.id,
        approverId,
        rowCount: rows.length,
    })

    // Join applicant details + leave-type meta + current year's balance
    const list = rows ?? []
    const employeeIds = Array.from(new Set(list.map(r => r.employee_id as string)))
    const typeIds = Array.from(new Set(list.map(r => r.leave_type_id as string)))

    const [empsRes, typesRes, balancesRes] = await Promise.all([
        employeeIds.length
            ? supabaseAdmin
                .from('employees')
                .select('id, first_name_th, last_name_th, nickname, department, position, photo_url, email')
                .in('id', employeeIds)
            : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        typeIds.length
            ? supabaseAdmin
                .from('leave_types')
                .select('id, name_th, icon, color, is_unlimited')
                .in('id', typeIds)
            : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        employeeIds.length
            ? supabaseAdmin
                .from('leave_balances')
                .select('employee_id, leave_type_id, total_days, used_days, pending_days')
                .in('employee_id', employeeIds)
                .eq('year', new Date().getFullYear())
            : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    ])
    const empMap = new Map((empsRes.data ?? []).map(e => [e.id as string, e]))
    const typeMap = new Map((typesRes.data ?? []).map(t => [t.id as string, t]))
    const balanceMap = new Map<string, Record<string, unknown>>()
    for (const b of balancesRes.data ?? []) {
        balanceMap.set(`${b.employee_id}::${b.leave_type_id}`, b)
    }

    const items = list.map(r => {
        const emp = empMap.get(r.employee_id as string)
        const type = typeMap.get(r.leave_type_id as string)
        const balance = balanceMap.get(`${r.employee_id}::${r.leave_type_id}`)
        const total = Number(balance?.total_days ?? 0)
        const used = Number(balance?.used_days ?? 0)
        const pending = Number(balance?.pending_days ?? 0)
        const remaining = Math.max(0, total - used - pending)
        return {
            ...r,
            applicant: emp ? {
                id: emp.id,
                first_name_th: emp.first_name_th ?? null,
                last_name_th: emp.last_name_th ?? null,
                nickname: emp.nickname ?? null,
                department: emp.department ?? null,
                position: emp.position ?? null,
                photo_url: emp.photo_url ?? null,
                email: emp.email ?? null,
            } : null,
            leave_type: type ? {
                id: type.id,
                name_th: type.name_th ?? null,
                icon: type.icon ?? null,
                color: type.color ?? null,
                is_unlimited: Boolean(type.is_unlimited),
            } : null,
            balance: {
                total_days: total,
                used_days: used,
                pending_days: pending,
                remaining_days: remaining,
            },
        }
    })

    return NextResponse.json({ items, count: items.length })
}
