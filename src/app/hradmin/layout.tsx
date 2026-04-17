import { DashboardShell } from '@/components/layout/shell'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEmployeeProfile } from '@/lib/employee-profile'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session || (session.role !== 'hr_admin' && session.role !== 'manager')) {
        redirect('/login')
    }

    const profile = await getEmployeeProfile(
        session.employeeId,
        session.name,
        session.name,
        session.role
    )

    return (
        <DashboardShell
            role={session.role as 'hr_admin' | 'manager'}
            userName={session.name}
            profile={profile}
            showBottomNav
        >
            {children}
        </DashboardShell>
    )
}
