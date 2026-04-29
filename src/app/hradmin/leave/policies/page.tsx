import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { PoliciesView } from './policies-view'

export const dynamic = 'force-dynamic'

export default async function HrLeavePoliciesPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'hr_admin') redirect('/hradmin/dashboard')

    return <PoliciesView />
}
