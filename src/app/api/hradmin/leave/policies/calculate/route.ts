import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireHrAdmin } from '@/lib/policy-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hradmin/leave/policies/calculate
 * Body: { employee_id: string, leave_type_id: string, year?: number }
 *
 * Thin wrapper around the calculate_leave_entitlement() DB function.
 * Enriches the result with the employee's context (level + years of
 * service) and the winning policy's description so the UI can show
 * *why* the answer came out that way.
 */
export async function POST(req: NextRequest) {
    const block = await requireHrAdmin(); if (block) return block

    const body = await req.json().catch(() => ({}))
    const employeeId = String(body.employee_id ?? '').trim()
    const leaveTypeId = String(body.leave_type_id ?? '').trim()
    const year = Number(body.year ?? new Date().getFullYear())
    if (!employeeId || !leaveTypeId) {
        return NextResponse.json({ error: 'ต้องระบุพนักงานและประเภทการลา' }, { status: 400 })
    }

    const { data: rpcRows, error: rpcErr } = await supabaseAdmin.rpc(
        'calculate_leave_entitlement',
        { p_employee_id: employeeId, p_leave_type_id: leaveTypeId, p_year: year },
    )
    if (rpcErr) {
        console.error('[policies/calculate] rpc error:', rpcErr)
        return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    }
    // RPC returns a TABLE, so supabase-js gives us an array
    const result = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
    const days = Number(result?.days ?? 0)
    const policyId = (result?.policy_id as string | null) ?? null
    const source = (result?.source as string | null) ?? 'default'

    // Employee context (level + years)
    const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, position, department, approval_level, start_date')
        .eq('id', employeeId)
        .maybeSingle()

    let yearsService = 0
    if (emp?.start_date) {
        const yearEnd = new Date(Date.UTC(year, 11, 31))
        const start = new Date(String(emp.start_date))
        yearsService = Math.max(0, (yearEnd.getTime() - start.getTime()) / (365.2425 * 86400000))
    }

    // Fetch the winning policy's description + days (for the "จาก policy" line)
    let policy: {
        id: string
        description: string | null
        days_per_year: number
        priority: number | null
        min_level: number | null
        max_level: number | null
        min_years_service: number | null
        max_years_service: number | null
    } | null = null
    if (policyId) {
        const { data: p } = await supabaseAdmin
            .from('leave_policies')
            .select('id, description, days_per_year, priority, min_level, max_level, min_years_service, max_years_service')
            .eq('id', policyId)
            .maybeSingle()
        policy = p as typeof policy
    }

    return NextResponse.json({
        days,
        policy_id: policyId,
        source, // 'policy' | 'default' | 'employee_not_found'
        policy,
        employee: emp ? {
            id: emp.id,
            employee_code: emp.employee_code,
            full_name: `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim()
                + (emp.nickname ? ` (${emp.nickname})` : ''),
            position: emp.position ?? null,
            department: emp.department ?? null,
            approval_level: emp.approval_level ?? null,
            years_service: Math.round(yearsService * 10) / 10,
            start_date: emp.start_date ?? null,
        } : null,
        year,
    })
}
