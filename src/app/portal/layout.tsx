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

    console.log('SESSION OBJECT:', JSON.stringify(session))
    console.log('SESSION ROLE:', session?.role)

    return (
        <DashboardShell role={session.role} userName={session.name}>
            {children}
        </DashboardShell>
    )
}
