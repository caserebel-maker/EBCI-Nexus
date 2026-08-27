'use server'

import { revalidatePath } from 'next/cache'
import { getAuth, canManageSystem } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    })[char] ?? char)
}

async function requireSuperAdmin() {
    const auth = await getAuth()
    if (!auth || !canManageSystem(auth)) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
    return auth
}

async function revokeExistingSessions(userId: string, email: string) {
    const emailLower = email.trim().toLowerCase()
    const { data: byId, error: byIdError } = await supabaseAdmin
        .from('User')
        .select('id, session_version')
        .eq('id', userId)

    if (byIdError) {
        console.error('[password-request] session id lookup failed:', byIdError)
        return
    }

    const { data: byEmail, error: byEmailError } = await supabaseAdmin
        .from('User')
        .select('id, session_version')
        .ilike('username', emailLower)

    if (byEmailError) {
        console.error('[password-request] session email lookup failed:', byEmailError)
        return
    }

    const rowsById = new Map<string, { id: string; session_version: number | null }>()
    for (const row of [...(byId ?? []), ...(byEmail ?? [])]) {
        rowsById.set(String(row.id), {
            id: String(row.id),
            session_version: row.session_version == null ? null : Number(row.session_version),
        })
    }

    await Promise.all([...rowsById.values()].map(async (row) => {
        const currentVersion = Number(row.session_version ?? 1)
        const { error: updateError } = await supabaseAdmin
            .from('User')
            .update({ session_version: currentVersion + 1 })
            .eq('id', row.id)
        if (updateError) {
            console.error('[password-request] session revocation failed:', updateError)
        }
    }))
}

export async function approvePasswordRequest(id: string, note?: string) {
    const auth = await requireSuperAdmin()
    const { data: request, error } = await supabaseAdmin
        .from('password_change_requests')
        .update({
            status: 'processing',
            reviewed_by: auth.session.id,
            reviewed_at: new Date().toISOString(),
            review_note: note?.trim() || null,
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id,user_id,email,status')
        .maybeSingle()

    if (error || !request) return { error: 'ไม่พบคำขอ หรือคำขอนี้ถูกดำเนินการแล้ว' }

    const releaseRequest = async () => {
        await supabaseAdmin
            .from('password_change_requests')
            .update({
                status: 'pending',
                reviewed_by: null,
                reviewed_at: null,
                review_note: null,
            })
            .eq('id', id)
            .eq('status', 'processing')
    }

    const { data: user } = await supabaseAdmin
        .from('User')
        .select('name,username')
        .eq('id', request.user_id)
        .maybeSingle()
    const displayName = String(user?.name ?? request.email)
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://ebci-nexus.vercel.app').replace(/\/$/, '')
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: request.email,
        options: { redirectTo: `${appUrl}/reset-password` },
    })
    const resetLink = linkData?.properties?.action_link ?? ''
    if (linkError || !resetLink) {
        console.error('[password-request] generate recovery link failed:', linkError)
        await releaseRequest()
        return { error: 'สร้างลิงก์ตั้งรหัสผ่านไม่สำเร็จ' }
    }

    const safeName = escapeHtml(displayName)
    const safeLink = escapeHtml(resetLink)
    const emailResult = await sendEmail({
        to: request.email,
        subject: '[EBCI Nexus] คำขอเปลี่ยนรหัสผ่านได้รับการอนุมัติ',
        sender: 'system',
        text: `คำขอเปลี่ยนรหัสผ่านของคุณได้รับการอนุมัติ ตั้งรหัสผ่านใหม่ได้ที่ ${resetLink}`,
        html: `<p>เรียน <strong>${safeName}</strong></p><p>คำขอเปลี่ยนรหัสผ่านของคุณได้รับการอนุมัติแล้ว</p><p><a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#7a2d35;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">ตั้งรหัสผ่านใหม่</a></p><p style="color:#6b7280;font-size:13px">หากคุณไม่ได้เป็นผู้ส่งคำขอ กรุณาแจ้ง Super Admin ทันที</p>`,
        audit: {
            category: 'password_change_approved',
            entityType: 'password_change_request',
            entityId: id,
            template: 'approved_password_recovery',
            metadata: { requestedUserId: request.user_id, reviewedBy: auth.session.id },
        },
    })
    if (!emailResult.success) {
        await releaseRequest()
        return { error: 'อนุมัติไม่ได้ เนื่องจากส่งอีเมลไม่สำเร็จ' }
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
        .from('password_change_requests')
        .update({
            status: 'approved',
            recovery_sent_at: now,
        })
        .eq('id', id)
        .eq('status', 'processing')
    if (updateError) return { error: 'บันทึกผลอนุมัติไม่สำเร็จ' }

    await revokeExistingSessions(String(request.user_id), String(request.email))

    await createNotification({
        recipient_user_id: request.user_id,
        type: 'password_change_approved',
        title: 'อนุมัติคำขอเปลี่ยนรหัสผ่านแล้ว',
        body: 'ระบบส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณแล้ว',
        action_url: '/portal/settings',
        entity_type: 'password_change_request',
        entity_id: id,
        icon: 'KeyRound',
        color: 'green',
        sender_user_id: auth.session.id,
        sender_name: auth.session.name,
    })
    revalidatePath('/hradmin/settings/password-requests')
    return { success: true }
}

export async function rejectPasswordRequest(id: string, note?: string) {
    const auth = await requireSuperAdmin()
    const now = new Date().toISOString()
    const { data: request, error } = await supabaseAdmin
        .from('password_change_requests')
        .update({
            status: 'rejected',
            reviewed_by: auth.session.id,
            reviewed_at: now,
            review_note: note?.trim() || null,
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select('user_id')
        .maybeSingle()
    if (error || !request) return { error: 'ปฏิเสธคำขอไม่สำเร็จ หรือคำขอถูกดำเนินการแล้ว' }

    await createNotification({
        recipient_user_id: String(request.user_id),
        type: 'password_change_rejected',
        title: 'คำขอเปลี่ยนรหัสผ่านไม่ได้รับการอนุมัติ',
        body: note?.trim() || 'กรุณาติดต่อ Super Admin หากต้องการข้อมูลเพิ่มเติม',
        action_url: '/portal/settings',
        entity_type: 'password_change_request',
        entity_id: id,
        icon: 'XCircle',
        color: 'red',
        sender_user_id: auth.session.id,
        sender_name: auth.session.name,
    })
    revalidatePath('/hradmin/settings/password-requests')
    return { success: true }
}
