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
        'id, first_name_th, last_name_th, nickname, position, department, secondary_department, photo_url, approval_level, manager_id, is_approver'

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
    const chain: Record<string, unknown>[] = []
    const visited = new Set<string>([me.id as string])
    let cursorManagerId = me.manager_id as string | null

    while (cursorManagerId) {
        if (visited.has(cursorManagerId)) break // cycle guard
        visited.add(cursorManagerId)

        const { data: next } = await supabaseAdmin
            .from('employees')
            .select(EMPLOYEE_SELECT)
            .eq('id', cursorManagerId)
            .maybeSingle()

        if (!next) break
        chain.push(next as Record<string, unknown>)

        // Stop at the chairman (Level 5) or when no manager above
        if ((next.approval_level as number | null) === 5) break
        cursorManagerId = (next.manager_id as string | null) ?? null
    }

    return NextResponse.json({ me, chain })
}
