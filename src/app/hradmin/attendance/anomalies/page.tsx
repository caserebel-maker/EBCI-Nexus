import { redirect } from 'next/navigation'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { AnomaliesView } from './anomalies-view'
import { getAnomalies } from './actions'

export const dynamic = 'force-dynamic'

export default async function AttendanceAnomaliesPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal')

    const data = await getAnomalies()
    if ('error' in data) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center">
                <p className="text-rose-300">เกิดข้อผิดพลาด: {data.error}</p>
            </div>
        )
    }

    return <AnomaliesView initial={data} />
}
