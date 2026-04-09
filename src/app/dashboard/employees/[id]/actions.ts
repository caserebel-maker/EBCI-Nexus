'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

export interface UpdateEmployeePayload {
    first_name_th: string
    last_name_th: string
    position: string
    department: string
    phone: string
    email: string
    employment_type: string
    status: string
    start_date: string
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
            position: employeeFields.position,
            department: employeeFields.department,
            phone: employeeFields.phone,
            email: employeeFields.email,
            employment_type: employeeFields.employment_type,
            status: employeeFields.status,
            start_date: employeeFields.start_date,
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
