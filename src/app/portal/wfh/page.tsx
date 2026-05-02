import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { LeaveWfhSubNav } from '@/components/layout/leave-wfh-sub-nav'
import { WfhView } from './wfh-view'

export const dynamic = 'force-dynamic'

export default async function PortalWfhPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    return (
        <>
            <div className="max-w-5xl mx-auto pb-3">
                <LeaveWfhSubNav />
            </div>
            <WfhView />
        </>
    )
}
