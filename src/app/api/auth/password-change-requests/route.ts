import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth } from '@/lib/route-auth'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'

const GENERIC_MESSAGE = 'ระบบได้รับคำขอเรียบร้อยแล้ว อยู่ระหว่างการตรวจสอบความปลอดภัยของบัญชีโดยระบบอัตโนมัติ (ใช้เวลาประมาณ 1–2 ชั่วโมง) หากข้อมูลถูกต้อง ระบบจะจัดส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลที่ลงทะเบียนไว้'

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    })[char] ?? char)
}

function requestIp(request: Request): string | null {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? null
}

export async function POST(request: Request) {
    let body: { email?: unknown; source?: unknown }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 })
    }

    const source = body.source === 'in_app' ? 'in_app' : 'forgot_password'
    let userId: string | null = null
    let email: string | null = null
    let displayName = 'ผู้ใช้งาน'

    if (source === 'in_app') {
        const auth = await getAuth()
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        userId = auth.session.id
        email = auth.session.email?.trim().toLowerCase() ?? null
        displayName = auth.session.name

        if (!email) {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(auth.session.id)
            email = authUser?.user?.email?.trim().toLowerCase() ?? null
        }
        if (!email) {
            const { data: user } = await supabaseAdmin
                .from('User')
                .select('username')
                .eq('id', auth.session.id)
                .maybeSingle()
            email = typeof user?.username === 'string'
                ? user.username.trim().toLowerCase()
                : null
        }
    } else {
        const rawInput = typeof body.email === 'string' ? body.email.trim() : ''
        if (!rawInput) {
            return NextResponse.json({ error: 'กรุณากรอกรหัสพนักงานหรืออีเมล' }, { status: 400 })
        }

        let userRecord: { id: string; username: string | null; name: string | null; role: string | null; can_manage_system: boolean | null } | null = null

        if (rawInput.includes('@')) {
            const submittedEmail = rawInput.toLowerCase()
            const { data: user } = await supabaseAdmin
                .from('User')
                .select('id, username, name, role, can_manage_system')
                .ilike('username', submittedEmail)
                .maybeSingle()
            userRecord = user
        } else {
            // Employee code lookup
            const inputNormalized = rawInput.replace(/[\s-]/g, '').toLowerCase()
            const { data: empList } = await supabaseAdmin
                .from('employees')
                .select('user_id, email, employee_code, first_name_th, last_name_th')
                .not('employee_code', 'is', null)

            const matchedEmp = (empList ?? []).find(r => {
                const code = (r.employee_code as string | null) ?? ''
                return code.replace(/[\s-]/g, '').toLowerCase() === inputNormalized
            })

            if (matchedEmp?.user_id) {
                const { data: user } = await supabaseAdmin
                    .from('User')
                    .select('id, username, name, role, can_manage_system')
                    .eq('id', matchedEmp.user_id)
                    .maybeSingle()
                userRecord = user
            } else if (matchedEmp?.email) {
                const { data: user } = await supabaseAdmin
                    .from('User')
                    .select('id, username, name, role, can_manage_system')
                    .ilike('username', matchedEmp.email)
                    .maybeSingle()
                userRecord = user
            }
        }

        // Deliberately return generic response for unknown accounts to prevent enumeration
        if (!userRecord) return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
        userId = String(userRecord.id)
        email = String(userRecord.username ?? rawInput).trim().toLowerCase()
        displayName = String(userRecord.name ?? rawInput)
    }

    if (!userId || !email) {
        return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
    }

    const { data: existing } = await supabaseAdmin
        .from('password_change_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle()

    if (existing) return NextResponse.json({ success: true, message: GENERIC_MESSAGE })

    const reqIp = requestIp(request)
    const reqUa = request.headers.get('user-agent')

    const { data: created, error: insertError } = await supabaseAdmin
        .from('password_change_requests')
        .insert({
            user_id: userId,
            email,
            source,
            requested_ip: reqIp,
            requested_user_agent: reqUa,
        })
        .select('id')
        .single()

    if (insertError) {
        // A simultaneous duplicate request can hit the partial unique index.
        if (insertError.code === '23505') {
            return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
        }
        console.error('[password-change-request] insert failed:', insertError)
        return NextResponse.json({ error: 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 })
    }

    // Check if the target user is an Admin or Key Executive (Mod, Jim, Sayan, HR Admin, Super Admin)
    const { data: targetEmp } = await supabaseAdmin
        .from('employees')
        .select('employee_code, position, department, nickname')
        .or(`user_id.eq.${userId},email.ilike.${email}`)
        .maybeSingle()

    const { data: targetUser } = await supabaseAdmin
        .from('User')
        .select('role, can_manage_system')
        .eq('id', userId)
        .maybeSingle()

    const isHighPriorityAccount = Boolean(
        targetUser?.can_manage_system ||
        targetUser?.role === 'hr_admin' ||
        ['506-69', '457-63', '001-29'].includes(targetEmp?.employee_code ?? '')
    )

    const empCodeStr = targetEmp?.employee_code ? ` [${targetEmp.employee_code}]` : ''
    const positionStr = targetEmp?.position ? ` (${targetEmp.position})` : ''
    const nicknameStr = targetEmp?.nickname ? ` (${targetEmp.nickname})` : ''

    const notifTitle = isHighPriorityAccount
        ? `🚨 [ความปลอดภัยสูง] มีคำขอเปลี่ยนรหัสผ่าน: ${displayName}${nicknameStr}`
        : 'มีคำขอเปลี่ยนรหัสผ่าน'

    const notifBody = isHighPriorityAccount
        ? `มีผู้พยายามขอเปลี่ยนรหัสผ่านของบัญชีผู้บริหาร/แอดมิน: ${displayName}${empCodeStr}${positionStr} — โปรดตรวจสอบทันที!`
        : `${displayName}${empCodeStr} ส่งคำขอเปลี่ยนรหัสผ่าน`

    const { data: superAdmins } = await supabaseAdmin
        .from('User')
        .select('id, username')
        .eq('can_manage_system', true)

    const actionUrl = '/hradmin/settings/password-requests'
    await Promise.all((superAdmins ?? []).map((admin) => createNotification({
        recipient_user_id: String(admin.id),
        type: 'password_change_requested',
        title: notifTitle,
        body: notifBody,
        action_url: actionUrl,
        action_label: 'ตรวจสอบคำขอ',
        entity_type: 'password_change_request',
        entity_id: String(created.id),
        icon: 'KeyRound',
        color: isHighPriorityAccount ? 'rose' : 'amber',
        sender_user_id: userId,
        sender_name: displayName,
        metadata: { source, email, isHighPriorityAccount, ip: reqIp },
    })))

    const adminEmails = (superAdmins ?? [])
        .map((admin) => String(admin.username ?? '').trim())
        .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))

    if (adminEmails.length > 0) {
        const safeName = escapeHtml(displayName)
        const safeEmail = escapeHtml(email)
        const safeIp = escapeHtml(reqIp ?? 'ไม่ระบุ')
        const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })

        const emailSubject = isHighPriorityAccount
            ? `🚨 [ความปลอดภัยสูง] แจ้งเตือน: มีผู้พยายามขอเปลี่ยนรหัสผ่านของ ${displayName}${nicknameStr}${positionStr}`
            : `[EBCI Nexus] คำขอเปลี่ยนรหัสผ่านจาก ${displayName}`

        const htmlContent = isHighPriorityAccount
            ? `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <h2 style="color: #b91c1c; margin-top: 0; font-size: 18px;">🚨 มีผู้พยายามขอเปลี่ยนรหัสผ่านบัญชีผู้บริหาร / แอดมิน</h2>
                    <p style="margin: 0; font-weight: 600; color: #991b1b;">
                        บัญชีเป้าหมาย: <strong>${safeName}</strong>${escapeHtml(empCodeStr)}${escapeHtml(positionStr)} (${safeEmail})
                    </p>
                </div>
                <p>ระบบตรวจพบการยื่นคำขอเปลี่ยนรหัสผ่าน โดยมีรายละเอียดดังนี้:</p>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr><td style="padding: 6px 0; color: #64748b; width: 120px;">เวลาที่ร้องขอ:</td><td style="padding: 6px 0; font-weight: bold;">${nowStr} น.</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">IP Address:</td><td style="padding: 6px 0; font-weight: bold;">${safeIp}</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">ช่องทาง:</td><td style="padding: 6px 0;">${source === 'forgot_password' ? 'หน้าลืมรหัสผ่าน (Forgot Password)' : 'ตั้งค่าในระบบ (Portal Settings)'}</td></tr>
                </table>
                <p style="color: #b91c1c; font-weight: bold;">⚠️ เพื่อความปลอดภัย: หากท่านหรือเจ้าของบัญชีไม่ได้เป็นผู้กดขอด้วยตนเอง โปรดกด "ปฏิเสธคำขอ" ในระบบ</p>
                <p><a href="https://ebci-nexus.vercel.app${actionUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">เปิดตรวจสอบและจัดการคำขอ →</a></p>
               </div>`
            : `<p><strong>${safeName}</strong> (${safeEmail}) ส่งคำขอเปลี่ยนรหัสผ่าน</p><p>IP Address: ${safeIp} | เวลา: ${nowStr} น.</p><p>กรุณาเข้า EBCI Nexus เมนูตั้งค่าระบบ เพื่อตรวจสอบและอนุมัติคำขอ</p>`;

        await sendEmail({
            to: adminEmails,
            subject: emailSubject,
            sender: 'system',
            text: `${notifTitle}\n${displayName} (${email}) ส่งคำขอเปลี่ยนรหัสผ่าน (IP: ${safeIp}, เวลา: ${nowStr})\nกรุณาเข้า Nexus เพื่อตรวจสอบ: ${actionUrl}`,
            html: htmlContent,
            audit: {
                category: 'password_change_requested',
                entityType: 'password_change_request',
                entityId: String(created.id),
                metadata: { source, requestedUserId: userId, isHighPriorityAccount, ip: reqIp },
            },
        })
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
}
