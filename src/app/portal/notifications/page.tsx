import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { NotificationsClient } from './notifications-client'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    let announcements: {
        id: string
        headline: string
        content: string
        imagePath: string | null
        priority: string
        publishDate: string
    }[] = []

    let leaveRequests: {
        id: string
        leaveType: string
        startDate: string
        endDate: string
        totalDays: number
        reason: string
        status: string
        createdAt: string
        approvedAt: string | null
        rejectionReason: string | null
        approverName: string | null
    }[] = []

    try {
        const anns = await prisma.announcement.findMany({
            where: { publishStatus: 'published' },
            orderBy: { publishDate: 'desc' },
            take: 30,
        })
        announcements = anns.map(a => ({
            id: a.id,
            headline: a.headline,
            content: a.content,
            imagePath: a.imagePath ?? null,
            priority: a.priority,
            publishDate: a.publishDate.toISOString(),
        }))
    } catch (e) {
        console.error('[notifications] announcements query failed:', e)
    }

    try {
        const emp = await prisma.employee.findFirst({
            where: { userId: session.id },
        })

        if (emp) {
            const reqs = await prisma.leaveRequest.findMany({
                where: { employeeId: emp.id },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: { approver: { select: { name: true } } },
            })
            leaveRequests = reqs.map(r => ({
                id: r.id,
                leaveType: r.leaveType,
                startDate: r.startDate.toISOString(),
                endDate: r.endDate.toISOString(),
                totalDays: Number(r.totalDays),
                reason: r.reason,
                status: r.status,
                createdAt: r.createdAt.toISOString(),
                approvedAt: r.approvedAt?.toISOString() ?? null,
                rejectionReason: r.rejectionReason ?? null,
                approverName: r.approver?.name ?? null,
            }))
        }
    } catch (e) {
        console.error('[notifications] leaveRequests query failed:', e)
    }

    return (
        <NotificationsClient
            announcements={announcements}
            leaveRequests={leaveRequests}
        />
    )
}
