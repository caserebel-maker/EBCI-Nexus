import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface ApproverEmployee {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    email: string | null
    department: string | null
    position: string | null
    reports_to_id: string | null
    leave_approver_id: string | null
    is_approver: boolean | null
    approval_department_scope: string[] | null
    approval_level: number | null
    photo_url: string | null
}

const APPROVER_SELECT = `
    id, first_name_th, last_name_th, nickname, email, department, position,
    reports_to_id, leave_approver_id, is_approver, approval_department_scope,
    approval_level, photo_url
`.replace(/\s+/g, ' ').trim()

async function fetchEmployee(id: string): Promise<ApproverEmployee | null> {
    if (!id) return null
    const { data, error } = await supabaseAdmin
        .from('employees')
        .select(APPROVER_SELECT)
        .eq('id', id)
        .maybeSingle()
    if (error) {
        console.error('[leave-approval] fetchEmployee error:', error)
        return null
    }
    return (data as ApproverEmployee | null) ?? null
}

function approverCanHandle(
    approver: ApproverEmployee,
    applicantDepartment: string | null,
): boolean {
    if (!approver.is_approver) return false
    const deptScope = approver.approval_department_scope ?? []
    if (deptScope.length === 0) return false
    if (deptScope.includes('all')) return true
    if (applicantDepartment && deptScope.includes(applicantDepartment)) return true
    return false
}

export function displayApproverName(a: ApproverEmployee): string {
    const base = [a.first_name_th, a.last_name_th].filter(Boolean).join(' ').trim()
    return a.nickname ? `${base || 'ไม่ระบุชื่อ'} (${a.nickname})` : base || 'ไม่ระบุชื่อ'
}

/**
 * Resolve who should approve a leave request for an employee.
 *
 * Rules (per EBCI business spec):
 *   1. employees.leave_approver_id override wins unconditionally
 *      (e.g. จอย's leaves go to ดำ directly).
 *   2. Otherwise walk up employees.reports_to_id. The first link where
 *      is_approver = true AND approval_department_scope covers the
 *      applicant's department ('all' or literal match) is the answer.
 *   3. Chain ends when reports_to_id is null. Returns null if nobody
 *      in the chain qualifies — caller should treat that as "HR to fix".
 *
 * Cycle-safe: tracks visited ids and caps the walk at 10 hops.
 */
export async function resolveLeaveApprover(
    applicantEmployeeId: string,
): Promise<ApproverEmployee | null> {
    const applicant = await fetchEmployee(applicantEmployeeId)
    if (!applicant) return null

    // 1) Explicit override (e.g. จอย → ดำ)
    if (applicant.leave_approver_id) {
        const override = await fetchEmployee(applicant.leave_approver_id)
        // Still gate on is_approver to avoid silent mis-routing
        if (override?.is_approver) return override
        // Fall through to chain walk if override is stale/invalid
    }

    // 2) Walk reports_to_id chain
    const visited = new Set<string>([applicantEmployeeId])
    let currentId: string | null = applicant.reports_to_id ?? null
    let hops = 0
    while (currentId && hops < 10) {
        if (visited.has(currentId)) break
        visited.add(currentId)
        const candidate = await fetchEmployee(currentId)
        if (!candidate) break
        if (approverCanHandle(candidate, applicant.department)) return candidate
        currentId = candidate.reports_to_id ?? null
        hops += 1
    }

    return null
}

/**
 * True when `approverId` is a legitimate approver for
 * `applicantId`'s current request. Used by the approve/reject APIs
 * in Session 2 to gate the action. Accepts explicit overrides too.
 */
export async function canApproveLeaveFor(
    approverId: string,
    applicantId: string,
): Promise<boolean> {
    const resolved = await resolveLeaveApprover(applicantId)
    return !!resolved && resolved.id === approverId
}
