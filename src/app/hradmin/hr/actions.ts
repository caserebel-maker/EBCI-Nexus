'use server'

import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendEmail, buildAnnouncementEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"

export async function publishAnnouncement(formData: FormData) {
    const headline = formData.get('headline') as string
    const content  = formData.get('content')  as string
    const priority = formData.get('priority') as string
    const imageFile = formData.get('image')   as File | null

    if (!headline || !content || !priority) {
        return { error: 'Missing required fields' }
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
                publish_date: now,
                created_by: 'HR Admin',
                created_at: now,
                updated_at: now,
            })
            .select()
            .single()

        if (insertError) throw new Error('บันทึกประกาศไม่สำเร็จ: ' + insertError.message)
        console.log('Announcement created:', announcement.id)

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
                    const result = await sendEmail({ to: emails, subject, html })
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
        console.log('--- END publishAnnouncement SUCCESS ---')
        return { success: true }

    } catch (error: any) {
        console.error('publishAnnouncement error:', error)
        return { error: error.message || 'เกิดข้อผิดพลาด' }
    }
}
