'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

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

    return { success: true }
}

export async function deleteEmployee(employeeId: string) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'Unauthorized' }
    }

    // Get user_id before deleting the row
    const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .single()

    // Delete employee row
    const { error: delError } = await supabaseAdmin
        .from('employees')
        .delete()
        .eq('id', employeeId)

    if (delError) {
        console.error('deleteEmployee error:', delError)
        return { error: delError.message }
    }

    // Delete Supabase Auth user if linked (non-fatal)
    if (emp?.user_id) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(emp.user_id)
        if (authError) {
            console.error('[deleteEmployee] auth.admin.deleteUser failed:', authError.message)
        }
    }

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

    const ext = file.name.split('.').pop()
    const fileName = `${employeeId}-${Date.now()}.${ext}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('employee-assets')
        .upload(fileName, file, { upsert: true })

    if (uploadError) {
        console.error('uploadEmployeePhoto error:', uploadError)
        return { error: uploadError.message }
    }

    const { error: dbError } = await supabaseAdmin
        .from('employees')
        .update({ photo_path: uploadData.path })
        .eq('id', employeeId)

    if (dbError) return { error: dbError.message }

    return { success: true, path: uploadData.path }
}
