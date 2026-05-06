import { DashboardShell } from '@/components/layout/shell'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PriorityAlerts } from '@/components/dashboard/priority-alerts'
import { fetchPriorityAlerts } from '@/lib/priority-alerts-fetch'
import { getEmployeeProfile } from '@/lib/employee-profile'
import { getCurrentPermissions } from '@/lib/permissions-server'
import { ConfirmDialogProvider } from '@/hooks/use-confirm-dialog'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session) redirect('/login')

    // Pre-fetch permissions so the shell can decide what to render before
    // we apply the role/permission gate below — saves a duplicate query.
    const permissions = await getCurrentPermissions()

    // Layout-level access: anyone with role manager/hr_admin OR a flag
    // that grants any /hradmin page (currently only can_manage_payroll
    // qualifies via /hradmin/payroll/bulk). Page-level guards still
    // apply for finer control.
    const hasAnyHradminAccess =
        session.role === 'hr_admin' ||
        session.role === 'manager' ||
        permissions.can_manage_payroll
    if (!hasAnyHradminAccess) redirect('/portal')

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
        <ConfirmDialogProvider>
            <DashboardShell
                role={session.role as 'hr_admin' | 'manager' | 'employee'}
                userName={session.name}
                profile={profile}
                permissions={permissions}
                showBottomNav
                emergencyBanner={alerts.length > 0 ? <PriorityAlerts alerts={alerts} /> : null}
            >
                {children}
            </DashboardShell>
        </ConfirmDialogProvider>
    )
}
