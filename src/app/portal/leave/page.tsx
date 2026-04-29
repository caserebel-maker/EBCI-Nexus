import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { MyLeaveView } from './my-leave-view'

export const dynamic = 'force-dynamic'

export default async function PortalLeavePage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const year = new Date().getFullYear()
    return <MyLeaveView year={year} />
}
