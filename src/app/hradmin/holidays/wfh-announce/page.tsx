import { redirect } from 'next/navigation'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { WfhAnnounceView } from './wfh-announce-view'

export const dynamic = 'force-dynamic'

export default async function WfhAnnouncePage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal/dashboard')
    return <WfhAnnounceView />
}
