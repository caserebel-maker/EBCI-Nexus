import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

type EmployeeLite = {
    id: string
    employee_code: string | null
    first_name_th?: string | null
    last_name_th?: string | null
    nickname?: string | null
}

const DELEGATE_RULES = [
    {
        applicantCode: '153-59', // มด
        delegateApproverCodes: ['457-63'], // จิม
    },
    {
        applicantCode: '036-44', // ปุ๊
        delegateApproverCodes: ['153-59'], // มด
    },
] as const

async function fetchEmployeeById(id: string): Promise<EmployeeLite | null> {
    const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname')
        .eq('id', id)
        .maybeSingle()
    if (error) {
        console.error('[leave-delegate-approvers] fetchEmployeeById error:', error)
        return null
    }
    return (data as EmployeeLite | null) ?? null
}

async function fetchActiveApproverIdsByCodes(codes: readonly string[]): Promise<string[]> {
    if (codes.length === 0) return []
    const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code')
        .in('employee_code', [...codes])
        .eq('status', 'active')
        .eq('is_approver', true)
    if (error) {
        console.error('[leave-delegate-approvers] fetchActiveApproverIdsByCodes error:', error)
        return []
    }
    return (data ?? []).map(row => row.id as string)
}

export async function getDelegateApproverIdsForApplicant(
    applicantEmployeeId: string,
): Promise<string[]> {
    const applicant = await fetchEmployeeById(applicantEmployeeId)
    const rule = DELEGATE_RULES.find(r => r.applicantCode === applicant?.employee_code)
    return rule ? fetchActiveApproverIdsByCodes(rule.delegateApproverCodes) : []
}

export async function getDelegateApplicantIdsForApprover(
    approverEmployeeId: string,
): Promise<string[]> {
    const approver = await fetchEmployeeById(approverEmployeeId)
    if (!approver?.employee_code) return []

    const applicantCodes = DELEGATE_RULES
        .filter(r => (r.delegateApproverCodes as readonly string[]).includes(approver.employee_code))
        .map(r => r.applicantCode)
    if (applicantCodes.length === 0) return []

    const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code')
        .in('employee_code', applicantCodes)
        .eq('status', 'active')
    if (error) {
        console.error('[leave-delegate-approvers] getDelegateApplicantIdsForApprover error:', error)
        return []
    }
    return (data ?? []).map(row => row.id as string)
}

export async function canActOnLeaveRequest(args: {
    approverEmployeeId: string
    applicantEmployeeId: string
    primaryApproverId: string | null
}): Promise<boolean> {
    if (args.primaryApproverId === args.approverEmployeeId) return true
    const delegateIds = await getDelegateApproverIdsForApplicant(args.applicantEmployeeId)
    return delegateIds.includes(args.approverEmployeeId)
}
