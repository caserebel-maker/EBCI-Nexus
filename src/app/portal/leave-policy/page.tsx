import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { fetchActiveLeaveTypes } from '@/lib/leave-balance'
import { LeavePolicyView } from './leave-policy-view'

export const dynamic = 'force-dynamic'

export default async function LeavePolicyPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const leaveTypes = await fetchActiveLeaveTypes()

    return <LeavePolicyView leaveTypes={leaveTypes} />
}
