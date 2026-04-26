import { redirect } from 'next/navigation'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { AttendanceView } from './attendance-view'
import { getAttendanceForDate } from './actions'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal')

    // Fetch initial data for today
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    const initial = await getAttendanceForDate(dateStr)

    return (
        <AttendanceView
            initialDate={dateStr}
            initialData={initial.success ? initial : null}
        />
    )
}
