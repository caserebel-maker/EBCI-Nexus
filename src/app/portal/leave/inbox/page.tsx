import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { InboxView } from './inbox-view'

export const dynamic = 'force-dynamic'

export default async function LeaveInboxPage() {
    const store = await cookies()
    const sessionCookie = store.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')

    return <InboxView />
}
