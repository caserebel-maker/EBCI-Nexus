import { DashboardShell } from '@/components/layout/shell'
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

    return (
        <DashboardShell role="employee" userName={session.name}>
            {children}
        </DashboardShell>
    )
}
