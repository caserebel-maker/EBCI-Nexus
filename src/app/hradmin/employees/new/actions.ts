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
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ยินดีต้อนรับสู่ EBCI Nexus</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(180deg,#561e23 0%,#ad5f6c 100%);padding:36px 32px;text-align:center;">
      <img src="https://ebci-nexus.vercel.app/sidebar-logo.png" alt="EBCI NEXUS"
           style="display:block;margin:0 auto;height:60px;width:auto;object-fit:contain;"
           onerror="this.style.display='none';document.getElementById('logo-text').style.display='block'">
      <h1 id="logo-text" style="display:none;margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">EBCI NEXUS</h1>
    </div>

    <!-- Body -->
    <div style="padding:40px 36px;">
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#561e23;">ยินดีต้อนรับสู่ EBCI Nexus &#127881;</h2>
      <p style="margin:0 0 28px;font-size:14px;color:#6b7280;">คุณได้รับการเพิ่มเข้าระบบโดยฝ่าย HR เรียบร้อยแล้ว</p>

      <p style="margin:0 0 8px;font-size:15px;color:#374151;">สวัสดี <strong>${name}</strong>,</p>
      <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.75;">
        บัญชีผู้ใช้งานของคุณใน <strong>EBCI Nexus</strong> ถูกสร้างเรียบร้อยแล้ว<br>
        กรุณากดปุ่มด้านล่างเพื่อ<strong>ตั้งรหัสผ่าน</strong>และเริ่มใช้งานระบบ
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${resetLink}"
           style="display:inline-block;background:linear-gradient(135deg,#7a2d35,#c0392b);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:10px;letter-spacing:0.5px;">
          ตั้งรหัสผ่านของฉัน &rarr;
        </a>
      </div>

      <!-- Warning box -->
      <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0;font-size:13px;color:#b91c1c;line-height:1.7;">
          &#9888;&#65039; ลิงก์นี้ใช้ได้ภายใน <strong>24 ชั่วโมง</strong> เท่านั้น<br>
          หากลิงก์หมดอายุ กรุณาติดต่อฝ่าย HR เพื่อขอลิงก์ใหม่
        </p>
      </div>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">
        หากคุณไม่ได้คาดหวังอีเมลฉบับนี้ กรุณาแจ้งฝ่าย HR ทันที<br>
        อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ — กรุณาอย่าตอบกลับ
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6b7280;">ส่งโดยฝ่าย HR &mdash; <strong>EBCI NEXUS</strong></p>
    </div>

  </div>
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
                    const rawLink: string = (linkData as any)?.properties?.action_link ?? ''

                    // Supabase generateLink uses the project's "Site URL" setting which may
                    // point to localhost. Replace the origin with the real production URL.
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ebci-nexus.vercel.app'
                    const resetLink = rawLink
                        ? rawLink.replace(/^https?:\/\/[^/]+/, appUrl.replace(/\/$/, ''))
                        : ''

                    if (resetLink) {
                        const resend = new Resend(process.env.RESEND_API_KEY)
                        const { data: emailData, error: emailError } = await resend.emails.send({
                            from: 'EBCI Nexus <noreply@ebcinext.com>',
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
