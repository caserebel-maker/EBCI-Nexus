import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { CompDaysView } from './comp-days-view'

export const dynamic = 'force-dynamic'

export default async function PortalCompDaysPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    return <CompDaysView />
}
