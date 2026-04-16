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

// ── Helpers ───────────────────────────────────────────────────────────────────

type EmpRow = {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    position: string | null
    department: string | null
    start_date: string | null
    photo_url: string | null
    email: string | null
    applicant_id: string | null
}

const EMP_SELECT = 'id, first_name_th, last_name_th, nickname, position, department, start_date, photo_url, email, applicant_id'

async function findEmployee(userId: string): Promise<EmpRow | null> {
    // 1. Try user_id (fastest path once linked)
    const { data: byId } = await supabaseAdmin
        .from('employees')
        .select(EMP_SELECT)
        .eq('user_id', userId)
        .maybeSingle()

    if (byId) return byId as EmpRow

    // 2. Fallback: look up auth email → match by employee email
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
    const userEmail = authData?.user?.email
    if (!userEmail) return null

    const { data: byEmail } = await supabaseAdmin
        .from('employees')
        .select(EMP_SELECT)
        .eq('email', userEmail)
        .maybeSingle()

    if (!byEmail) return null

    // Auto-link user_id so next request uses the fast path
    await supabaseAdmin
        .from('employees')
        .update({ user_id: userId })
        .eq('id', (byEmail as EmpRow).id)

    return byEmail as EmpRow
}

// ─────────────────────────────────────────────────────────────────────────────

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
        const emp = await findEmployee(session.id)

        if (emp) {
            // Photo: prefer employees.photo_url, fallback to applicant signed URL
            let avatarUrl: string | null = emp.photo_url ?? null

            if (!avatarUrl && emp.applicant_id) {
                const { data: app } = await supabaseAdmin
                    .from('applicants')
                    .select('photo_path')
                    .eq('id', emp.applicant_id)
                    .maybeSingle()

                if (app?.photo_path) {
                    try {
                        const { data } = await supabaseAdmin.storage
                            .from('applicant-assets')
                            .createSignedUrl(app.photo_path, 3600)
                        avatarUrl = data?.signedUrl ?? null
                    } catch { /* fail silently */ }
                }
            }

            // Gender from applicants table
            let gender: string | null = null
            if (emp.applicant_id) {
                const { data: app } = await supabaseAdmin
                    .from('applicants')
                    .select('gender, nickname')
                    .eq('id', emp.applicant_id)
                    .maybeSingle()
                gender = app?.gender ?? null
                // Use applicant nickname only if employee-level nickname is empty
                if (!emp.nickname && app?.nickname) {
                    emp.nickname = app.nickname
                }
            }

            employee = {
                firstNameTH: emp.first_name_th ?? session.name,
                lastNameTH: emp.last_name_th ?? '',
                position: emp.position ?? '',
                department: emp.department ?? '',
                startDate: emp.start_date ?? new Date().toISOString(),
                gender,
                nickname: emp.nickname ?? null,
                avatarUrl,
            }

            // Leave balances (still using Prisma — table exists there)
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

    const lateCount = 0 // Future: query attendance table

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
