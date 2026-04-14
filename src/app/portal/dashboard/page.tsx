import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { PortalDashboardClient } from './dashboard-client'

const DEFAULT_ENTITLEMENTS: Record<string, number> = {
    annual: 6,
    sick: 30,
    personal: 3,
}

export default async function PortalDashboardPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const employee = await prisma.employee.findFirst({
        where: { userId: session.id },
    })

    const announcement = await prisma.announcement.findFirst({
        where: {
            publishStatus: 'published',
            imagePath: { not: null },
        },
        orderBy: { publishDate: 'desc' },
    })

    let leaveBalances: {
        leaveType: string
        entitledDays: number
        usedDays: number
        remainingDays: number
    }[] = []

    if (employee) {
        const year = new Date().getFullYear()
        const stored = await prisma.leaveBalance.findMany({
            where: { employeeId: employee.id, year },
        })

        leaveBalances = ['annual', 'sick', 'personal'].map((leaveType) => {
            const found = stored.find((b) => b.leaveType === leaveType)
            const entitled = found?.entitledDays ?? DEFAULT_ENTITLEMENTS[leaveType] ?? 0
            const used = found?.usedDays ?? 0
            return { leaveType, entitledDays: entitled, usedDays: used, remainingDays: entitled - used }
        })
    }

    return (
        <PortalDashboardClient
            sessionName={session.name}
            employee={
                employee
                    ? {
                          firstNameTH: employee.firstNameTH,
                          lastNameTH: employee.lastNameTH,
                          position: employee.position,
                          department: employee.department,
                          startDate: employee.startDate.toISOString(),
                      }
                    : null
            }
            announcement={
                announcement
                    ? {
                          headline: announcement.headline,
                          content: announcement.content,
                          imagePath: announcement.imagePath ?? null,
                      }
                    : null
            }
            leaveBalances={leaveBalances}
        />
    )
}
