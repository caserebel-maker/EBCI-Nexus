import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ProfileClient } from './profile-client'

export const dynamic = 'force-dynamic'

// ─── Types ─────────────────────────────────────────────────────────────────────
type EmpRow = {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    position: string | null
    department: string | null
    secondary_department: string | null
    start_date: string | null
    photo_url: string | null
    email: string | null
    phone: string | null
    applicant_id: string | null
    employee_code: string | null
    employment_type: string | null
    manager_id: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    emergency_contact_relation: string | null
}

const EMP_SELECT = [
    'id', 'first_name_th', 'last_name_th', 'nickname', 'position', 'department',
    'secondary_department',
    'start_date', 'photo_url', 'email', 'phone', 'applicant_id',
    'employee_code', 'employment_type', 'manager_id',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
].join(', ')

// ─── Employee lookup with email fallback ──────────────────────────────────────
async function findEmployee(userId: string): Promise<EmpRow | null> {
    const { data: byId } = await supabaseAdmin
        .from('employees')
        .select(EMP_SELECT)
        .eq('user_id', userId)
        .maybeSingle()

    if (byId) return byId as EmpRow

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
    const userEmail = authData?.user?.email
    if (!userEmail) return null

    const { data: byEmail } = await supabaseAdmin
        .from('employees')
        .select(EMP_SELECT)
        .eq('email', userEmail)
        .maybeSingle()

    if (!byEmail) return null

    // Auto-link for next request
    await supabaseAdmin
        .from('employees')
        .update({ user_id: userId })
        .eq('id', (byEmail as EmpRow).id)

    return byEmail as EmpRow
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTenure(startDate: string): string {
    const start = new Date(startDate)
    const now = new Date()
    const totalMonths =
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    const y = Math.floor(totalMonths / 12)
    const m = totalMonths % 12
    if (y === 0) return `${m} เดือน`
    if (m === 0) return `${y} ปี`
    return `${y} ปี ${m} เดือน`
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function ProfilePage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const emp = await findEmployee(session.id)

    // ── Avatar ────────────────────────────────────────────────────────────────
    let avatarUrl: string | null = emp?.photo_url ?? null

    if (!avatarUrl && emp?.applicant_id) {
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
            } catch { /* silent */ }
        }
    }

    // ── Manager name ──────────────────────────────────────────────────────────
    let managerName: string | null = null
    if (emp?.manager_id) {
        const { data: mgr } = await supabaseAdmin
            .from('employees')
            .select('first_name_th, last_name_th')
            .eq('id', emp.manager_id)
            .maybeSingle()
        if (mgr) managerName = `${mgr.first_name_th ?? ''} ${mgr.last_name_th ?? ''}`.trim() || null
    }

    // ── Leave balances ────────────────────────────────────────────────────────
    const DEFAULT_ENTITLED: Record<string, number> = {
        annual: 6, sick: 30, personal: 3, maternity: 90, ordination: 15,
    }
    const LEAVE_TYPES = ['annual', 'sick', 'personal']

    let leaveBalances: { leaveType: string; entitledDays: number; usedDays: number }[] = []
    if (emp) {
        const year = new Date().getFullYear()
        const stored = await prisma.leaveBalance.findMany({
            where: { employeeId: emp.id, year },
        }).catch(() => [])

        leaveBalances = LEAVE_TYPES.map(lt => {
            const found = stored.find(b => b.leaveType === lt)
            return {
                leaveType: lt,
                entitledDays: Number(found?.entitledDays ?? DEFAULT_ENTITLED[lt] ?? 0),
                usedDays: Number(found?.usedDays ?? 0),
            }
        })
    }

    // ── Recent leaves ─────────────────────────────────────────────────────────
    const recentLeaves = emp
        ? await prisma.leaveRequest.findMany({
            where: { employeeId: emp.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true, leaveType: true,
                startDate: true, endDate: true,
                totalDays: true, status: true,
            },
        }).catch(() => [])
        : []

    // ── Derived values ────────────────────────────────────────────────────────
    const firstName   = emp?.first_name_th ?? session.name
    const lastName    = emp?.last_name_th  ?? ''
    const nickname    = emp?.nickname ?? null
    const displayName = nickname
        ? `${firstName} ${lastName} (${nickname})`.trim()
        : `${firstName} ${lastName}`.trim()
    const initials    = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase()
    const tenure      = emp?.start_date ? calcTenure(emp.start_date) : null

    return (
        <ProfileClient
            displayName={displayName}
            initials={initials}
            avatarUrl={avatarUrl}
            position={emp?.position ?? null}
            department={emp?.department ?? null}
            secondaryDepartment={emp?.secondary_department ?? null}
            emergencyContactName={emp?.emergency_contact_name ?? null}
            emergencyContactPhone={emp?.emergency_contact_phone ?? null}
            emergencyContactRelation={emp?.emergency_contact_relation ?? null}
            employeeCode={emp?.employee_code ?? null}
            employmentType={emp?.employment_type ?? null}
            tenure={tenure}
            startDate={emp?.start_date ?? null}
            email={emp?.email ?? null}
            phone={emp?.phone ?? null}
            managerName={managerName}
            leaveBalances={leaveBalances}
            recentLeaves={recentLeaves.map(r => ({
                id: r.id,
                leaveType: r.leaveType,
                startDate: r.startDate.toISOString(),
                endDate: r.endDate.toISOString(),
                totalDays: Number(r.totalDays),
                status: r.status,
            }))}
        />
    )
}
