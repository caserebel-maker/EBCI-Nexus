'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { revalidatePath } from 'next/cache'

export interface UpdateEmployeePayload {
    employee_code: string
    first_name_th: string
    last_name_th: string
    first_name_en?: string | null
    last_name_en?: string | null
    nickname?: string
    position: string
    department: string
    secondary_department?: string | null
    phone: string
    email: string
    employment_type: string
    status: string
    start_date: string
    probation_end_date?: string | null
    date_of_birth?: string | null
    gender?: string | null
    quit_date?: string
    quit_reason?: string
    approval_level?: number
    manager_id?: string | null
    leave_approver_id?: string | null
    // Emergency contact (stored directly on employees, not applicants)
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
    emergency_contact_relation?: string | null
    emergency_contact_address?: string | null
    // Home location — HR-captured, used for map preview + future analytics.
    home_latitude?: number | null
    home_longitude?: number | null
    home_location_label?: string | null
    home_location_note?: string | null
    // applicants table
    applicant_current_address: string
    applicant_phone: string  // legacy emergency contact (kept for backward compat)
}

export async function updateEmployee(employeeId: string, payload: UpdateEmployeePayload) {
    const auth = await getAuth()
    if (!auth || !isHrStaff(auth)) {
        return { error: 'Unauthorized' }
    }

    const { applicant_current_address, applicant_phone, ...employeeFields } = payload

    // Snapshot the employee row BEFORE the update so the audit can record
    // a real before/after diff. Single round-trip: pulls every column we
    // might touch in this action so the audit insert later doesn't need
    // a second fetch. user_id is included so the email-sync logic below
    // knows whether to push the new email into Supabase Auth too.
    const { data: before } = await supabaseAdmin
        .from('employees')
        .select('employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, position, department, secondary_department, phone, email, employment_type, status, start_date, probation_end_date, date_of_birth, gender, quit_date, quit_reason, approval_level, manager_id, leave_approver_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, emergency_contact_address, home_latitude, home_longitude, home_location_label, home_location_note, user_id')
        .eq('id', employeeId)
        .maybeSingle()

    // ── Email sync — keep auth.users.email in lock-step ─────────────────
    // employees.email is what HR sees + edits; auth.users.email is what
    // Supabase uses for login + password recovery. Without this, an HR
    // admin "changing the email" only updates the display field, leaves
    // login pinned to the old address, and orphans the user when the old
    // mailbox goes away. Run this BEFORE the employees.update so a
    // partial failure leaves auth untouched (login still works) instead
    // of leaving auth diverged from a saved employees row.
    const newEmail = (employeeFields.email ?? '').trim().toLowerCase()
    const oldEmail = ((before?.email as string | null) ?? '').trim().toLowerCase()
    const emailChanged = !!newEmail && newEmail !== oldEmail
    if (emailChanged && before?.user_id) {
        const userId = before.user_id as string
        // email_confirm: true so the new address is treated as already
        // verified — Mod is the source of truth here, the user shouldn't
        // get a confirmation email asking them to verify their own change.
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { email: newEmail, email_confirm: true },
        )
        if (authErr) {
            console.error('[updateEmployee] auth email sync failed:', authErr)
            return {
                error: `เปลี่ยน email ไม่สำเร็จ: ${authErr.message} — ข้อมูลพนักงานยังไม่ถูกบันทึก`,
            }
        }
    }

    // Pre-flight duplicate check on employee_code if it changed.
    // employee_code is display-only (not an FK target — `employees.id` is)
    // so editing it is safe, but uniqueness is still enforced for sanity.
    const newCode = (employeeFields.employee_code ?? '').trim()
    if (newCode) {
        if (before?.employee_code !== newCode) {
            const { data: clash } = await supabaseAdmin
                .from('employees')
                .select('id')
                .eq('employee_code', newCode)
                .neq('id', employeeId)
                .maybeSingle()
            if (clash?.id) {
                return { error: `รหัสพนักงาน "${newCode}" ใช้งานอยู่กับคนอื่นแล้ว` }
            }
        }
    }

    // Stamp home_location_updated_at iff any of the four location
    // fields actually changed in this payload — no point bumping the
    // timestamp when HR is editing unrelated fields.
    const locationTouched =
        'home_latitude' in employeeFields ||
        'home_longitude' in employeeFields ||
        'home_location_label' in employeeFields ||
        'home_location_note' in employeeFields

    const { error: empError } = await supabaseAdmin
        .from('employees')
        .update({
            ...(newCode ? { employee_code: newCode } : {}),
            first_name_th: employeeFields.first_name_th,
            last_name_th: employeeFields.last_name_th,
            first_name_en: employeeFields.first_name_en ?? null,
            last_name_en: employeeFields.last_name_en ?? null,
            nickname: employeeFields.nickname ?? null,
            position: employeeFields.position,
            department: employeeFields.department,
            secondary_department: employeeFields.secondary_department ?? null,
            phone: employeeFields.phone,
            email: employeeFields.email,
            employment_type: employeeFields.employment_type,
            status: employeeFields.status,
            start_date: employeeFields.start_date,
            probation_end_date: employeeFields.probation_end_date || null,
            date_of_birth: employeeFields.date_of_birth || null,
            gender: employeeFields.gender ?? null,
            quit_date: employeeFields.quit_date || null,
            quit_reason: employeeFields.quit_reason || null,
            ...(employeeFields.approval_level !== undefined && { approval_level: employeeFields.approval_level }),
            manager_id: employeeFields.manager_id ?? null,
            leave_approver_id: employeeFields.leave_approver_id ?? null,
            emergency_contact_name:     employeeFields.emergency_contact_name     ?? null,
            emergency_contact_phone:    employeeFields.emergency_contact_phone    ?? null,
            emergency_contact_relation: employeeFields.emergency_contact_relation ?? null,
            emergency_contact_address:  employeeFields.emergency_contact_address  ?? null,
            // Location — coerce to null when blank so the CHECK constraint
            // doesn't fire on empty-string values.
            home_latitude:  employeeFields.home_latitude  ?? null,
            home_longitude: employeeFields.home_longitude ?? null,
            home_location_label: employeeFields.home_location_label ?? null,
            home_location_note:  employeeFields.home_location_note  ?? null,
            ...(locationTouched && { home_location_updated_at: new Date().toISOString() }),
        })
        .eq('id', employeeId)

    if (empError) {
        console.error('updateEmployee error:', empError)
        return { error: empError.message }
    }

    // Leave approver assignment is the source of truth. When HR chooses
    // "ผู้อนุมัติการลา" for an employee, make that target a valid leave
    // approver automatically so HR doesn't have to open the approver's
    // profile and toggle a second setting.
    if (employeeFields.leave_approver_id) {
        try {
            const approverId = employeeFields.leave_approver_id
            const approver = await supabaseAdmin
                .from('employees')
                .select('approval_scopes, approval_department_scope')
                .eq('id', approverId)
                .maybeSingle()
            const existingScopes = Array.isArray(approver.data?.approval_scopes)
                ? approver.data.approval_scopes as string[]
                : []
            const existingDeptScope = Array.isArray(approver.data?.approval_department_scope)
                ? approver.data.approval_department_scope as string[]
                : []
            const nextScopes = Array.from(new Set([...existingScopes, 'leave']))
            const nextDeptScope = existingDeptScope.includes('all')
                ? existingDeptScope
                : Array.from(new Set([
                    ...existingDeptScope,
                    employeeFields.department || 'all',
                ]))

            await supabaseAdmin
                .from('employees')
                .update({
                    is_approver: true,
                    approval_scopes: nextScopes,
                    approval_department_scope: nextDeptScope,
                })
                .eq('id', approverId)
        } catch (err) {
            console.error('[updateEmployee] auto-promote leave approver failed:', err)
        }
    }

    // Audit log — best-effort. We compute a per-field diff between the
    // before snapshot and the payload, then write ONE row containing the
    // map of changes. Empty diff = silent (no audit row for "save with
    // no actual change"). The User UPDATE has already landed; an audit
    // failure here is recoverable.
    try {
        if (before) {
            const beforeRecord = before as Record<string, unknown>
            const afterRecord = employeeFields as unknown as Record<string, unknown>
            const oldDiff: Record<string, unknown> = {}
            const newDiff: Record<string, unknown> = {}
            for (const k of Object.keys(beforeRecord)) {
                // Skip keys not present in payload — caller didn't intend to touch them.
                if (!(k in afterRecord) && k !== 'employee_code') continue
                const oldVal = beforeRecord[k] ?? null
                let newVal: unknown
                if (k === 'employee_code') newVal = newCode || beforeRecord.employee_code
                else newVal = afterRecord[k] ?? null
                // Treat empty string and null as equivalent — many fields
                // arrive as '' from form blanks.
                const oldNorm = oldVal === '' ? null : oldVal
                const newNorm = newVal === '' ? null : newVal
                if (String(oldNorm) !== String(newNorm)) {
                    oldDiff[k] = oldVal
                    newDiff[k] = newVal
                }
            }
            if (Object.keys(newDiff).length > 0) {
                await supabaseAdmin
                    .from('employee_audit_log')
                    .insert({
                        actor_user_id:      auth.session.id,
                        target_employee_id: employeeId,
                        action:             'update_employee',
                        old_value:          oldDiff,
                        new_value:          newDiff,
                    })
            }
        }
    } catch (err) {
        console.error('[employees/update] audit insert failed:', err)
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
    const auth = await getAuth()
    if (!auth || !isHrStaff(auth)) {
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
    const auth = await getAuth()
    if (!auth || !isHrStaff(auth)) {
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
