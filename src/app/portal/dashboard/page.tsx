import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveCreators, displayCreator } from '@/lib/creators'
import { PortalDashboardClient } from './dashboard-client'
import { isWorkdaySaturday, getSaturdayIndex } from '@/lib/saturday-rules'
import {
    CORE_LEAVE_TYPES,
    canonicalCoreLeaveType,
    emptyCoreLeaveBalance,
    type DashboardLeaveBalance,
} from '@/lib/hr-leave-display'
import { computeRemaining, fetchBalancesForEmployee } from '@/lib/leave-balance'

export const dynamic = 'force-dynamic'

export interface AnnouncementItem {
    id: string
    headline: string
    content: string
    imagePath: string | null
    priority: string
    publishDate: string
    expiresAt: string | null
    creatorName: string | null
}

/** Today's row from the company calendar (`holidays` table), if any. The
 *  banner on the dashboard reads this to surface either a holiday or a
 *  company-wide WFH day so staff don't miss it. */
export interface TodayCalendarEntry {
    name: string
    type: string  // public · religious · company · wfh
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
    date_of_birth: string | null
    photo_url: string | null
    email: string | null
    applicant_id: string | null
}

const EMP_SELECT = 'id, first_name_th, last_name_th, nickname, position, department, start_date, date_of_birth, photo_url, email, applicant_id'

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
        dateOfBirth: string | null
        avatarUrl: string | null
    } | null = null

    let announcements: AnnouncementItem[] = []
    let leaveBalances: DashboardLeaveBalance[] = []

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
                dateOfBirth: emp.date_of_birth ?? null,
                avatarUrl,
            }

            // Leave balances: use the same Supabase source as the leave
            // module so pending requests are included in the remaining figure.
            const year = new Date().getFullYear()
            const stored = await fetchBalancesForEmployee(emp.id, year)
            const coreByType = new Map(CORE_LEAVE_TYPES.map(type => [type, emptyCoreLeaveBalance(type)]))
            const otherBalances: DashboardLeaveBalance[] = []

            for (const row of stored) {
                const canonicalType = canonicalCoreLeaveType(row.leave_type_id)
                const item: DashboardLeaveBalance = {
                    leaveType: canonicalType ?? row.leave_type_id,
                    entitledDays: Number(row.total_days ?? 0),
                    usedDays: Number(row.used_days ?? 0),
                    pendingDays: Number(row.pending_days ?? 0),
                    remainingDays: computeRemaining(row),
                }

                if (canonicalType) {
                    coreByType.set(canonicalType, item)
                } else {
                    otherBalances.push(item)
                }
            }

            leaveBalances = [
                ...CORE_LEAVE_TYPES.map(type => coreByType.get(type) ?? emptyCoreLeaveBalance(type)),
                ...otherBalances,
            ]
        }
    } catch (e) {
        console.error('[dashboard] employee/leave query failed:', e)
    }

    // ── Carousel announcements: internal/promote only, top 5 active ──────────
    // Emergency + urgent live in the priority alert bar above the page, not here.
    try {
        const nowIso = new Date().toISOString()
        const { data: rows } = await supabaseAdmin
            .from('announcements')
            .select('id, headline, content, image_path, priority, publish_date, expires_at, created_by')
            .eq('publish_status', 'published')
            .in('priority', ['internal', 'promote'])
            .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
            .order('publish_date', { ascending: false })
            .limit(20)

        const PRIORITY_WEIGHT: Record<string, number> = {
            promote: 0, internal: 1,
        }
        const sorted = (rows ?? []).slice().sort((a, b) => {
            const wa = PRIORITY_WEIGHT[a.priority as string] ?? 9
            const wb = PRIORITY_WEIGHT[b.priority as string] ?? 9
            if (wa !== wb) return wa - wb
            return String(b.publish_date ?? '').localeCompare(String(a.publish_date ?? ''))
        }).slice(0, 5)

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
        const creatorMap = await resolveCreators(sorted.map(a => a.created_by as string | null))
        announcements = sorted.map(ann => {
            let resolvedPath = (ann.image_path as string | null) ?? null
            if (resolvedPath && !resolvedPath.startsWith('/') && !resolvedPath.startsWith('http')) {
                resolvedPath = `${supabaseUrl}/storage/v1/object/public/announcement-images/${resolvedPath}`
            }
            return {
                id: ann.id as string,
                headline: ann.headline as string,
                content: ann.content as string,
                imagePath: resolvedPath,
                priority: (ann.priority as string) ?? 'internal',
                publishDate: ann.publish_date as string,
                expiresAt: (ann.expires_at as string | null) ?? null,
                creatorName: displayCreator(ann.created_by as string | null, creatorMap),
            }
        })
    } catch (e) {
        console.error('[dashboard] announcements query failed:', e)
    }

    const today = new Date()
    const yearStart = new Date(today.getFullYear(), 0, 1)
    let workingDays = 0
    const cur = new Date(yearStart)
    while (cur <= today) {
        const dow = cur.getDay()
        const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
        const isSaturday = dow === 6
        const isSunday = dow === 0
        if (!isSunday && (!isSaturday || isWorkdaySaturday(dateStr))) {
            workingDays++
        }
        cur.setDate(cur.getDate() + 1)
    }

    const lateCount = 0 // Future: query attendance table

    // ── Today's company-calendar entry (holiday or WFH) ───────────────────────
    // Bangkok-local YYYY-MM-DD — using the runtime locale would be wrong on
    // Vercel where the function executes in UTC. We construct from the local
    // numeric pieces directly so the date matches what the user sees.
    const tzDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    let todayCalendarEntry: TodayCalendarEntry | null = null
    try {
        const { data } = await supabaseAdmin
            .from('holidays')
            .select('name, type')
            .eq('date', tzDate)
            .maybeSingle()
        if (data) {
            todayCalendarEntry = {
                name: (data.name as string) ?? '',
                type: (data.type as string) ?? 'company',
            }
        } else {
            // Check if today is a Saturday and return dynamic entry
            const satIdx = getSaturdayIndex(tzDate)
            if (satIdx > 0) {
                if (satIdx === 1) {
                    todayCalendarEntry = { name: 'วันทำงานครึ่งวัน (ออฟฟิศ)', type: 'work' }
                } else if (satIdx === 3) {
                    todayCalendarEntry = { name: 'วันทำงานครึ่งวัน (WFH)', type: 'wfh' }
                } else {
                    todayCalendarEntry = { name: 'วันหยุดประจำสัปดาห์', type: 'company' }
                }
            }
        }
    } catch (e) {
        console.error('[dashboard] today calendar fetch failed:', e)
    }

    return (
        <PortalDashboardClient
            sessionName={session.name}
            employee={employee}
            announcements={announcements}
            leaveBalances={leaveBalances}
            attendanceData={{ lateCount, workingDays }}
            todayCalendarEntry={todayCalendarEntry}
        />
    )
}
