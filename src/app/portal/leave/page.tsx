import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { LeaveWfhSubNav } from '@/components/layout/leave-wfh-sub-nav'
import { MyLeaveView } from './my-leave-view'

export const dynamic = 'force-dynamic'

export default async function PortalLeavePage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const year = new Date().getFullYear()
    // Sub-nav sits ABOVE the view so the user can hop to ขอ WFH /
    // วันหยุดสะสม / ปฏิทิน / นโยบาย in one tap from anywhere in the
    // leave-and-WFH hub. max-w mirrors the view's own container so the
    // chip row aligns with the page content underneath.
    return (
        <>
            <div className="max-w-5xl mx-auto pb-3">
                <LeaveWfhSubNav />
            </div>
            <MyLeaveView year={year} />
        </>
    )
}
