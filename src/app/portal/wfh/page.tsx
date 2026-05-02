import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { WfhView } from './wfh-view'

export const dynamic = 'force-dynamic'

export default async function PortalWfhPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    return <WfhView />
}
