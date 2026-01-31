'use server'

import prisma from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"
import { writeFile } from "fs/promises"
import path from "path"

export async function publishAnnouncement(formData: FormData) {
    const headline = formData.get('headline') as string
    const content = formData.get('content') as string
    const priority = formData.get('priority') as string
    // In a real app, handle user ID from session. Assuming 'system' or passed ID for now.

    const imageFile = formData.get('image') as File | null
    let imagePath = null

    if (!headline || !content || !priority) {
        return { error: 'Missing required fields' }
    }

    try {
        // 0. Handle Image Upload
        if (imageFile && imageFile.size > 0) {
            const buffer = Buffer.from(await imageFile.arrayBuffer())
            const filename = `${Date.now()}-${imageFile.name.replace(/\s/g, '_')}`
            // We created 'public/uploads/announcements' via command previously
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'announcements')
            const fullPath = path.join(uploadDir, filename)

            await writeFile(fullPath, buffer)
            imagePath = `/uploads/announcements/${filename}`
        }

        // 1. Create Announcement
        const announcement = await prisma.announcement.create({
            data: {
                headline,
                content,
                priority,
                imagePath,
                publishStatus: 'published', // Direct publish for now
                publishDate: new Date(),
                createdBy: 'HR Admin' // Placeholder
            }
        })

        // 2. Emergency Broadcast Logic
        if (priority === 'emergency') {
            // Fetch all active employees with emails
            const employees = await prisma.employee.findMany({
                where: {
                    status: 'active', // Or any active status
                    email: { not: null } // Ensure email exists
                },
                select: { email: true }
            })

            const emails = employees.map(e => e.email).filter(Boolean) as string[]

            if (emails.length > 0) {
                // Construct Email Content
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">🚨 Emergency Alert</h1>
                        </div>
                        <div style="padding: 30px; background-color: #fff;">
                            <h2 style="margin-top: 0; color: #1f2937;">${headline}</h2>
                            <p style="font-size: 16px; line-height: 1.5; color: #4b5563; white-space: pre-wrap;">${content}</p>
                            
                            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                            
                            <p style="font-size: 14px; color: #6b7280;">
                                This is an automated emergency broadcast from EBCI Nexus HR System.<br/>
                                Date: ${new Date().toLocaleString('en-TH')}
                            </p>
                        </div>
                    </div>
                `

                // Send Broadcast
                const result = await sendEmail({
                    to: emails, // Function handles array as BCC
                    subject: `[URGENT] ${headline}`,
                    html: emailHtml
                })

                // Update DB logging
                if (result.success) {
                    await prisma.announcement.update({
                        where: { id: announcement.id },
                        data: {
                            emailSent: true,
                            emailSentAt: new Date()
                        }
                    })
                }
            }
        }

        revalidatePath('/dashboard')
        return { success: true }

    } catch (error) {
        console.error("Publish Error:", error)
        return { error: 'Failed to publish announcement' }
    }
}
