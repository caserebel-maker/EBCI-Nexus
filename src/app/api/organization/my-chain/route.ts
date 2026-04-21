import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

// GET /api/organization/my-chain
// Returns the logged-in user's approval chain walking up reports_to_id /
// manager_id until null or approval_level reaches 5 (ประธาน).
//
// Spec: docs/ebci-permission-model-spec.md §"Tab 3"
// Response shape:
//   {
//     me:    { id, first_name_th, nickname, position, department, photo_url, approval_level },
//     chain: [ { ...same fields, is_approver }, ... ]
//   }
export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const EMPLOYEE_SELECT =
        'id, first_name_th, last_name_th, nickname, position, department, secondary_department, photo_url, approval_level, manager_id, leave_approver_id, is_approver'

    // ── Resolve the current user's employee record ─────────────────────────
    let me: Record<string, unknown> | null = null

    if (session.employeeId) {
        const { data } = await supabaseAdmin
            .from('employees')
            .select(EMPLOYEE_SELECT)
            .eq('id', session.employeeId)
            .maybeSingle()
        me = data ?? null
    }

    if (!me && session.name?.includes('@')) {
        const { data } = await supabaseAdmin
            .from('employees')
            .select(EMPLOYEE_SELECT)
            .eq('email', session.name)
            .maybeSingle()
        me = data ?? null
    }

    if (!me && session.id) {
        const { data } = await supabaseAdmin
            .from('employees')
            .select(EMPLOYEE_SELECT)
            .eq('user_id', session.id)
            .maybeSingle()
        me = data ?? null
    }

    if (!me) {
        return NextResponse.json({ error: 'Employee record not linked' }, { status: 404 })
    }

    // ── Walk up the chain ───────────────────────────────────────────────────
    // Rules: prefer leave_approver_id over manager_id; stop after reaching
    // approval_level ≥ 4 (MD or ประธาน). Mark steps that came via override.
    const chain: Array<Record<string, unknown> & { is_override: boolean }> = []
    const visited = new Set<string>([me.id as string])
    let cursor: Record<string, unknown> = me
    let guard = 0 // defensive max-depth

    while (guard < 20) {
        guard += 1
        const cursorOverride = (cursor.leave_approver_id as string | null) ?? null
        const cursorManager = (cursor.manager_id as string | null) ?? null
        const nextId = cursorOverride ?? cursorManager
        if (!nextId) break
        if (visited.has(nextId)) break
        visited.add(nextId)

        const { data: next } = await supabaseAdmin
            .from('employees')
            .select(EMPLOYEE_SELECT)
            .eq('id', nextId)
            .maybeSingle()

        if (!next) break

        chain.push({ ...(next as Record<string, unknown>), is_override: Boolean(cursorOverride) })

        const nextLevel = (next.approval_level as number | null) ?? 0
        if (nextLevel >= 4) break // stop at MD or ประธาน

        cursor = next as Record<string, unknown>
    }

    return NextResponse.json({ me, chain })
}
