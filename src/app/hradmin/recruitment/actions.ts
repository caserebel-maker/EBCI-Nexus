'use server'

import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

export async function onboardCandidate(applicantId: string, prevState: any, formData?: FormData) {
    if (!applicantId) {
        return { error: 'Invalid Applicant ID' }
    }

    try {
        // 1. Fetch Applicant from Supabase
        const { data: applicant, error: fetchError } = await supabase
            .from('applicants')
            .select('*')
            .eq('id', applicantId)
            .single()

        if (fetchError || !applicant) {
            return { error: 'Applicant not found on Cloud: ' + (fetchError?.message || '') }
        }

        // 2. Check if already onboarded (Strict check)
        const { data: existingEmployee, error: checkError } = await supabaseAdmin
            .from('employees')
            .select('id, employee_code')
            .eq('applicant_id', applicantId)
            .maybeSingle()

        if (existingEmployee) {
            return { error: `Applicant is already onboarded as ${existingEmployee.employee_code}` }
        }

        // 3. Generate Employee Code (EMP-XXX)
        // Note: Simple logic to find the max current ID and increment
        const { data: lastEmployees, error: lastError } = await supabaseAdmin
            .from('employees')
            .select('employee_code')
            .order('employee_code', { ascending: false })
            .limit(1)

        let nextId = 1
        if (lastEmployees && lastEmployees.length > 0) {
            const lastCode = lastEmployees[0].employee_code
            const parts = lastCode.split('-')
            if (parts.length === 2 && !isNaN(Number(parts[1]))) {
                nextId = Number(parts[1]) + 1
            }
        }

        const employeeCode = `EMP-${nextId.toString().padStart(3, '0')}`

        // 4. Create Employee Record in Supabase
        const { data: newEmployee, error: insertError } = await supabaseAdmin
            .from('employees')
            .insert({
                employee_code: employeeCode,
                first_name_th: applicant.first_name,
                last_name_th: applicant.last_name,
                first_name_en: applicant.first_name, // Mapping same for EN for now
                last_name_en: applicant.last_name,
                position: applicant.position_applied,
                department: "Unassigned", // Default
                start_date: applicant.start_date || new Date().toISOString(),
                employment_type: "full-time",
                status: "active",
                email: applicant.email,
                phone: applicant.phone,
                applicant_id: applicant.id,
                // photo_path: applicant.photo_path // We can add this if needed for profile
            })
            .select()
            .single()

        if (insertError) {
            throw new Error('Failed to create employee record: ' + insertError.message)
        }

        // 5. Update Applicant Status
        const { error: updateError } = await supabaseAdmin
            .from('applicants')
            .update({ status: 'hired' })
            .eq('id', applicantId)

        if (updateError) {
            console.warn("Applicant status update failed but employee was created:", updateError.message)
        }

        revalidatePath('/hradmin/recruitment')
        revalidatePath(`/hradmin/recruitment/${applicantId}`)
        revalidatePath('/hradmin/employees')

        return { success: true, employeeId: newEmployee.id }

    } catch (error: any) {
        console.error("Onboarding Error:", error)
        return { error: error.message || 'Failed to onboard candidate. Please try again.' }
    }
}
