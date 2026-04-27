import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leave/approver-chain
 *
 * Read-only preview of the approval chain that *would* fire if the
 * signed-in user submitted a leave request right now. Mirrors the
 * logic in lib/leave-approval-actions.ts::buildApprovalChain so the
 * leave form can show the routing transparently to the employee
 * before they hit submit.
 *
 * The chain doesn't change based on leave type or dates — it's a
 * function of the employee's approval_level + manager_id + the
 * current HR roster — so we can compute it once when the form opens
 * and reuse for every step.
 *
 * Returns:
 *   { chain: [{ id, name, role, role_label }], level, error? }
 *
 * If the user has no manager and HR roster is empty, the chain comes
 * back empty — the form should warn the user to ask HR to set their
 * approver before submitting.
 */
export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ chain: [], level: null, error: 'no_employee_link' })
    }

    // Pull the current user's row — we need approval_level + manager_id.
    const { data: me } = await supabaseAdmin
        .from('employees')
        .select('id, approval_level, manager_id, first_name_th, last_name_th')
        .eq('id', employeeId)
        .maybeSingle()
    if (!me) {
        return NextResponse.json({ chain: [], level: null, error: 'no_employee_row' })
    }

    const level = (me.approval_level as number | null) ?? 1

    // HR contact — we look up by users.role first, fall back to
    // employees with the can_edit_employees flag if no hr_admin user
    // is linked. Either way, the first match wins.
    async function fetchHr(): Promise<EmpLite | null> {
        const { data: hrUsers } = await supabaseAdmin
            .from('User')
            .select('id')
            .or('role.eq.hr_admin,can_edit_employees.eq.true,can_manage_system.eq.true')
        const ids = (hrUsers ?? []).map((u) => u.id as string).filter(Boolean)
        if (!ids.length) return null
        const { data: hrEmp } = await supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th')
            .in('user_id', ids)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()
        return hrEmp
            ? { id: hrEmp.id as string, name: empName(hrEmp) }
            : null
    }

    async function fetchById(id: string): Promise<EmpLite | null> {
        const { data } = await supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, manager_id')
            .eq('id', id)
            .maybeSingle()
        return data
            ? { id: data.id as string, name: empName(data), managerId: data.manager_id as string | null }
            : null
    }

    async function findFirstByLevel(lvl: number): Promise<EmpLite | null> {
        const { data } = await supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th')
            .eq('approval_level', lvl)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()
        return data
            ? { id: data.id as string, name: empName(data) }
            : null
    }

    const chain: ChainStep[] = []

    if (level === 1) {
        if (me.manager_id) {
            const sup = await fetchById(me.manager_id as string)
            if (sup) {
                chain.push({ id: sup.id, name: sup.name, role: 'supervisor', role_label: 'หัวหน้างาน' })
                if (sup.managerId) {
                    const sup2 = await fetchById(sup.managerId)
                    if (sup2) chain.push({ id: sup2.id, name: sup2.name, role: 'manager', role_label: 'ผู้จัดการ' })
                }
            }
        }
    } else if (level === 2) {
        if (me.manager_id) {
            const sup = await fetchById(me.manager_id as string)
            if (sup) chain.push({ id: sup.id, name: sup.name, role: 'manager', role_label: 'ผู้จัดการ' })
        }
    } else if (level === 3) {
        const md = await findFirstByLevel(4)
        if (md) chain.push({ id: md.id, name: md.name, role: 'md', role_label: 'กรรมการผู้จัดการ' })
    }
    // level 4 / 5 → HR-only, no intermediate step

    const hr = await fetchHr()
    if (hr) chain.push({ id: hr.id, name: hr.name, role: 'hr', role_label: 'ฝ่ายบุคคล' })

    return NextResponse.json({
        chain,
        level,
        my_name: empName(me),
    })
}

// ── Types & helpers ───────────────────────────────────────────────────

interface ChainStep {
    id: string
    name: string
    role: 'supervisor' | 'manager' | 'hr' | 'md'
    role_label: string
}

interface EmpLite {
    id: string
    name: string
    managerId?: string | null
}

function empName(row: { first_name_th?: unknown; last_name_th?: unknown }): string {
    const first = (row.first_name_th as string | null)?.trim() ?? ''
    const last = (row.last_name_th as string | null)?.trim() ?? ''
    const full = `${first} ${last}`.trim()
    return full || '—'
}
