import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { PortalDashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

const DEFAULT_ENTITLEMENTS: Record<string, number> = {
    annual: 6,
    sick: 30,
    personal: 3,
}

export default async function PortalDashboardPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    let employee = null
    let announcement = null
    let leaveBalances: {
        leaveType: string
        entitledDays: number
        usedDays: number
        remainingDays: number
    }[] = []

    try {
        employee = await prisma.employee.findFirst({
            where: { userId: session.id },
        })
    } catch (e) {
        console.error('[dashboard] employee query failed:', e)
    }

    try {
        announcement = await prisma.announcement.findFirst({
            where: {
                publishStatus: 'published',
                NOT: { imagePath: null },
            },
            orderBy: { publishDate: 'desc' },
        })
    } catch (e) {
        console.error('[dashboard] announcement query failed:', e)
    }

    if (employee) {
        try {
            const year = new Date().getFullYear()
            const stored = await prisma.leaveBalance.findMany({
                where: { employeeId: employee.id, year },
            })

            leaveBalances = ['annual', 'sick', 'personal'].map((leaveType) => {
                const found = stored.find((b) => b.leaveType === leaveType)
                const entitled = Number(found?.entitledDays ?? DEFAULT_ENTITLEMENTS[leaveType] ?? 0)
                const used = Number(found?.usedDays ?? 0)
                return { leaveType, entitledDays: entitled, usedDays: used, remainingDays: entitled - used }
            })
        } catch (e) {
            console.error('[dashboard] leaveBalance query failed:', e)
        }
    }

    return (
        <PortalDashboardClient
            sessionName={session.name}
            employee={
                employee
                    ? {
                          firstNameTH: employee.firstNameTH ?? session.name,
                          lastNameTH: employee.lastNameTH ?? '',
                          position: employee.position ?? '',
                          department: employee.department ?? '',
                          startDate: employee.startDate?.toISOString() ?? new Date().toISOString(),
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
