import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireHrAdmin } from '@/lib/policy-helpers'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hradmin/leave/policies/apply
 * Body: {
 *   year: number,
 *   skip_manually_adjusted?: boolean   (default true)
 *   dry_run?: boolean                   (default false)
 * }
 *
 * Walks every active employee × active leave_type, calls
 * calculate_leave_entitlement() for each, and upserts leave_balances
 * accordingly. Respects is_manually_adjusted when skip flag is on.
 *
 * Leaves used_days / pending_days alone — this only reshapes total_days
 * (and records which policy drove it).
 *
 * Safe to run multiple times; idempotent per employee when policies
 * don't change.
 */
export async function POST(req: NextRequest) {
    const block = await requireHrAdmin(); if (block) return block
    const session = await getSession()

    const body = await req.json().catch(() => ({}))
    const year = Number(body.year)
    const skipAdjusted = body.skip_manually_adjusted !== false
    const dryRun = Boolean(body.dry_run)
    if (!Number.isFinite(year)) {
        return NextResponse.json({ error: 'ต้องระบุปี' }, { status: 400 })
    }

    // Active employees
    const { data: emps, error: empErr } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, nickname, approval_level')
        .eq('status', 'active')
    if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

    // Active leave types
    const { data: types, error: typeErr } = await supabaseAdmin
        .from('leave_types')
        .select('id, name_th, is_unlimited')
        .eq('is_active', true)
    if (typeErr) return NextResponse.json({ error: typeErr.message }, { status: 500 })

    // All existing balance rows for this year — one round-trip beats 54×6 point queries
    const { data: existingRows } = await supabaseAdmin
        .from('leave_balances')
        .select('id, employee_id, leave_type_id, total_days, is_manually_adjusted')
        .eq('year', year)
    const balanceKey = (emp: string, type: string) => `${emp}::${type}`
    const balanceMap = new Map<string, {
        id: string; total_days: number; is_manually_adjusted: boolean | null
    }>()
    for (const row of existingRows ?? []) {
        balanceMap.set(
            balanceKey(row.employee_id as string, row.leave_type_id as string),
            {
                id: row.id as string,
                total_days: Number(row.total_days ?? 0),
                is_manually_adjusted: (row.is_manually_adjusted as boolean | null) ?? null,
            },
        )
    }

    type ChangeRow = {
        employee_code: string
        employee_name: string
        leave_type_id: string
        old_total: number
        new_total: number
        policy_id: string | null
        source: string
    }
    const applied: ChangeRow[] = []
    const skipped: ChangeRow[] = []
    let updatedCount = 0
    let createdCount = 0
    let skippedCount = 0
    let noPolicyCount = 0
    const nowIso = new Date().toISOString()
    const adjustedBy = session?.id ?? null

    for (const emp of emps ?? []) {
        // Skip leave types that are unlimited — total_days concept doesn't apply
        for (const type of (types ?? []).filter(t => !t.is_unlimited)) {
            const key = balanceKey(emp.id as string, type.id as string)
            const existing = balanceMap.get(key)
            const isManual = existing?.is_manually_adjusted ?? false
            const oldTotal = existing?.total_days ?? 0

            // Call the RPC for this employee + type
            const { data: rpcRows, error: rpcErr } = await supabaseAdmin.rpc(
                'calculate_leave_entitlement',
                { p_employee_id: emp.id, p_leave_type_id: type.id, p_year: year },
            )
            if (rpcErr) {
                console.error('[policies/apply] rpc error:', rpcErr, { emp: emp.id, type: type.id })
                continue
            }
            const result = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
            const days = Number(result?.days ?? 0)
            const source = (result?.source as string | null) ?? 'default'
            const policyId = (result?.policy_id as string | null) ?? null
            if (source === 'default') noPolicyCount++

            const changeRow: ChangeRow = {
                employee_code: emp.employee_code as string,
                employee_name: (emp.first_name_th as string ?? '')
                    + (emp.nickname ? ` (${emp.nickname})` : ''),
                leave_type_id: type.id as string,
                old_total: oldTotal,
                new_total: days,
                policy_id: policyId,
                source,
            }

            // Skip manually-adjusted rows when the flag is on
            if (existing && isManual && skipAdjusted) {
                skippedCount++
                skipped.push(changeRow)
                continue
            }

            // No change? still count it, don't write
            if (existing && oldTotal === days) continue

            applied.push(changeRow)
            if (dryRun) continue

            if (existing) {
                const { error: upErr } = await supabaseAdmin
                    .from('leave_balances')
                    .update({
                        total_days: days,
                        policy_id: policyId,
                        is_manually_adjusted: false,
                        last_adjusted_by: adjustedBy,
                        last_adjusted_at: nowIso,
                        updated_at: nowIso,
                    })
                    .eq('id', existing.id)
                if (upErr) {
                    console.error('[policies/apply] update error:', upErr)
                    continue
                }
                updatedCount++
            } else {
                const { error: insErr } = await supabaseAdmin
                    .from('leave_balances')
                    .insert({
                        employee_id: emp.id,
                        leave_type_id: type.id,
                        year,
                        total_days: days,
                        used_days: 0,
                        pending_days: 0,
                        policy_id: policyId,
                        is_manually_adjusted: false,
                        last_adjusted_by: adjustedBy,
                        last_adjusted_at: nowIso,
                    })
                if (insErr) {
                    console.error('[policies/apply] insert error:', insErr)
                    continue
                }
                createdCount++
            }
        }
    }

    return NextResponse.json({
        success: true,
        dry_run: dryRun,
        year,
        updated_count: updatedCount,
        created_count: createdCount,
        skipped_count: skippedCount,
        no_policy_count: noPolicyCount,
        applied_sample: applied.slice(0, 20),
        skipped_sample: skipped.slice(0, 20),
    })
}
