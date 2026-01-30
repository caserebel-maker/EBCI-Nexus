import { DashboardShell } from '@/components/layout/shell'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session || session.role !== 'hr_admin') {
        // Redundant safety check (middleware covers this)
        redirect('/login')
    }

    return (
        <DashboardShell role="hr_admin" userName={session.name}>
            {children}
        </DashboardShell>
    )
}
