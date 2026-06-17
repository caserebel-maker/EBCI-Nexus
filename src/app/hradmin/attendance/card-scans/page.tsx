import { redirect } from 'next/navigation'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { CardScansView } from './card-scans-view'
import { getCardScans } from './actions'

export const dynamic = 'force-dynamic'

export default async function CardScansPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal')

    const initial = await getCardScans({ page: 1, limit: 50 })

    return (
        <CardScansView
            initialData={initial.success ? initial : null}
        />
    )
}
