'use server'

import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"

export async function publishAnnouncement(formData: FormData) {
    const headline = formData.get('headline') as string
    const content = formData.get('content') as string
    const priority = formData.get('priority') as string
    const imageFile = formData.get('image') as File | null
    if (!headline || !content || !priority) {
        return { error: 'Missing required fields' }
    }

    console.log('--- START publishAnnouncement ---')
    console.log('Data:', { headline, priority })
    try {
        let imagePath = null
        // The new code uses 'image' instead of 'imageFile', so we need to adjust the variable name or the new code.
        // Assuming 'imageFile' is the correct variable from the original context.
        const image = imageFile; // Aligning with the new code's variable name
        if (image && image.size > 0) {
            console.log('Uploading image...')
            const fileExt = image.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('announcement-images')
                .upload(fileName, image)

            if (uploadError) {
                console.error('Upload error:', uploadError)
                throw new Error('Failed to upload image: ' + uploadError.message)
            }
            imagePath = uploadData?.path
            console.log('Image uploaded:', imagePath)
        }

        console.log('Inserting into DB...')
        const id = crypto.randomUUID()
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
                updated_at: now
            })
            .select()
            .single()

        if (insertError) {
            console.error('Insert error details:', JSON.stringify(insertError, null, 2))
            throw new Error('Failed to create announcement: ' + insertError.message)
        }

        console.log('Announcement created:', announcement.id)

        if (priority === 'emergency') {
            console.log('Starting email broadcast...')
            try {
                const { data: employees, error: fetchError } = await supabaseAdmin
                    .from('employees')
                    .select('email')
                    .eq('status', 'active') // Added back the 'status' filter from original code

                if (fetchError) {
                    console.error('Error fetching employees for broadcast:', fetchError)
                    // Original code warned and continued, new code returns. Sticking to new code's return.
                    return { success: true, warning: 'Announcement published but email broadcast failed.' }
                }

                if (employees && employees.length > 0) {
                    const emails = employees.map(e => e.email).filter(Boolean) as string[]
                    console.log(`Sending emails to ${emails.length} employees...`)
                    const result = await sendEmail({
                        to: emails,
                        subject: `[EMERGENCY] ${headline}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fbbf24; border-radius: 8px; overflow: hidden;">
                                <div style="background-color: #fbbf24; color: black; padding: 20px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">⚠️ EMERGENCY ALERT</h1>
                                </div>
                                <div style="padding: 30px; background-color: #fff;">
                                    <h2 style="margin-top: 0; color: #1f2937;">${headline}</h2>
                                    <p style="font-size: 16px; line-height: 1.5; color: #4b5563; white-space: pre-wrap;">${content}</p>

                                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

                                    <p style="font-size: 14px; color: #6b7280;">
                                        This is an automated emergency broadcast from EBCI Nexus HR System.<br/>
                                        Date: ${new Date().toLocaleString('th-TH')}
                                    </p>
                                </div>
                            </div>
                        `
                    })

                    console.log('Email broadcast result:', result.success)
                    if (result.success) {
                        await supabaseAdmin
                            .from('announcements')
                            .update({
                                email_sent: true,
                                email_sent_at: new Date().toISOString()
                            })
                            .eq('id', announcement.id)
                        console.log('DB updated with email status')
                    }
                }
            } catch (err) {
                console.error('Email broadcast failed with exception:', err)
            }
        }

        revalidatePath('/dashboard')
        console.log('--- END publishAnnouncement SUCCESS ---')
        return { success: true }

    } catch (error: any) {
        console.error("Publish Error:", error)
        return { error: error.message || 'Failed to publish announcement' }
    }
}
