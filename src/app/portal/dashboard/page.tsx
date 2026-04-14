import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { PortalDashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

const DEFAULT_ENTITLEMENTS: Record<string, number> = {
    annual: 6,
    sick: 30,
    personal: 3,
    compensation: 0,
    maternity: 90,
    ordination: 15,
}

const ALL_LEAVE_TYPES = ['annual', 'sick', 'personal', 'compensation', 'maternity', 'ordination']

export default async function PortalDashboardPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    let employee: {
        firstNameTH: string
        lastNameTH: string
        position: string
        department: string
        startDate: string
        gender: string | null
        nickname: string | null
    } | null = null

    let announcement: { headline: string; content: string; imagePath: string | null } | null = null
    let leaveBalances: { leaveType: string; entitledDays: number; usedDays: number; remainingDays: number }[] = []

    try {
        const emp = await prisma.employee.findFirst({
            where: { userId: session.id },
            include: { applicant: { select: { gender: true, nickname: true } } },
        })

        if (emp) {
            employee = {
                firstNameTH: emp.firstNameTH ?? session.name,
                lastNameTH: emp.lastNameTH ?? '',
                position: emp.position ?? '',
                department: emp.department ?? '',
                startDate: emp.startDate?.toISOString() ?? new Date().toISOString(),
                gender: emp.applicant?.gender ?? null,
                nickname: emp.applicant?.nickname ?? null,
            }

            const year = new Date().getFullYear()
            const stored = await prisma.leaveBalance.findMany({
                where: { employeeId: emp.id, year },
            })

            leaveBalances = ALL_LEAVE_TYPES.map((leaveType) => {
                const found = stored.find((b) => b.leaveType === leaveType)
                const entitled = Number(found?.entitledDays ?? DEFAULT_ENTITLEMENTS[leaveType] ?? 0)
                const used = Number(found?.usedDays ?? 0)
                return { leaveType, entitledDays: entitled, usedDays: used, remainingDays: entitled - used }
            })
        }
    } catch (e) {
        console.error('[dashboard] employee/leave query failed:', e)
    }

    try {
        const ann = await prisma.announcement.findFirst({
            where: { publishStatus: 'published', NOT: { imagePath: null } },
            orderBy: { publishDate: 'desc' },
        })
        if (ann?.imagePath) {
            // imagePath may be a Supabase storage path (uuid.jpg) or a local path (/uploads/...)
            let resolvedPath = ann.imagePath
            if (!resolvedPath.startsWith('/') && !resolvedPath.startsWith('http')) {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
                resolvedPath = `${supabaseUrl}/storage/v1/object/public/announcement-images/${resolvedPath}`
            }
            announcement = {
                headline: ann.headline,
                content: ann.content,
                imagePath: resolvedPath,
            }
        }
    } catch (e) {
        console.error('[dashboard] announcement query failed:', e)
    }

    // Fallback: static featured banner when no DB announcement
    if (!announcement) {
        announcement = {
            headline: 'วันหยุดราชการประจำปี 2026',
            content: 'ประกาศวันหยุดราชการประจำปี 2026 สำหรับพนักงานทุกท่าน กรุณาวางแผนการลาพักร้อนล่วงหน้า',
            imagePath: '/uploads/ebciho1.jpg',
        }
    }

    return (
        <PortalDashboardClient
            sessionName={session.name}
            employee={employee}
            announcement={announcement}
            leaveBalances={leaveBalances}
        />
    )
}
