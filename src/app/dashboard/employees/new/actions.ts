'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface CreateEmployeePayload {
    employee_code: string
    first_name_th: string
    last_name_th: string
    nickname?: string
    title: string
    date_of_birth: string
    position: string
    department: string
    employment_type: string
    start_date: string
    status: string
    email: string
    phone: string
    address: string
    emergency_name: string
    emergency_phone: string
}

export async function createEmployee(payload: CreateEmployeePayload) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'Unauthorized' }
    }

    // Check duplicate employee_code
    const { data: existing } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('employee_code', payload.employee_code)
        .maybeSingle()

    if (existing) {
        return { error: `รหัสพนักงาน "${payload.employee_code}" มีอยู่แล้ว` }
    }

    // Create a minimal applicant record to store address + emergency contact
    let applicantId: string | null = null
    if (payload.address || payload.emergency_phone) {
        const { data: app, error: appError } = await supabaseAdmin
            .from('applicants')
            .insert({
                first_name: payload.first_name_th,
                last_name: payload.last_name_th,
                email: payload.email || `${payload.employee_code}@internal`,
                phone: payload.emergency_phone || null,
                current_address: payload.address || null,
                status: 'hired',
            })
            .select('id')
            .single()

        if (!appError && app) {
            applicantId = app.id
        }
    }

    const { data: emp, error } = await supabaseAdmin
        .from('employees')
        .insert({
            employee_code: payload.employee_code,
            first_name_th: payload.first_name_th,
            last_name_th: payload.last_name_th,
            nickname: payload.nickname || null,
            title: payload.title || null,
            date_of_birth: payload.date_of_birth || null,
            position: payload.position,
            department: payload.department,
            employment_type: payload.employment_type || 'full-time',
            start_date: payload.start_date,
            status: payload.status || 'active',
            email: payload.email || null,
            phone: payload.phone || null,
            applicant_id: applicantId,
        })
        .select('id')
        .single()

    if (error) {
        console.error('createEmployee error:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/employees')
    return { success: true, id: emp.id }
}
