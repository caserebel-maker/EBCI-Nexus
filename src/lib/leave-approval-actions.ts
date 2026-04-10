'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { sendLeaveRequestNotification, sendLeaveDecisionNotification } from '@/lib/leave-email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApprovalStep {
    approver_id: string
    approver_role: 'supervisor' | 'manager' | 'hr' | 'md'
}

interface EmployeeRow {
    id: string
    first_name_th: string
    last_name_th: string
    email: string | null
    approval_level: number | null
    supervisor_id: string | null
    department: string | null
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function fetchEmployee(id: string): Promise<EmployeeRow | null> {
    const { data } = await supabaseAdmin
        .from('employees')
        .select('id, first_name_th, last_name_th, email, approval_level, supervisor_id, department')
        .eq('id', id)
        .single()
    return data ?? null
}

async function findFirstByLevel(level: number): Promise<EmployeeRow | null> {
    const { data } = await supabaseAdmin
        .from('employees')
        .select('id, first_name_th, last_name_th, email, approval_level, supervisor_id, department')
        .eq('approval_level', level)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
    return data ?? null
}

// ─── Approval chain builder ───────────────────────────────────────────────────
/**
 * Returns the ordered approval chain for an employee.
 * chain[0] = first approver (step 1), chain[1] = step 2, etc.
 *
 * Level 1 (พนักงาน):      supervisor → supervisor.supervisor → HR Admin
 * Level 2 (หัวหน้าแผนก):  supervisor → HR Admin
 * Level 3 (หัวหน้าฝ่าย):  MD → HR Admin
 * Level 4 (HR Admin):      MD
 * Level 5 (MD):            HR Admin
 */
async function buildApprovalChain(employee: EmployeeRow): Promise<ApprovalStep[]> {
    const chain: ApprovalStep[] = []
    const level = employee.approval_level ?? 1

    if (level === 1) {
        if (employee.supervisor_id) {
            const sup = await fetchEmployee(employee.supervisor_id)
            if (sup) {
                chain.push({ approver_id: sup.id, approver_role: 'supervisor' })
                if (sup.supervisor_id) {
                    const sup2 = await fetchEmployee(sup.supervisor_id)
                    if (sup2) chain.push({ approver_id: sup2.id, approver_role: 'manager' })
                }
            }
        }
        const hr = await findFirstByLevel(4)
        if (hr) chain.push({ approver_id: hr.id, approver_role: 'hr' })

    } else if (level === 2) {
        if (employee.supervisor_id) {
            const sup = await fetchEmployee(employee.supervisor_id)
            if (sup) chain.push({ approver_id: sup.id, approver_role: 'manager' })
        }
        const hr = await findFirstByLevel(4)
        if (hr) chain.push({ approver_id: hr.id, approver_role: 'hr' })

    } else if (level === 3) {
        const md = await findFirstByLevel(5)
        if (md) chain.push({ approver_id: md.id, approver_role: 'md' })
        const hr = await findFirstByLevel(4)
        if (hr) chain.push({ approver_id: hr.id, approver_role: 'hr' })

    } else if (level === 4) {
        const md = await findFirstByLevel(5)
        if (md) chain.push({ approver_id: md.id, approver_role: 'md' })

    } else if (level === 5) {
        const hr = await findFirstByLevel(4)
        if (hr) chain.push({ approver_id: hr.id, approver_role: 'hr' })
    }

    return chain
}

async function notifyApprover(
    approver: EmployeeRow,
    employee: EmployeeRow,
    lr: { leave_type: string; start_date: string; end_date: string; total_days: number; reason?: string | null }
) {
    if (!approver.email) return
    sendLeaveRequestNotification({
        managerEmail: approver.email,
        managerName: `${approver.first_name_th} ${approver.last_name_th}`,
        employeeName: `${employee.first_name_th} ${employee.last_name_th}`,
        leaveType: lr.leave_type,
        startDate: lr.start_date,
        endDate: lr.end_date,
        totalDays: lr.total_days,
        reason: lr.reason ?? '',
        approveUrl: `${APP_URL}/dashboard/leave/admin`,
    }).catch(console.error)
}

// ─── 1. submitLeaveRequest ────────────────────────────────────────────────────
export async function submitLeaveRequest(
    employeeId: string,
    leaveData: {
        leave_type: string
        start_date: string   // 'YYYY-MM-DD'
        end_date: string     // 'YYYY-MM-DD'
        total_days: number
        reason?: string
    }
): Promise<{ success: true; leaveRequestId: string } | { error: string }> {
    try {
        const employee = await fetchEmployee(employeeId)
        if (!employee) return { error: 'ไม่พบข้อมูลพนักงาน' }

        const chain = await buildApprovalChain(employee)
        const firstStep = chain[0] ?? null
        const now = new Date().toISOString()

        // Insert leave_request
        const { data: lr, error: lrErr } = await supabaseAdmin
            .from('leave_requests')
            .insert({
                employee_id: employeeId,
                leave_type: leaveData.leave_type,
                start_date: leaveData.start_date,
                end_date: leaveData.end_date,
                total_days: leaveData.total_days,
                reason: leaveData.reason ?? null,
                status: 'pending',
                current_step: 1,
                current_approver_id: firstStep?.approver_id ?? null,
                created_at: now,
                updated_at: now,
            })
            .select()
            .single()

        if (lrErr) throw new Error(lrErr.message)

        // Insert step-1 approval record + email approver
        if (firstStep) {
            await supabaseAdmin.from('leave_approvals').insert({
                leave_request_id: lr.id,
                approver_id: firstStep.approver_id,
                approver_role: firstStep.approver_role,
                status: 'pending',
                created_at: now,
            })

            const approver = await fetchEmployee(firstStep.approver_id)
            if (approver) await notifyApprover(approver, employee, lr)
        }

        return { success: true, leaveRequestId: lr.id }

    } catch (err: any) {
        console.error('submitLeaveRequest error:', err)
        return { error: err.message ?? 'เกิดข้อผิดพลาด' }
    }
}

// ─── 2. approveLeave ──────────────────────────────────────────────────────────
export async function approveLeave(
    leaveRequestId: string,
    approverId: string,
    comment?: string
): Promise<{ success: true; fullyApproved: boolean } | { error: string }> {
    try {
        // Fetch leave_request with employee
        const { data: lr, error: lrErr } = await supabaseAdmin
            .from('leave_requests')
            .select(`
                id, status, current_step, leave_type, start_date, end_date, total_days, reason,
                employee_id,
                employees!employee_id (id, first_name_th, last_name_th, email, approval_level, supervisor_id, department)
            `)
            .eq('id', leaveRequestId)
            .single()

        if (lrErr || !lr) return { error: 'ไม่พบใบลา' }
        if (lr.status !== 'pending') return { error: 'ใบลานี้ได้รับการพิจารณาแล้ว' }

        const now = new Date().toISOString()

        // Mark current approval step as approved
        const { error: stepErr } = await supabaseAdmin
            .from('leave_approvals')
            .update({ status: 'approved', comment: comment ?? null, acted_at: now })
            .eq('leave_request_id', leaveRequestId)
            .eq('approver_id', approverId)
            .eq('status', 'pending')

        if (stepErr) throw new Error(stepErr.message)

        const employee = lr.employees as unknown as EmployeeRow
        const chain = await buildApprovalChain(employee)

        // current_step is 1-indexed; chain is 0-indexed.
        // After approving step N, the next step is chain[N] (since chain[N-1] was just approved).
        const currentStep = lr.current_step ?? 1
        const nextStep = chain[currentStep] ?? null // chain[current_step] = next index

        if (nextStep) {
            // Advance to next approval step
            await supabaseAdmin.from('leave_approvals').insert({
                leave_request_id: leaveRequestId,
                approver_id: nextStep.approver_id,
                approver_role: nextStep.approver_role,
                status: 'pending',
                created_at: now,
            })

            await supabaseAdmin
                .from('leave_requests')
                .update({
                    current_step: currentStep + 1,
                    current_approver_id: nextStep.approver_id,
                    updated_at: now,
                })
                .eq('id', leaveRequestId)

            const nextApprover = await fetchEmployee(nextStep.approver_id)
            if (nextApprover) await notifyApprover(nextApprover, employee, lr)

            return { success: true, fullyApproved: false }

        } else {
            // All steps done — fully approved
            await supabaseAdmin
                .from('leave_requests')
                .update({ status: 'approved', current_approver_id: null, updated_at: now })
                .eq('id', leaveRequestId)

            if (employee.email) {
                const approverRow = await fetchEmployee(approverId)
                sendLeaveDecisionNotification({
                    employeeEmail: employee.email,
                    employeeName: `${employee.first_name_th} ${employee.last_name_th}`,
                    leaveType: lr.leave_type,
                    startDate: lr.start_date,
                    endDate: lr.end_date,
                    totalDays: lr.total_days,
                    status: 'approved',
                    approverName: approverRow
                        ? `${approverRow.first_name_th} ${approverRow.last_name_th}`
                        : 'ผู้อนุมัติ',
                }).catch(console.error)
            }

            return { success: true, fullyApproved: true }
        }

    } catch (err: any) {
        console.error('approveLeave error:', err)
        return { error: err.message ?? 'เกิดข้อผิดพลาด' }
    }
}

// ─── 3. rejectLeave ───────────────────────────────────────────────────────────
export async function rejectLeave(
    leaveRequestId: string,
    approverId: string,
    comment: string   // required — บังคับใส่เหตุผล
): Promise<{ success: true } | { error: string }> {
    if (!comment?.trim()) return { error: 'กรุณาระบุเหตุผลที่ปฏิเสธ (จำเป็น)' }

    try {
        const { data: lr, error: lrErr } = await supabaseAdmin
            .from('leave_requests')
            .select(`
                id, status, leave_type, start_date, end_date, total_days,
                employee_id,
                employees!employee_id (id, first_name_th, last_name_th, email)
            `)
            .eq('id', leaveRequestId)
            .single()

        if (lrErr || !lr) return { error: 'ไม่พบใบลา' }
        if (lr.status !== 'pending') return { error: 'ใบลานี้ได้รับการพิจารณาแล้ว' }

        const now = new Date().toISOString()
        const trimmedComment = comment.trim()

        // Mark approval step as rejected
        await supabaseAdmin
            .from('leave_approvals')
            .update({ status: 'rejected', comment: trimmedComment, acted_at: now })
            .eq('leave_request_id', leaveRequestId)
            .eq('approver_id', approverId)
            .eq('status', 'pending')

        // Mark leave_request as rejected
        await supabaseAdmin
            .from('leave_requests')
            .update({ status: 'rejected', current_approver_id: null, updated_at: now })
            .eq('id', leaveRequestId)

        // Notify employee
        const employee = lr.employees as unknown as Pick<EmployeeRow, 'id' | 'first_name_th' | 'last_name_th' | 'email'>
        if (employee?.email) {
            const approverRow = await fetchEmployee(approverId)
            sendLeaveDecisionNotification({
                employeeEmail: employee.email,
                employeeName: `${employee.first_name_th} ${employee.last_name_th}`,
                leaveType: lr.leave_type,
                startDate: lr.start_date,
                endDate: lr.end_date,
                totalDays: lr.total_days,
                status: 'rejected',
                rejectionReason: trimmedComment,
                approverName: approverRow
                    ? `${approverRow.first_name_th} ${approverRow.last_name_th}`
                    : 'ผู้อนุมัติ',
            }).catch(console.error)
        }

        return { success: true }

    } catch (err: any) {
        console.error('rejectLeave error:', err)
        return { error: err.message ?? 'เกิดข้อผิดพลาด' }
    }
}

// ─── Session-based convenience wrappers ───────────────────────────────────────
// These look up the caller's employee ID from session + Supabase auth, so
// client components don't need to know or pass an employeeId.

async function getMyEmployeeId(): Promise<string | null> {
    const session = await getSession()
    if (!session) return null
    if (session.employeeId) return session.employeeId

    // Look up employee by Supabase auth email
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(session.id)
    const email = authUser?.user?.email
    if (!email) return null

    const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('email', email)
        .eq('status', 'active')
        .maybeSingle()

    return emp?.id ?? null
}

export async function submitLeaveRequestAsCurrentUser(leaveData: {
    leave_type: string
    start_date: string
    end_date: string
    total_days: number
    reason?: string
}): Promise<{ success: true; leaveRequestId: string } | { error: string }> {
    const employeeId = await getMyEmployeeId()
    if (!employeeId) return { error: 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อ HR' }
    return submitLeaveRequest(employeeId, leaveData)
}

export async function approveLeaveAsCurrentUser(
    leaveRequestId: string,
    comment?: string
): Promise<{ success: true; fullyApproved: boolean } | { error: string }> {
    const approverId = await getMyEmployeeId()
    if (!approverId) return { error: 'ไม่พบข้อมูลผู้อนุมัติ' }
    return approveLeave(leaveRequestId, approverId, comment)
}

export async function rejectLeaveAsCurrentUser(
    leaveRequestId: string,
    comment: string
): Promise<{ success: true } | { error: string }> {
    const approverId = await getMyEmployeeId()
    if (!approverId) return { error: 'ไม่พบข้อมูลผู้อนุมัติ' }
    return rejectLeave(leaveRequestId, approverId, comment)
}
