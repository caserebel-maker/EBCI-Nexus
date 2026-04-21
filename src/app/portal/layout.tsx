import { DashboardShell } from '@/components/layout/shell'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PriorityAlerts } from '@/components/dashboard/priority-alerts'
import { fetchPriorityAlerts } from '@/lib/priority-alerts-fetch'
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

    const [alerts, profile] = await Promise.all([
        fetchPriorityAlerts(),
        getEmployeeProfile(
            session.employeeId,
            session.name,
            session.name,
            session.role,
            session.id,
        ),
    ])

    return (
        <DashboardShell
            role={session.role}
            userName={session.name}
            profile={profile}
            showBottomNav
            emergencyBanner={alerts.length > 0 ? <PriorityAlerts alerts={alerts} /> : null}
        >
            {children}
        </DashboardShell>
    )
}
