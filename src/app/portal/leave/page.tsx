import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MyLeaveView } from './my-leave-view'

export const dynamic = 'force-dynamic'

export default async function PortalLeavePage() {
    const store = await cookies()
    const sessionCookie = store.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')

    const year = new Date().getFullYear()
    return <MyLeaveView year={year} />
}
