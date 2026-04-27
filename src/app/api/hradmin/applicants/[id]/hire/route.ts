import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hradmin/applicants/[id]/hire
 *
 * One-shot promotion of a job applicant into the employees table:
 *   1. Read the applicant row (must be in 'hired' or 'interview' state)
 *   2. Insert an employees row, mapping every field that has a 1:1
 *      counterpart (names, photo_url, contact, emergency_*, dob, etc.)
 *   3. Stamp employees.applicant_id so HR can trace the lineage later
 *   4. Move the applicant to 'hired' if it isn't already
 *
 * The leave_balances seeding is handled by trg_seed_leave_balances on
 * the employees table — we don't insert balances here, the trigger
 * does it for us based on leave_types.default_days_per_year.
 *
 * Body shape (only the fields HR actually has to type — the rest is
 * copied from the applicant):
 * {
 *   employee_code: string,         // required, must be unique
 *   department: string,            // required, from DEPARTMENTS list
 *   employment_type: string,       // required: 'fulltime'|'parttime'|...
 *   start_date: string,            // required, ISO date
 *   position?: string,             // optional override; default = position_applied
 *   probation_end_date?: string,   // optional ISO date
 *   manager_id?: string,           // optional FK to employees.id
 *   leave_approver_id?: string,    // optional FK to employees.id
 * }
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden — HR only' }, { status: 403 })
    }

    const { id: applicantId } = await context.params
    const body = await req.json().catch(() => ({}))

    // Required fields HR must provide
    const employeeCode = String(body.employee_code ?? '').trim()
    const department = String(body.department ?? '').trim()
    const employmentType = String(body.employment_type ?? '').trim()
    const startDate = String(body.start_date ?? '').trim()
    if (!employeeCode || !department || !employmentType || !startDate) {
        return NextResponse.json(
            { error: 'ต้องระบุ: รหัสพนักงาน, แผนก, ประเภทการจ้าง, วันที่เริ่มงาน' },
            { status: 400 },
        )
    }

    // Optional overrides
    const positionOverride = body.position ? String(body.position).trim() : null
    const probationEndDate = body.probation_end_date ? String(body.probation_end_date).trim() : null
    const managerId = body.manager_id ? String(body.manager_id).trim() : null
    const leaveApproverId = body.leave_approver_id ? String(body.leave_approver_id).trim() : null

    // 1) Read applicant — pull every field we'll copy into employees
    const { data: applicant, error: readErr } = await supabaseAdmin
        .from('job_applications')
        .select(`
            id, application_status, reference_code,
            title_th, first_name_th, last_name_th,
            first_name_en, last_name_en, nickname,
            email, phone_mobile,
            photo_url,
            date_of_birth,
            position_applied,
            emergency_contact_name, emergency_contact_phone,
            emergency_contact_relation, emergency_contact_address
        `)
        .eq('id', applicantId)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!applicant) return NextResponse.json({ error: 'ไม่พบใบสมัคร' }, { status: 404 })

    // Block hire only from the two states where it makes no sense:
    // 'draft' (applicant didn't submit) and 'rejected' (HR already
    // said no). Every other state is fair game — HR sometimes meets
    // candidates offline and wants to hire on the spot without
    // walking through every status step.
    const blockedStates = new Set(['draft', 'rejected'])
    if (blockedStates.has(String(applicant.application_status))) {
        return NextResponse.json({
            error: `ใบสมัครอยู่สถานะ "${applicant.application_status}" — ไม่สามารถจ้างได้`,
        }, { status: 400 })
    }

    // 2) Pre-flight unique checks before insert (better error UX than
    // catching a generic FK / unique violation after the fact).
    const { data: dupeCode } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code')
        .eq('employee_code', employeeCode)
        .maybeSingle()
    if (dupeCode) {
        return NextResponse.json(
            { error: `รหัสพนักงาน "${employeeCode}" ถูกใช้งานแล้ว` },
            { status: 409 },
        )
    }

    const { data: dupeApplicant } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code')
        .eq('applicant_id', applicantId)
        .maybeSingle()
    if (dupeApplicant) {
        return NextResponse.json({
            error: `ใบสมัครนี้ถูกจ้างแล้ว (พนักงาน ${dupeApplicant.employee_code})`,
        }, { status: 409 })
    }

    // 3) Insert employee — apologetic field map, but every line is
    // doing real work. Defaults that match what HR would tick by hand:
    //   status = 'active', approval_level = 1, is_approver = false.
    const fullNameTh = `${applicant.first_name_th ?? ''} ${applicant.last_name_th ?? ''}`.trim()
    const insertPayload = {
        employee_code: employeeCode,
        title: applicant.title_th ?? null,
        first_name_th: applicant.first_name_th ?? '',
        last_name_th: applicant.last_name_th ?? '',
        first_name_en: applicant.first_name_en ?? null,
        last_name_en: applicant.last_name_en ?? null,
        nickname: applicant.nickname ?? null,
        email: applicant.email ?? null,
        phone: applicant.phone_mobile ?? null,
        photo_url: applicant.photo_url ?? null,
        date_of_birth: applicant.date_of_birth ?? null,
        position: positionOverride ?? applicant.position_applied ?? '',
        department,
        employment_type: employmentType,
        start_date: startDate,
        probation_end_date: probationEndDate,
        status: 'active' as const,
        applicant_id: applicantId,
        manager_id: managerId,
        leave_approver_id: leaveApproverId,
        emergency_contact_name: applicant.emergency_contact_name ?? null,
        emergency_contact_phone: applicant.emergency_contact_phone ?? null,
        emergency_contact_relation: applicant.emergency_contact_relation ?? null,
        emergency_contact_address: applicant.emergency_contact_address ?? null,
    }

    if (!insertPayload.first_name_th || !insertPayload.last_name_th || !insertPayload.position) {
        return NextResponse.json({
            error: 'ใบสมัครไม่มีชื่อ-นามสกุลภาษาไทย หรือไม่มี position — กรุณากรอกให้ครบก่อนจ้าง',
        }, { status: 400 })
    }

    const { data: newEmp, error: insertErr } = await supabaseAdmin
        .from('employees')
        .insert(insertPayload)
        .select('id, employee_code, first_name_th, last_name_th, department, position, start_date')
        .single()
    if (insertErr || !newEmp) {
        console.error('[applicants/hire] insert error:', insertErr)
        return NextResponse.json(
            { error: insertErr?.message ?? 'สร้างพนักงานไม่สำเร็จ' },
            { status: 500 },
        )
    }

    // 4) Make sure the applicant row reflects 'hired' so the careers
    // queue stops surfacing it. We don't go through the state-machine
    // helper here — at this point the employee row is the source of
    // truth, so a direct update is fine.
    const nowIso = new Date().toISOString()
    if (applicant.application_status !== 'hired') {
        const { error: statusErr } = await supabaseAdmin
            .from('job_applications')
            .update({
                application_status: 'hired',
                reviewed_at: nowIso,
                reviewed_by: auth.session.employeeId ?? auth.session.id,
                updated_at: nowIso,
            })
            .eq('id', applicantId)
        if (statusErr) {
            // Non-fatal — employee is created, applicant tag-along can
            // be reconciled by HR. Log it loudly.
            console.error('[applicants/hire] failed to flip status to hired:', statusErr)
        }
    }

    return NextResponse.json({
        success: true,
        employee: newEmp,
        applicant_name: fullNameTh,
        leave_balances_seeded: true,  // trigger fired
    })
}
