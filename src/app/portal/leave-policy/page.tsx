import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { fetchActiveLeaveTypes } from '@/lib/leave-balance'
import { LeaveWfhSubNav } from '@/components/layout/leave-wfh-sub-nav'
import { LeavePolicyView } from './leave-policy-view'

export const dynamic = 'force-dynamic'

export default async function LeavePolicyPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const leaveTypes = await fetchActiveLeaveTypes()

    return (
        <>
            <div className="max-w-5xl mx-auto pb-3">
                <LeaveWfhSubNav />
            </div>
            <LeavePolicyView leaveTypes={leaveTypes} />
        </>
    )
}
