import { DashboardShell } from '@/components/layout/shell'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { EmergencyBanner } from '@/components/emergency-banner'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session || session.role !== 'hr_admin') {
        // Redundant safety check (middleware covers this)
        redirect('/login')
    }

    const emergency = await prisma.announcement.findFirst({
        where: {
            priority: 'emergency',
            publishStatus: 'published'
        },
        orderBy: { publishDate: 'desc' }
    })

    return (
        <DashboardShell role="hr_admin" userName={session.name}>
            <EmergencyBanner headline={emergency?.headline || ""} content={emergency?.content || ""} />
            {children}
        </DashboardShell>
    )
}
