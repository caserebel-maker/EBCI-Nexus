'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface UpdateEmployeePayload {
    first_name_th: string
    last_name_th: string
    nickname?: string
    position: string
    department: string
    phone: string
    email: string
    employment_type: string
    status: string
    start_date: string
    quit_date?: string
    quit_reason?: string
    approval_level?: number
    manager_id?: string | null
    // applicants table
    applicant_current_address: string
    applicant_phone: string  // emergency contact
}

export async function updateEmployee(employeeId: string, payload: UpdateEmployeePayload) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'Unauthorized' }
    }

    const { applicant_current_address, applicant_phone, ...employeeFields } = payload

    const { error: empError } = await supabaseAdmin
        .from('employees')
        .update({
            first_name_th: employeeFields.first_name_th,
            last_name_th: employeeFields.last_name_th,
            nickname: employeeFields.nickname ?? null,
            position: employeeFields.position,
            department: employeeFields.department,
            phone: employeeFields.phone,
            email: employeeFields.email,
            employment_type: employeeFields.employment_type,
            status: employeeFields.status,
            start_date: employeeFields.start_date,
            quit_date: employeeFields.quit_date || null,
            quit_reason: employeeFields.quit_reason || null,
            ...(employeeFields.approval_level !== undefined && { approval_level: employeeFields.approval_level }),
            manager_id: employeeFields.manager_id ?? null,
        })
        .eq('id', employeeId)

    if (empError) {
        console.error('updateEmployee error:', empError)
        return { error: empError.message }
    }

    // Update applicants table if address / phone changed
    const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('applicant_id')
        .eq('id', employeeId)
        .single()

    if (emp?.applicant_id) {
        await supabaseAdmin
            .from('applicants')
            .update({
                current_address: applicant_current_address,
                phone: applicant_phone,
            })
            .eq('id', emp.applicant_id)
    }

    // Revalidate by route pattern — URL can be either UUID or employee_code
    revalidatePath('/hradmin/employees/[id]', 'page')
    revalidatePath('/hradmin/employees')
    revalidatePath('/hradmin/organization')
    revalidatePath('/portal/organization')

    return { success: true }
}

export async function deleteEmployee(employeeId: string) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'Unauthorized' }
    }

    console.log('[deleteEmployee] START — employeeId:', employeeId)

    // ── 0. Fetch employee metadata before deleting ─────────────────────────────
    const { data: emp, error: fetchError } = await supabaseAdmin
        .from('employees')
        .select('user_id, photo_path, employee_code')
        .eq('id', employeeId)
        .maybeSingle()

    if (fetchError) {
        console.error('[deleteEmployee] step 0 fetch failed:', fetchError.message)
        return { error: fetchError.message }
    }
    if (!emp) {
        console.error('[deleteEmployee] step 0: employee not found for id:', employeeId)
        return { error: 'ไม่พบพนักงาน' }
    }
    console.log('[deleteEmployee] step 0 OK — employee_code:', emp.employee_code, 'user_id:', emp.user_id)

    // ── 1. Delete leave_approvals referencing this employee's leave_requests ───
    const { data: leaveReqs, error: lrFetchError } = await supabaseAdmin
        .from('leave_requests')
        .select('id')
        .eq('employee_id', employeeId)

    if (lrFetchError) {
        console.error('[deleteEmployee] step 1a fetch leave_requests failed:', lrFetchError.message)
    }

    if (leaveReqs && leaveReqs.length > 0) {
        const leaveReqIds = leaveReqs.map(r => r.id)
        console.log('[deleteEmployee] step 1a deleting leave_approvals for', leaveReqIds.length, 'leave_requests')
        const { error: approvalsError } = await supabaseAdmin
            .from('leave_approvals')
            .delete()
            .in('leave_request_id', leaveReqIds)
        if (approvalsError) {
            console.error('[deleteEmployee] step 1a leave_approvals delete failed:', approvalsError.message)
        } else {
            console.log('[deleteEmployee] step 1a leave_approvals deleted OK')
        }
    } else {
        console.log('[deleteEmployee] step 1a no leave_requests found, skipping leave_approvals')
    }

    // Also delete any rows where this employee is the approver
    const { error: approverError } = await supabaseAdmin
        .from('leave_approvals')
        .delete()
        .eq('approver_id', employeeId)
    if (approverError) {
        console.error('[deleteEmployee] step 1b approver leave_approvals delete failed:', approverError.message)
    } else {
        console.log('[deleteEmployee] step 1b approver leave_approvals deleted OK')
    }

    // ── 2. Delete leave_requests ───────────────────────────────────────────────
    const { error: lrError } = await supabaseAdmin
        .from('leave_requests')
        .delete()
        .eq('employee_id', employeeId)
    if (lrError) {
        console.error('[deleteEmployee] step 2 leave_requests delete failed:', lrError.message)
    } else {
        console.log('[deleteEmployee] step 2 leave_requests deleted OK')
    }

    // ── 3. Delete leave_balances ───────────────────────────────────────────────
    const { error: lbError } = await supabaseAdmin
        .from('leave_balances')
        .delete()
        .eq('employee_id', employeeId)
    if (lbError) {
        console.error('[deleteEmployee] step 3 leave_balances delete failed:', lbError.message)
    } else {
        console.log('[deleteEmployee] step 3 leave_balances deleted OK')
    }

    // ── 4. Delete Storage photos ───────────────────────────────────────────────
    const { data: storageFiles, error: storageListError } = await supabaseAdmin.storage
        .from('employee-photos')
        .list(`employees/${employeeId}`)

    if (storageListError) {
        console.error('[deleteEmployee] step 4 storage list failed:', storageListError.message)
    } else if (storageFiles && storageFiles.length > 0) {
        const paths = storageFiles.map(f => `employees/${employeeId}/${f.name}`)
        console.log('[deleteEmployee] step 4 removing storage files:', paths)
        const { error: storageError } = await supabaseAdmin.storage
            .from('employee-photos')
            .remove(paths)
        if (storageError) {
            console.error('[deleteEmployee] step 4 storage remove failed:', storageError.message)
        } else {
            console.log('[deleteEmployee] step 4 storage files removed OK')
        }
    } else {
        console.log('[deleteEmployee] step 4 no storage files found, skipping')
    }

    // ── 5. Delete employee row ─────────────────────────────────────────────────
    console.log('[deleteEmployee] step 5 deleting employee row id:', employeeId)
    const { error: delError } = await supabaseAdmin
        .from('employees')
        .delete()
        .eq('id', employeeId)

    if (delError) {
        console.error('[deleteEmployee] step 5 employees delete failed:', JSON.stringify(delError))
        return { error: delError.message }
    }
    console.log('[deleteEmployee] step 5 employee row deleted OK')

    // ── 6. Delete Supabase Auth user (non-fatal) ───────────────────────────────
    if (emp.user_id) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(emp.user_id)
        if (authError) {
            console.error('[deleteEmployee] step 6 auth.admin.deleteUser failed:', authError.message)
        } else {
            console.log('[deleteEmployee] step 6 auth user deleted OK')
        }
    } else {
        console.log('[deleteEmployee] step 6 no user_id linked, skipping auth delete')
    }

    console.log('[deleteEmployee] DONE — employee', employeeId, 'deleted successfully')
    return { success: true }
}

export async function uploadEmployeePhoto(employeeId: string, formData: FormData) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'Unauthorized' }
    }

    const file = formData.get('photo') as File | null
    if (!file || file.size === 0) return { error: 'No file provided' }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) return { error: 'ไฟล์ต้องเป็น JPG, PNG หรือ WebP' }
    if (file.size > 5 * 1024 * 1024) return { error: 'ขนาดไฟล์ต้องไม่เกิน 5 MB' }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filePath = `employees/${employeeId}/profile.${ext}`

    // Ensure bucket exists as public (no-op if already exists)
    await supabaseAdmin.storage.createBucket('employee-photos', { public: true }).catch(() => {})

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('employee-photos')
        .upload(filePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
        console.error('uploadEmployeePhoto error:', JSON.stringify(uploadError, null, 2))
        return { error: uploadError.message }
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
        .from('employee-photos')
        .getPublicUrl(uploadData.path)

    const { error: dbError } = await supabaseAdmin
        .from('employees')
        .update({ photo_path: uploadData.path, photo_url: publicUrl })
        .eq('id', employeeId)

    if (dbError) return { error: dbError.message }

    return { success: true, path: uploadData.path, url: publicUrl }
}
