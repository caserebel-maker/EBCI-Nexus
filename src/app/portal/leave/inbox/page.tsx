import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { InboxView } from './inbox-view'

export const dynamic = 'force-dynamic'

export default async function LeaveInboxPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    return <InboxView />
}
