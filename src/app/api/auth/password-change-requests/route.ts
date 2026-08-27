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
        const submittedEmail = typeof body.email === 'string'
            ? body.email.trim().toLowerCase()
            : ''
        if (!submittedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedEmail)) {
            return NextResponse.json({ error: 'กรุณากรอกอีเมลให้ถูกต้อง' }, { status: 400 })
        }

        const { data: user } = await supabaseAdmin
            .from('User')
            .select('id, username, name')
            .ilike('username', submittedEmail)
            .maybeSingle()

        // Deliberately return the same response for unknown accounts.
        if (!user) return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
        userId = String(user.id)
        email = String(user.username ?? submittedEmail).trim().toLowerCase()
        displayName = String(user.name ?? submittedEmail)
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

    const { data: created, error: insertError } = await supabaseAdmin
        .from('password_change_requests')
        .insert({
            user_id: userId,
            email,
            source,
            requested_ip: requestIp(request),
            requested_user_agent: request.headers.get('user-agent'),
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

    const { data: superAdmins } = await supabaseAdmin
        .from('User')
        .select('id, username')
        .eq('can_manage_system', true)

    const actionUrl = '/hradmin/settings/password-requests'
    await Promise.all((superAdmins ?? []).map((admin) => createNotification({
        recipient_user_id: String(admin.id),
        type: 'password_change_requested',
        title: 'มีคำขอเปลี่ยนรหัสผ่าน',
        body: `${displayName} ส่งคำขอเปลี่ยนรหัสผ่าน`,
        action_url: actionUrl,
        action_label: 'ตรวจสอบคำขอ',
        entity_type: 'password_change_request',
        entity_id: String(created.id),
        icon: 'KeyRound',
        color: 'amber',
        sender_user_id: userId,
        sender_name: displayName,
        metadata: { source, email },
    })))

    const adminEmails = (superAdmins ?? [])
        .map((admin) => String(admin.username ?? '').trim())
        .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    if (adminEmails.length > 0) {
        const safeName = escapeHtml(displayName)
        const safeEmail = escapeHtml(email)
        await sendEmail({
            to: adminEmails,
            subject: `[EBCI Nexus] คำขอเปลี่ยนรหัสผ่านจาก ${displayName}`,
            sender: 'system',
            text: `${displayName} (${email}) ส่งคำขอเปลี่ยนรหัสผ่าน กรุณาเข้า Nexus เพื่อตรวจสอบ: ${actionUrl}`,
            html: `<p><strong>${safeName}</strong> (${safeEmail}) ส่งคำขอเปลี่ยนรหัสผ่าน</p><p>กรุณาเข้า EBCI Nexus เมนูตั้งค่าระบบ เพื่อตรวจสอบและอนุมัติคำขอ</p>`,
            audit: {
                category: 'password_change_requested',
                entityType: 'password_change_request',
                entityId: String(created.id),
                metadata: { source, requestedUserId: userId },
            },
        })
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE })
}
