import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { QuotaDashboard } from './quota-dashboard'

export const dynamic = 'force-dynamic'

export default async function SystemQuotaPage() {
    const store = await cookies()
    const sessionCookie = store.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')
    try {
        const s = JSON.parse(sessionCookie.value)
        if (s.role !== 'hr_admin') redirect('/hradmin/dashboard')
    } catch {
        redirect('/login')
    }

    return <QuotaDashboard />
}
