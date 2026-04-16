import { supabaseAdmin } from "@/lib/supabase-admin"
import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import { EmployeeProfileView } from "./employee-profile-view"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: PageProps) {
    const { id } = await params

    // Resolve role from session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    let isHrAdmin = false
    if (sessionCookie?.value) {
        try {
            const session = JSON.parse(sessionCookie.value)
            isHrAdmin = session.role === 'hr_admin'
        } catch { /* ignore */ }
    }

    const { data: employee, error } = await supabaseAdmin
        .from('employees')
        .select(`
            *,
            applicants (
                photo_path,
                nickname,
                phone,
                email,
                current_address,
                applicant_educations (*),
                applicant_experiences (*)
            ),
            User:user_id (
                username,
                role
            )
        `)
        .eq('id', id)
        .single()

    if (error || !employee) {
        if (error) console.error("Supabase Error:", error)
        notFound()
    }

    const displayName = `${employee.first_name_th} ${employee.last_name_th}`

    // ── Photo URL ──────────────────────────────────────────────────────────────
    let photoUrl: string | null = null
    const photoPath = employee.photo_path || employee.applicants?.photo_path
    if (photoPath) {
        const bucket = employee.photo_path ? 'employee-photos' : 'applicant-assets'
        const { data } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(photoPath, 3600)
        photoUrl = data?.signedUrl ?? null
    }

    // ── Supervisor name ────────────────────────────────────────────────────────
    let supervisorName = '—'
    if (employee.supervisor_id) {
        const { data: sup } = await supabaseAdmin
            .from('employees')
            .select('first_name_th, last_name_th')
            .eq('id', employee.supervisor_id)
            .single()
        if (sup) supervisorName = `${sup.first_name_th} ${sup.last_name_th}`
    }

    // ── Leave balances ─────────────────────────────────────────────────────────
    const { data: leaveBalancesRaw } = await supabaseAdmin
        .from('leave_balances')
        .select('leave_type, entitled_days, used_days, remaining_days')
        .eq('employee_id', id)

    const leaveBalances: { leave_type: string; entitled_days: number; used_days: number; remaining_days: number }[] =
        leaveBalancesRaw ?? []

    // ── Recent leave requests (last 5) ─────────────────────────────────────────
    const { data: recentLeavesRaw } = await supabaseAdmin
        .from('leave_requests')
        .select('id, leave_type, start_date, end_date, days, status, created_at, reason')
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
        .limit(5)

    const recentLeaves: {
        id: string
        leave_type: string
        start_date: string
        end_date: string
        days: number
        status: string
        created_at: string
        reason: string | null
    }[] = recentLeavesRaw ?? []

    // ── Tenure ─────────────────────────────────────────────────────────────────
    const startDate = new Date(employee.start_date)
    const now = new Date()
    const tenureMonths = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
    const tenureYears = Math.floor(tenureMonths / 12)
    const tenureRem = tenureMonths % 12
    const tenure = tenureYears > 0
        ? `${tenureYears} ปี${tenureRem > 0 ? ` ${tenureRem} เดือน` : ''}`
        : `${tenureRem} เดือน`

    return (
        <EmployeeProfileView
            employee={employee}
            photoUrl={photoUrl}
            displayName={displayName}
            supervisorName={supervisorName}
            tenure={tenure}
            leaveBalances={leaveBalances}
            recentLeaves={recentLeaves}
            id={id}
            isHrAdmin={isHrAdmin}
        />
    )
}
