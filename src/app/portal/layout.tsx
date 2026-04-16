import { DashboardShell } from '@/components/layout/shell'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { EmergencyBanner } from '@/components/dashboard/emergency-banner'

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
        const { data } = await supabaseAdmin
            .from('announcements')
            .select('*')
            .eq('priority', 'emergency')
            .eq('publish_status', 'published')
            .order('publish_date', { ascending: false })
            .limit(1)
            .maybeSingle()
        emergency = data
    } catch {
        // non-critical
    }

    return (
        <DashboardShell role={session.role} userName={session.name} showBottomNav>
            <EmergencyBanner emergency={emergency} />
            {children}
        </DashboardShell>
    )
}
