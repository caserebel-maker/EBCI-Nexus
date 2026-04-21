import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { getCurrentPermissions } from '@/lib/permissions-server'

type Emp = {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    position: string | null
    department: string | null
    photo_url: string | null
    approval_level: number | null
    manager_id: string | null
    leave_approver_id: string | null
    is_approver: boolean | null
    approval_scopes: string[] | null
    approval_limit_thb: number | null
}

type ApproverOut = Emp & { is_override?: boolean }

const EMP_SELECT =
    'id, first_name_th, last_name_th, nickname, position, department, photo_url, approval_level, manager_id, leave_approver_id, is_approver, approval_scopes, approval_limit_thb, email, user_id, status'

// GET /api/organization/approvers
//
// Spec: docs/ebci-permission-model-spec.md §"Tab 2" + business rules §"Logic getApproversForUser"
//
// Returns the current user's leave/OT chain, budget chain, the fixed HR approver
// list, and the full approver roster (for L3+ / admins). The `showExactAmount`
// flag tells the client whether to reveal approval_limit_thb or mask it as
// a tier icon.
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = await getCurrentPermissions()

    // Fetch all active employees once — cheaper than per-chain round trips
    const { data: rowsRaw } = await supabaseAdmin
        .from('employees')
        .select(EMP_SELECT)
        .eq('status', 'active')

    const rows = (rowsRaw ?? []) as unknown as (Emp & { email?: string; user_id?: string })[]
    const byId = new Map<string, Emp>(rows.map(r => [r.id, r]))

    // ── Resolve caller's employee record ───────────────────────────────────
    const candidates = rows.filter(r => {
        if (session.employeeId && r.id === session.employeeId) return true
        if (session.name && session.name.includes('@') && (r as unknown as { email?: string }).email === session.name) return true
        if (session.id && (r as unknown as { user_id?: string }).user_id === session.id) return true
        return false
    })
    const me = candidates[0] ?? null
    if (!me) {
        return NextResponse.json({ error: 'Employee record not linked' }, { status: 404 })
    }

    // ── Leave/OT chain: leave_approver_id override wins, stop after L≥4.
    //     President (L5) never shows up here unless the user was explicitly
    //     routed to them via leave_approver_id.
    const leaveOt: ApproverOut[] = []
    {
        const visited = new Set<string>([me.id])
        let cursor: Emp | undefined = me
        let guard = 0
        while (cursor && guard < 20) {
            guard++
            const override = cursor.leave_approver_id ?? null
            const nextId = override ?? cursor.manager_id
            if (!nextId || visited.has(nextId)) break
            visited.add(nextId)
            const next = byId.get(nextId)
            if (!next) break
            const nextLevel = next.approval_level ?? 0
            const arrivedViaOverride = Boolean(override)
            const isPresident = nextLevel >= 5
            const shouldPush =
                next.is_approver &&
                (next.approval_scopes ?? []).includes('leave') &&
                (!isPresident || arrivedViaOverride)
            if (shouldPush) {
                leaveOt.push({ ...next, is_override: arrivedViaOverride })
            }
            if (nextLevel >= 4) break
            cursor = next
        }
    }

    // ── Budget chain: walk manager_id, collect 'budget' approvers, include
    //     self if applicable, ensure ประธาน (L5) is at the end
    const budget: ApproverOut[] = []
    {
        if (me.is_approver && (me.approval_scopes ?? []).includes('budget')) {
            budget.push({ ...me })
        }
        const visited = new Set<string>([me.id])
        let cursor: Emp | undefined = me
        let guard = 0
        while (cursor && guard < 20) {
            guard++
            const nextId = cursor.manager_id
            if (!nextId || visited.has(nextId)) break
            visited.add(nextId)
            const next = byId.get(nextId)
            if (!next) break
            if (next.is_approver && (next.approval_scopes ?? []).includes('budget')) {
                budget.push({ ...next })
            }
            cursor = next
        }
        // Ensure ประธาน is there (safety net when a chain doesn't end at L5)
        const president = rows.find(
            r => (r.approval_level ?? 0) === 5 && r.is_approver && (r.approval_scopes ?? []).includes('budget'),
        )
        if (president && !budget.some(b => b.id === president.id)) {
            budget.push({ ...president })
        }
    }

    // ── Fixed HR approver list ─────────────────────────────────────────────
    const hrApprovers = rows.filter(
        r => r.is_approver && (r.approval_scopes ?? []).includes('hr'),
    )

    // ── All approvers (for L3+/admin "see everything" block) ───────────────
    const allApprovers = rows
        .filter(r => r.is_approver)
        .sort((a, b) => (b.approval_level ?? 0) - (a.approval_level ?? 0))

    const viewerLevel = me.approval_level ?? 1
    const showExactAmount = permissions.can_view_approval_limits === true
    const showAllByDefault =
        viewerLevel >= 3 || permissions.can_view_all_employees === true

    return NextResponse.json({
        me: {
            id: me.id,
            nickname: me.nickname,
            approval_level: me.approval_level,
        },
        leaveOtApprovers: leaveOt,
        budgetApprovers: budget,
        hrApprovers,
        allApprovers,
        showExactAmount,
        showAllByDefault,
    })
}
