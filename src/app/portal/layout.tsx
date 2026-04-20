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

    let emergencies: any[] = []
    try {
        // Show emergency + urgent banners (max 2), published + not expired
        // Priority order: emergency first, then urgent
        const nowIso = new Date().toISOString()
        const { data } = await supabaseAdmin
            .from('announcements')
            .select('*')
            .in('priority', ['emergency', 'urgent'])
            .eq('publish_status', 'published')
            .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
            .order('priority', { ascending: true })  // emergency < urgent alphabetically? let's check
            .order('publish_date', { ascending: false })
            .limit(5)
        // Sort: emergency first, then urgent; max 2
        const sorted = (data ?? []).sort((a: any, b: any) => {
            if (a.priority === b.priority) return 0
            return a.priority === 'emergency' ? -1 : 1
        })
        emergencies = sorted.slice(0, 2)
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
            emergencyBanner={emergencies.length > 0 ? (
                <div className="space-y-2">
                    {emergencies.map((e: any) => (
                        <EmergencyBanner key={e.id} emergency={e} />
                    ))}
                </div>
            ) : null}
        >
            {children}
        </DashboardShell>
    )
}
