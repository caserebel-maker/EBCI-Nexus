import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

// One row per active employee. The page renders this verbatim, so any
// derived field that the table needs has to land in here. Keep the shape
// stable; the client view imports it as a type.
export interface EmployeeRow {
    id: string
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    position: string | null
    department: string | null
    status: string
    manager_id: string | null
    reports_to_id: string | null
    leave_approver_id: string | null
    is_approver: boolean
    approval_department_scope: string[] | null
}

export type IssueCode =
    /** resolveLeaveApprover() returned null — nobody in the chain qualifies. Critical. */
    | 'NO_APPROVER'
    /** leave_approver_id points at someone whose is_approver = false. Override is stale. */
    | 'OVERRIDE_NOT_APPROVER'
    /** leave_approver_id points at a missing or inactive employee row. */
    | 'OVERRIDE_BROKEN'
    /** manager_id and reports_to_id both set but to different employees. The two
     *  fields existed historically for different reasons (manager_id is older,
     *  reports_to_id drives the leave chain). When they disagree the leave
     *  routing follows reports_to_id and the difference is usually a stale
     *  manager_id that nobody updated. */
    | 'MANAGER_REPORTS_MISMATCH'
    /** No manager_id, no reports_to_id, no leave_approver_id. Nothing to walk. */
    | 'NO_LINK_AT_ALL'
    /** Resolved approver is the employee themselves. */
    | 'SELF_APPROVAL'
    /** Resolved approver exists but their status != 'active'. */
    | 'INACTIVE_APPROVER'
    /** chain walked into a cycle before finding an approver. Cap is 10 hops. */
    | 'CYCLE'

export interface AuditRow {
    employee: EmployeeRow
    managerName: string | null
    reportsToName: string | null
    overrideName: string | null
    overrideIsApprover: boolean | null
    resolved: {
        id: string
        name: string
        department: string | null
        is_approver: boolean
    } | null
    resolvedVia: 'override' | 'chain' | null
    chainHops: number
    issues: IssueCode[]
}

const SELECT_COLUMNS = `
    id, employee_code, first_name_th, last_name_th, nickname,
    position, department, status,
    manager_id, reports_to_id, leave_approver_id,
    is_approver, approval_department_scope
`.replace(/\s+/g, ' ').trim()

function displayName(e: EmployeeRow | null | undefined): string | null {
    if (!e) return null
    const base = [e.first_name_th, e.last_name_th].filter(Boolean).join(' ').trim()
    return e.nickname ? `${base || 'ไม่ระบุ'} (${e.nickname})` : base || 'ไม่ระบุ'
}

/**
 * Mirror of `approverCanHandle()` in src/lib/leave-approval.ts but
 * operating on an in-memory map (no per-row DB call). Keep the logic
 * byte-for-byte identical so the audit reflects what the live route
 * does at submission time.
 */
function approverCanHandle(
    approver: EmployeeRow,
    applicantDepartment: string | null,
): boolean {
    if (!approver.is_approver) return false
    const scope = approver.approval_department_scope ?? []
    if (scope.length === 0) return false
    if (scope.includes('all')) return true
    if (applicantDepartment && scope.includes(applicantDepartment)) return true
    return false
}

interface ResolveResult {
    resolved: EmployeeRow | null
    via: 'override' | 'chain' | null
    hops: number
    cycle: boolean
}

function resolveChain(
    applicant: EmployeeRow,
    byId: Map<string, EmployeeRow>,
): ResolveResult {
    // 1) Explicit override — same rule as resolveLeaveApprover().
    //    Override only wins when target's is_approver = true; otherwise
    //    fall through to the chain walk so we don't silently mis-route.
    if (applicant.leave_approver_id) {
        const o = byId.get(applicant.leave_approver_id)
        if (o?.is_approver) {
            return { resolved: o, via: 'override', hops: 0, cycle: false }
        }
    }

    // 2) Walk reports_to_id, cycle-safe, 10 hops max.
    const visited = new Set<string>([applicant.id])
    let curId: string | null = applicant.reports_to_id ?? null
    let hops = 0
    while (curId && hops < 10) {
        if (visited.has(curId)) {
            return { resolved: null, via: null, hops, cycle: true }
        }
        visited.add(curId)
        const cand = byId.get(curId)
        if (!cand) return { resolved: null, via: null, hops, cycle: false }
        hops += 1
        if (approverCanHandle(cand, applicant.department)) {
            return { resolved: cand, via: 'chain', hops, cycle: false }
        }
        curId = cand.reports_to_id ?? null
    }

    return { resolved: null, via: null, hops, cycle: false }
}

/**
 * Build the audit dataset for the HR routing health page.
 *
 * Strategy: one fetch covering EVERY employee row (active + inactive).
 * Inactive rows are needed because we may walk into them as `reports_to`
 * and need to detect INACTIVE_APPROVER. We then map by id and resolve
 * the chain in memory — no N+1.
 */
export async function buildApprovalAudit(): Promise<AuditRow[]> {
    const { data, error } = await supabaseAdmin
        .from('employees')
        .select(SELECT_COLUMNS)
        .order('department', { ascending: true })
        .order('employee_code', { ascending: true })

    if (error || !data) {
        console.error('[approval-audit] fetch error:', error)
        return []
    }

    const all = data as unknown as EmployeeRow[]
    const byId = new Map<string, EmployeeRow>(all.map(e => [e.id, e]))
    const active = all.filter(e => e.status === 'active')

    return active.map((e) => {
        const issues: IssueCode[] = []
        const manager = e.manager_id ? byId.get(e.manager_id) : null
        const reportsTo = e.reports_to_id ? byId.get(e.reports_to_id) : null
        const override = e.leave_approver_id ? byId.get(e.leave_approver_id) : null

        // Override sanity ────────────────────────────────────────────
        if (e.leave_approver_id) {
            if (!override) {
                issues.push('OVERRIDE_BROKEN')
            } else if (!override.is_approver) {
                issues.push('OVERRIDE_NOT_APPROVER')
            } else if (override.status !== 'active') {
                issues.push('OVERRIDE_BROKEN')
            }
        }

        // manager_id vs reports_to_id consistency ────────────────────
        if (e.manager_id && e.reports_to_id && e.manager_id !== e.reports_to_id) {
            issues.push('MANAGER_REPORTS_MISMATCH')
        }

        // No link at all ──────────────────────────────────────────────
        if (!e.manager_id && !e.reports_to_id && !e.leave_approver_id) {
            issues.push('NO_LINK_AT_ALL')
        }

        // Resolve actual approver ────────────────────────────────────
        const { resolved, via, hops, cycle } = resolveChain(e, byId)
        if (cycle) issues.push('CYCLE')
        if (!resolved) {
            // Don't double-flag NO_APPROVER when we already flagged
            // NO_LINK_AT_ALL (same root cause, less noise).
            if (!issues.includes('NO_LINK_AT_ALL')) issues.push('NO_APPROVER')
        }
        if (resolved && resolved.id === e.id) issues.push('SELF_APPROVAL')
        if (resolved && resolved.status !== 'active') issues.push('INACTIVE_APPROVER')

        return {
            employee: e,
            managerName: displayName(manager) ?? null,
            reportsToName: displayName(reportsTo) ?? null,
            overrideName: displayName(override) ?? null,
            overrideIsApprover: override?.is_approver ?? null,
            resolved: resolved
                ? {
                    id: resolved.id,
                    name: displayName(resolved) ?? '',
                    department: resolved.department,
                    is_approver: resolved.is_approver,
                }
                : null,
            resolvedVia: via,
            chainHops: hops,
            issues,
        }
    })
}
