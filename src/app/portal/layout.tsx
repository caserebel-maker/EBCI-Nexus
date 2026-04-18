import { DashboardShell } from '@/components/layout/shell'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { EmergencyBanner } from '@/components/dashboard/emergency-banner'
import { getEmployeeProfile } from '@/lib/employee-profile'

export default async function EmployeeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session) {
        redirect('/login')
    }

    let emergency = null
    try {
        // Only show emergency banner if: priority=emergency + published + not expired
        const nowIso = new Date().toISOString()
        const { data } = await supabaseAdmin
            .from('announcements')
            .select('*')
            .eq('priority', 'emergency')
            .eq('publish_status', 'published')
            .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
            .order('publish_date', { ascending: false })
            .limit(1)
            .maybeSingle()
        emergency = data
    } catch {
        // non-critical
    }

    const profile = await getEmployeeProfile(
        session.employeeId,
        session.name,
        session.name,
        session.role
    )

    return (
        <DashboardShell
            role={session.role}
            userName={session.name}
            profile={profile}
            showBottomNav
            emergencyBanner={<EmergencyBanner emergency={emergency} />}
        >
            {children}
        </DashboardShell>
    )
}
