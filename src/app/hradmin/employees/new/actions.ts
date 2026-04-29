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
    /** 'male' | 'female' — drives gender-specific leave gating
     *  (ลาคลอด vs ลาบวช). Stored as text so future values can be
     *  added without schema change. */
    gender: string
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
    access_role?: 'employee' | 'manager' | 'hr_admin'
}

// ─── Welcome Email Template ────────────────────────────────────────────────────
// NOTE: No JavaScript event handlers (onerror, onclick etc.) — Gmail strips them
// and can corrupt HTML rendering. Use table layout for maximum email-client compat.
function buildWelcomeEmail({ name, resetLink }: { name: string; resetLink: string }): { html: string; text: string } {
    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ยินดีต้อนรับสู่ EBCI Nexus</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(180deg,#561e23 0%,#ad5f6c 100%);padding:36px 32px;text-align:center;">
            <img src="https://ebci-nexus.vercel.app/sidebar-logo.png" alt="EBCI NEXUS" width="60" height="60"
                 style="display:block;margin:0 auto;height:60px;width:auto;border:0;">
            <p style="margin:12px 0 0;font-size:11px;color:rgba(255,255,255,0.65);letter-spacing:4px;text-transform:uppercase;">HUMAN RESOURCES</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 36px;">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#561e23;">ยินดีต้อนรับสู่ EBCI Nexus</h2>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;">คุณได้รับการเพิ่มเข้าระบบโดยฝ่าย HR เรียบร้อยแล้ว</p>

            <p style="margin:0 0 8px;font-size:15px;color:#374151;">สวัสดี <strong>${name}</strong>,</p>
            <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.75;">
              บัญชีผู้ใช้งานของคุณใน <strong>EBCI Nexus</strong> ถูกสร้างเรียบร้อยแล้ว<br>
              กรุณากดปุ่มด้านล่างเพื่อ<strong>ตั้งรหัสผ่าน</strong>และเริ่มใช้งานระบบ
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr><td align="center">
                <a href="${resetLink}"
                   style="display:inline-block;background:#882136;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:10px;letter-spacing:0.5px;">
                  ตั้งรหัสผ่านของฉัน &#8594;
                </a>
              </td></tr>
            </table>

            <!-- Warning box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td style="background:#fff5f5;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;">
                <p style="margin:0;font-size:13px;color:#b91c1c;line-height:1.7;">
                  &#9888; ลิงก์นี้ใช้ได้ภายใน <strong>24 ชั่วโมง</strong> เท่านั้น<br>
                  หากลิงก์หมดอายุ กรุณาติดต่อฝ่าย HR เพื่อขอลิงก์ใหม่
                </p>
              </td></tr>
            </table>

            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">
              หากคุณไม่ได้คาดหวังอีเมลฉบับนี้ กรุณาแจ้งฝ่าย HR ทันที<br>
              อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ — กรุณาอย่าตอบกลับ
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#6b7280;">ส่งโดยฝ่าย HR &#8212; <strong>EBCI NEXUS</strong></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    const text = `ยินดีต้อนรับสู่ EBCI Nexus

สวัสดี ${name},

บัญชีผู้ใช้งานของคุณใน EBCI Nexus ถูกสร้างเรียบร้อยแล้ว
กรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านและเริ่มใช้งานระบบ:

${resetLink}

⚠ ลิงก์นี้ใช้ได้ภายใน 24 ชั่วโมงเท่านั้น
หากลิงก์หมดอายุ กรุณาติดต่อฝ่าย HR เพื่อขอลิงก์ใหม่

---
ส่งโดยฝ่าย HR — EBCI NEXUS
อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ — กรุณาอย่าตอบกลับ`

    return { html, text }
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
            gender: payload.gender || null,
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
                    role: payload.access_role ?? 'employee',
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
                // redirectTo tells Supabase where to send the user AFTER verifying the token.
                // Flow: email link → Supabase /auth/v1/verify → redirect to /reset-password#access_token=...
                const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://ebci-nexus.vercel.app').replace(/\/$/, '')
                const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'recovery',
                    email: payload.email,
                    options: {
                        redirectTo: `${appUrl}/reset-password`,
                    },
                })

                if (linkError) {
                    console.error('[createEmployee] generateLink failed:', linkError.message)
                } else {
                    // action_link is the real Supabase verify URL — do NOT replace the origin.
                    // Supabase must handle the verification; it then redirects to our /reset-password.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const resetLink: string = (linkData as any)?.properties?.action_link ?? ''

                    if (resetLink) {
                        const emailContent = buildWelcomeEmail({ name: fullName, resetLink })
                        console.log('[createEmployee] html length:', emailContent.html.length, '| text length:', emailContent.text.length)
                        const resend = new Resend(process.env.RESEND_API_KEY)
                        const { data: emailData, error: emailError } = await resend.emails.send({
                            from: 'EBCI Nexus <noreply@ebcinext.com>',
                            to: payload.email,
                            subject: 'ยินดีต้อนรับสู่ EBCI Nexus — ตั้งรหัสผ่านของคุณ',
                            html: emailContent.html,
                            text: emailContent.text,
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

    revalidatePath('/hradmin/employees')
    return { success: true, id: emp.id, emailSent }
}

// ─── Upload Photo for Newly Created Employee ───────────────────────────────────
export async function uploadNewEmployeePhoto(employeeId: string, formData: FormData) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') return { error: 'Unauthorized' }

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
        console.error('[uploadNewEmployeePhoto] storage error:', JSON.stringify(uploadError, null, 2))
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
