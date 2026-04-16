import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
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

export interface AnnouncementItem {
    headline: string
    content: string
    imagePath: string | null
}

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
        avatarUrl: string | null
    } | null = null

    let announcements: AnnouncementItem[] = []
    let leaveBalances: { leaveType: string; entitledDays: number; usedDays: number; remainingDays: number }[] = []

    // ── Employee + leave ──────────────────────────────────────────────────────
    try {
        const emp = await prisma.employee.findFirst({
            where: { userId: session.id },
            include: { applicant: { select: { gender: true, nickname: true, photoPath: true } } },
        })

        if (emp) {
            // Prefer photo_url (public URL from employee-photos bucket)
            // Fallback: signed URL from applicant-assets (legacy)
            let avatarUrl: string | null = null
            const { data: empRow } = await supabaseAdmin
                .from('employees')
                .select('photo_url')
                .eq('id', emp.id)
                .single()
            avatarUrl = empRow?.photo_url ?? null

            if (!avatarUrl && emp.applicant?.photoPath) {
                try {
                    const { data } = await supabaseAdmin.storage
                        .from('applicant-assets')
                        .createSignedUrl(emp.applicant.photoPath, 3600)
                    avatarUrl = data?.signedUrl ?? null
                } catch { /* fail silently */ }
            }

            employee = {
                firstNameTH: emp.firstNameTH ?? session.name,
                lastNameTH: emp.lastNameTH ?? '',
                position: emp.position ?? '',
                department: emp.department ?? '',
                startDate: emp.startDate?.toISOString() ?? new Date().toISOString(),
                gender: emp.applicant?.gender ?? null,
                nickname: emp.applicant?.nickname ?? null,
                avatarUrl,
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

    // ── Announcements (up to 5 with image) ───────────────────────────────────
    try {
        const rows = await prisma.announcement.findMany({
            where: { publishStatus: 'published', NOT: { imagePath: null } },
            orderBy: { publishDate: 'desc' },
            take: 5,
            select: { headline: true, content: true, imagePath: true },
        })

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
        announcements = rows.map(ann => {
            let resolvedPath = ann.imagePath ?? null
            if (resolvedPath && !resolvedPath.startsWith('/') && !resolvedPath.startsWith('http')) {
                resolvedPath = `${supabaseUrl}/storage/v1/object/public/announcement-images/${resolvedPath}`
            }
            return { headline: ann.headline, content: ann.content, imagePath: resolvedPath }
        })
    } catch (e) {
        console.error('[dashboard] announcements query failed:', e)
    }

    // Fallback: static banner when no DB announcements
    if (announcements.length === 0) {
        announcements = [{
            headline: 'วันหยุดราชการประจำปี 2026',
            content: 'ประกาศวันหยุดราชการประจำปี 2026 สำหรับพนักงานทุกท่าน กรุณาวางแผนการลาพักร้อนล่วงหน้า',
            imagePath: '/uploads/ebciho1.jpg',
        }]
    }

    // ── Working days this year (Mon–Fri, Jan 1 → today) ──────────────────────
    const today = new Date()
    const yearStart = new Date(today.getFullYear(), 0, 1)
    let workingDays = 0
    const cur = new Date(yearStart)
    while (cur <= today) {
        const dow = cur.getDay()
        if (dow !== 0 && dow !== 6) workingDays++
        cur.setDate(cur.getDate() + 1)
    }

    // ── Attendance (no table yet — default 0) ─────────────────────────────────
    let lateCount = 0
    try {
        // Future: query attendance table when available
        // const rows = await prisma.attendance.findMany({ where: { employeeId, isLate: true, year } })
        // lateCount = rows.length
    } catch { /* no attendance table yet */ }

    return (
        <PortalDashboardClient
            sessionName={session.name}
            employee={employee}
            announcements={announcements}
            leaveBalances={leaveBalances}
            attendanceData={{ lateCount, workingDays }}
        />
    )
}
