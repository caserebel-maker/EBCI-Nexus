import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { fetchWhoIsOutToday } from '@/lib/who-is-out'
import { WhoIsOutView } from './who-is-out-view'

export const dynamic = 'force-dynamic'

export default async function WhoIsOutPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const entries = await fetchWhoIsOutToday()
    return <WhoIsOutView initialEntries={entries} />
}
