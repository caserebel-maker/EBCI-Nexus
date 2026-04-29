import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { QuotaDashboard } from './quota-dashboard'

export const dynamic = 'force-dynamic'

export default async function SystemQuotaPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'hr_admin') redirect('/hradmin/dashboard')

    return <QuotaDashboard />
}
