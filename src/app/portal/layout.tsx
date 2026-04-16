import { DashboardShell } from '@/components/layout/shell'
import { RoleProvider } from '@/contexts/role-context'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function EmployeeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session) {
        redirect('/login')
    }

    console.log('[portal/layout] session.role:', session.role, '| name:', session.name)

    return (
        <RoleProvider role={session.role}>
            <DashboardShell role={session.role} userName={session.name} showBottomNav>
                {children}
            </DashboardShell>
        </RoleProvider>
    )
}
