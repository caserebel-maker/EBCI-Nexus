'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'
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
    approval_level?: number
}

// ─── Welcome Email Template ────────────────────────────────────────────────────
function buildWelcomeEmail({ name, resetLink }: { name: string; resetLink: string }): string {
    return `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Sarabun',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#561e23 0%,#882136 60%,#ad5f6c 100%);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:0.12em;text-transform:uppercase;">EBCI NEXUS</p>
            <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:0.3em;text-transform:uppercase;">Human Resources</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#882136;">ยินดีต้อนรับสู่ EBCI Nexus 🎉</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">คุณได้รับการเพิ่มเข้าระบบโดยฝ่าย HR เรียบร้อยแล้ว</p>

            <p style="margin:0 0 6px;font-size:15px;color:#374151;">สวัสดี <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
              บัญชีผู้ใช้งานของคุณใน <strong>EBCI Nexus</strong> ถูกสร้างเรียบร้อยแล้ว<br/>
              กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านและเริ่มใช้งานระบบ
            </p>

            <!-- CTA Button -->
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetLink}"
                 style="display:inline-block;background:linear-gradient(135deg,#882136,#c0392b);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.05em;">
                ตั้งรหัสผ่านของฉัน →
              </a>
            </div>

            <!-- Notice -->
            <div style="background:#fef3f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#b91c1c;line-height:1.6;">
                ⚠️ ลิงก์นี้ใช้ได้ภายใน <strong>24 ชั่วโมง</strong> เท่านั้น<br/>
                หากลิงก์หมดอายุ กรุณาติดต่อฝ่าย HR เพื่อขอลิงก์ใหม่
              </p>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              หากคุณไม่ได้คาดหวังอีเมลฉบับนี้ กรุณาแจ้งฝ่าย HR ทันที<br/>
              อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ — กรุณาอย่าตอบกลับ
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#6b7280;">ส่งโดยฝ่าย HR — <strong>EBCI NEXUS</strong></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Main Action ───────────────────────────────────────────────────────────────
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

    // ── 1. INSERT employee ────────────────────────────────────────────────────
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
            approval_level: payload.approval_level ?? 1,
        })
        .select('id')
        .single()

    if (error) {
        console.error('createEmployee error:', error)
        return { error: error.message }
    }

    const fullName = `${payload.first_name_th} ${payload.last_name_th}`.trim()
    let emailSent = false

    // ── 2–4. Auth user + password email (only if email provided) ─────────────
    if (payload.email) {
        try {
            // 2. Create Supabase Auth user
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: payload.email,
                email_confirm: true,
                user_metadata: {
                    role: 'employee',
                    name: fullName,
                    employeeId: emp.id,
                },
            })

            let authUserId: string | null = null

            if (authError) {
                if (authError.message?.includes('already been registered')) {
                    // Email already in Auth — look up the existing user to continue the flow
                    console.log('[createEmployee] email already exists in auth, fetching existing user')
                    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
                    const existing = existingUsers?.users?.find(u => u.email === payload.email)
                    if (existing) authUserId = existing.id
                } else {
                    console.error('[createEmployee] auth.admin.createUser failed:', authError.message)
                }
            } else if (authData.user) {
                authUserId = authData.user.id
            }

            if (authUserId) {
                // 3. Generate password-reset link (recovery type, valid 24h)
                const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'recovery',
                    email: payload.email,
                })

                if (linkError) {
                    console.error('[createEmployee] generateLink failed:', linkError.message)
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const resetLink: string = (linkData as any)?.properties?.action_link ?? ''

                    if (resetLink) {
                        const resend = new Resend(process.env.RESEND_API_KEY)
                        const { data: emailData, error: emailError } = await resend.emails.send({
                            from: 'onboarding@resend.dev',
                            to: payload.email,
                            subject: 'ยินดีต้อนรับสู่ EBCI Nexus — ตั้งรหัสผ่านของคุณ',
                            html: buildWelcomeEmail({ name: fullName, resetLink }),
                        })
                        if (emailError) {
                            console.error('[createEmployee] Resend full error:', JSON.stringify(emailError, null, 2))
                        } else {
                            console.log('[createEmployee] email sent, id:', emailData?.id)
                            emailSent = true
                        }
                    }
                }

                // 4. Link auth user → employee record
                await supabaseAdmin
                    .from('employees')
                    .update({ user_id: authUserId })
                    .eq('id', emp.id)
            }
        } catch (err) {
            console.error('[createEmployee] auth/email step failed:', err)
            // Non-fatal: employee was created, just log the failure
        }
    }

    revalidatePath('/dashboard/employees')
    return { success: true, id: emp.id, emailSent }
}
