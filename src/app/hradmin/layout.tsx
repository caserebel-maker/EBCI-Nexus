import { DashboardShell } from '@/components/layout/shell'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session || (session.role !== 'hr_admin' && session.role !== 'manager')) {
        redirect('/login')
    }

    return (
        <DashboardShell role={session.role as 'hr_admin' | 'manager'} userName={session.name} showBottomNav>
            {children}
        </DashboardShell>
    )
}
