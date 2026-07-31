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
    {
        applicantCode: '491-67', // ตี๋ ชยุต
        delegateApproverCodes: ['457-63'], // จิม ฐานวัฒน์
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
    // 1. Fetch dynamic supervisor_id (backup/delegate approver) from database
    const { data: emp, error } = await supabaseAdmin
        .from('employees')
        .select('supervisor_id')
        .eq('id', applicantEmployeeId)
        .maybeSingle()
    
    const delegateIds: string[] = []

    if (!error && emp?.supervisor_id) {
        // Verify if supervisor is active and is an approver
        const { data: supervisor } = await supabaseAdmin
            .from('employees')
            .select('id')
            .eq('id', emp.supervisor_id)
            .eq('status', 'active')
            .eq('is_approver', true)
            .maybeSingle()
        if (supervisor) {
            delegateIds.push(supervisor.id)
        }
    }

    // 2. Fetch static/legacy delegate rules
    const applicant = await fetchEmployeeById(applicantEmployeeId)
    if (applicant?.employee_code) {
        const rule = DELEGATE_RULES.find(r => r.applicantCode === applicant.employee_code)
        if (rule) {
            const staticIds = await fetchActiveApproverIdsByCodes(rule.delegateApproverCodes)
            staticIds.forEach(id => delegateIds.push(id))
        }
    }

    // Deduplicate
    return Array.from(new Set(delegateIds))
}

export async function getDelegateApplicantIdsForApprover(
    approverEmployeeId: string,
): Promise<string[]> {
    const ids: string[] = []

    // 1. Fetch dynamic delegate applicant IDs (employees where supervisor_id = this approver)
    const { data: emps } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('supervisor_id', approverEmployeeId)
        .eq('status', 'active')
    
    if (emps) {
        emps.forEach(row => ids.push(row.id as string))
    }

    // 2. Fetch static/legacy delegate rules
    const approver = await fetchEmployeeById(approverEmployeeId)
    if (approver?.employee_code) {
        const applicantCodes = DELEGATE_RULES
            .filter(r => (r.delegateApproverCodes as readonly string[]).includes(approver.employee_code))
            .map(r => r.applicantCode)
        if (applicantCodes.length > 0) {
            const { data: legacyEmps } = await supabaseAdmin
                .from('employees')
                .select('id')
                .in('employee_code', applicantCodes)
                .eq('status', 'active')
            if (legacyEmps) {
                legacyEmps.forEach(row => ids.push(row.id as string))
            }
        }
    }

    // Deduplicate
    return Array.from(new Set(ids))
}

export async function canActOnLeaveRequest(args: {
    approverEmployeeId: string
    applicantEmployeeId: string
    primaryApproverId: string | null
    isHr?: boolean
}): Promise<boolean> {
    if (args.isHr) return true
    if (args.primaryApproverId === args.approverEmployeeId) return true
    const delegateIds = await getDelegateApproverIdsForApplicant(args.applicantEmployeeId)
    return delegateIds.includes(args.approverEmployeeId)
}
