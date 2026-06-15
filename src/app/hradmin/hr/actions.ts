'use server'

import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendEmail, buildAnnouncementEmail } from "@/lib/email"
import { getSession } from "@/lib/auth"
import { createNotification, type NotificationColor } from "@/lib/notifications"
import { revalidatePath } from "next/cache"

// Priority → notification color/label used when fanning the announcement
// out through the in-app notification center. Emergency/urgent get hot
// palettes so they pop above routine updates in the bell.
function priorityToNotificationColor(priority: string): NotificationColor {
    switch (priority) {
        case 'emergency': return 'red'
        case 'urgent':    return 'amber'
        case 'promote':   return 'blue'
        default:          return 'blue'
    }
}

function priorityLabelTh(priority: string): string {
    switch (priority) {
        case 'emergency': return 'ฉุกเฉิน'
        case 'urgent':    return 'ด่วน'
        case 'promote':   return 'ประชาสัมพันธ์'
        default:          return 'ประกาศ'
    }
}

export async function publishAnnouncement(formData: FormData) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'ไม่มีสิทธิ์เข้าถึง — เฉพาะ HR Admin เท่านั้น' }
    }

    const headline = formData.get('headline') as string
    const content  = formData.get('content')  as string
    const priority = formData.get('priority') as string
    const imageFile = formData.get('image')   as File | null
    const expiresInput = formData.get('expires_at') as string | null

    if (!headline || !content || !priority) {
        return { error: 'Missing required fields' }
    }

    // Prefer employee id (natural join with employees.id); fall back to
    // auth user id. Legacy rows stored the literal "HR Admin" string.
    const createdBy = session.employeeId ?? session.id

    // Default: emergency/urgent → 7 days, others → null (no auto-expire)
    let expiresAt: string | null = null
    if (expiresInput) {
        expiresAt = new Date(expiresInput + 'T23:59:59').toISOString()
    } else if (priority === 'emergency' || priority === 'urgent') {
        const d = new Date()
        d.setDate(d.getDate() + 7)
        expiresAt = d.toISOString()
    }

    console.log('--- START publishAnnouncement ---', { headline, priority })

    try {
        // ── 1. Upload image (if provided) ─────────────────────────────────────
        let imagePath: string | null = null
        if (imageFile && imageFile.size > 0) {
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `${crypto.randomUUID()}.${fileExt}`
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('announcement-images')
                .upload(fileName, imageFile)

            if (uploadError) throw new Error('อัปโหลดรูปไม่สำเร็จ: ' + uploadError.message)
            imagePath = uploadData?.path ?? null
        }

        // ── 2. Insert announcement into DB ────────────────────────────────────
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        const { data: announcement, error: insertError } = await supabaseAdmin
            .from('announcements')
            .insert({
                id,
                headline,
                content,
                priority,
                image_path: imagePath,
                publishStatus: 'published',
                publish_status: 'published',
                publish_date: now,
                expires_at: expiresAt,
                created_by: createdBy,
                created_at: now,
                updated_at: now,
            })
            .select()
            .single()

        if (insertError) throw new Error('บันทึกประกาศไม่สำเร็จ: ' + insertError.message)
        console.log('Announcement created:', announcement.id)

        // ── 2b. In-app notification fan-out ───────────────────────────────────
        // Every active employee with a linked user_id gets a notification.
        // Best-effort — per-recipient failures never break the publish.
        try {
            const { data: recipients, error: recipientsError } = await supabaseAdmin
                .from('employees')
                .select('user_id, first_name_th, nickname')
                .eq('status', 'active')
                .not('user_id', 'is', null)

            if (recipientsError) {
                console.error('[publishAnnouncement] recipients fetch error:', recipientsError)
            } else if (recipients && recipients.length > 0) {
                const color = priorityToNotificationColor(priority)
                const badge = priorityLabelTh(priority)
                const truncatedBody = content.length > 160
                    ? content.slice(0, 157).trimEnd() + '…'
                    : content
                const notifTitle = priority === 'emergency' || priority === 'urgent'
                    ? `[${badge}] ${headline}`
                    : headline

                // Fan out in parallel; tolerate failures. createNotification
                // swallows errors internally and returns null.
                const jobs = recipients.map(r => createNotification({
                    recipient_user_id: r.user_id as string,
                    type: 'announcement',
                    title: notifTitle,
                    body: truncatedBody,
                    action_url: `/portal/announcements?focus=${announcement.id}`,
                    action_label: 'ดูประกาศ',
                    entity_type: 'announcement',
                    entity_id: announcement.id,
                    icon: 'Megaphone',
                    color,
                    sender_name: 'ฝ่ายบุคคล',
                }))
                const results = await Promise.allSettled(jobs)
                const ok = results.filter(r => r.status === 'fulfilled' && r.value).length
                console.log(`[publishAnnouncement] notifications sent: ${ok}/${recipients.length}`)
            }
        } catch (notifErr) {
            console.error('[publishAnnouncement] notification fan-out exception:', notifErr)
            // Swallow — announcement already persisted
        }

        // ── 3. Email broadcast for urgent / emergency ─────────────────────────
        if (priority === 'urgent' || priority === 'emergency') {
            console.log(`Starting email broadcast (${priority})...`)
            try {
                // Fetch all active employees' emails
                const { data: employees, error: fetchError } = await supabaseAdmin
                    .from('employees')
                    .select('email')
                    .eq('status', 'active')
                    .not('email', 'is', null)

                if (fetchError) {
                    console.error('Fetch employees error:', fetchError)
                    return { success: true, warning: 'ประกาศสำเร็จ แต่ส่งอีเมลไม่ได้' }
                }

                const emails = (employees ?? [])
                    .map(e => e.email as string)
                    .filter(Boolean)

                if (emails.length === 0) {
                    console.log('No active employee emails found.')
                } else {
                    // Resolve signed image URL for the email (1 hour)
                    let imageUrl: string | null = null
                    if (imagePath) {
                        const { data: signed } = await supabaseAdmin.storage
                            .from('announcement-images')
                            .createSignedUrl(imagePath, 3600)
                        imageUrl = signed?.signedUrl ?? null
                    }

                    const subject = priority === 'emergency'
                        ? `⚠️ ฉุกเฉิน: ${headline}`
                        : `🚨 ด่วน: ${headline}`

                    const html = buildAnnouncementEmail({
                        priority: priority as 'urgent' | 'emergency',
                        headline,
                        content,
                        imageUrl,
                    })

                    console.log(`Sending to ${emails.length} employees...`)
                    const result = await sendEmail({ to: emails, subject, html, sender: 'hr' })
                    console.log('Broadcast result:', result.success)

                    if (result.success) {
                        await supabaseAdmin
                            .from('announcements')
                            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
                            .eq('id', announcement.id)
                    }
                }
            } catch (emailErr) {
                console.error('Email broadcast exception:', emailErr)
                // Don't fail the whole action — announcement is already published
            }
        }

        revalidatePath('/dashboard')
        revalidatePath('/portal/notifications')
        console.log('--- END publishAnnouncement SUCCESS ---')
        return { success: true }

    } catch (error: any) {
        console.error('publishAnnouncement error:', error)
        return { error: error.message || 'เกิดข้อผิดพลาด' }
    }
}

export async function getAnnouncement(id: string) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'ไม่มีสิทธิ์เข้าถึง' }
    }
    const { data, error } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (error) return { error: error.message }
    return { success: true, announcement: data }
}

export async function updateAnnouncement(id: string, formData: FormData) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return { error: 'ไม่มีสิทธิ์เข้าถึง — เฉพาะ HR Admin เท่านั้น' }
    }

    const headline = formData.get('headline') as string
    const content  = formData.get('content')  as string
    const priority = formData.get('priority') as string
    const imageFile = formData.get('image')   as File | null
    const expiresInput = formData.get('expires_at') as string | null

    if (!id || !headline || !content || !priority) {
        return { error: 'Missing required fields' }
    }

    let expiresAt: string | null = null
    if (expiresInput) {
        expiresAt = new Date(expiresInput + 'T23:59:59').toISOString()
    } else if (priority === 'emergency' || priority === 'urgent') {
        const d = new Date()
        d.setDate(d.getDate() + 7)
        expiresAt = d.toISOString()
    }

    try {
        // Handle image upload if provided
        let imagePath: string | undefined = undefined
        if (imageFile && imageFile.size > 0) {
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `${crypto.randomUUID()}.${fileExt}`
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('announcement-images')
                .upload(fileName, imageFile)

            if (uploadError) throw new Error('อัปโหลดรูปไม่สำเร็จ: ' + uploadError.message)
            imagePath = uploadData?.path ?? undefined
        }

        const now = new Date().toISOString()
        const updateData: Record<string, any> = {
            headline,
            content,
            priority,
            expires_at: expiresAt,
            updated_at: now,
        }

        if (imagePath !== undefined) {
            updateData.image_path = imagePath
        }

        const { error: updateError } = await supabaseAdmin
            .from('announcements')
            .update(updateData)
            .eq('id', id)

        if (updateError) throw new Error('แก้ไขประกาศไม่สำเร็จ: ' + updateError.message)

        revalidatePath('/dashboard')
        revalidatePath('/portal/notifications')
        revalidatePath('/hradmin/announcements')
        revalidatePath('/portal/announcements')
        revalidatePath('/portal/dashboard')
        revalidatePath('/hradmin/dashboard')

        return { success: true }
    } catch (error: any) {
        console.error('updateAnnouncement error:', error)
        return { error: error.message || 'เกิดข้อผิดพลาด' }
    }
}

