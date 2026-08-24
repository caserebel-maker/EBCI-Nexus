import { redirect } from 'next/navigation'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { AttendanceView } from './attendance-view'
import { getAttendanceForDate } from './actions'
import { todayBangkokKey } from '@/lib/datetime'
import { getReportEmployees } from '../reports/actions'

export const dynamic = 'force-dynamic'

function isDateKey(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export default async function AttendancePage({
    searchParams,
}: {
    searchParams?: Promise<{ date?: string }>
}) {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal')

    // Fetch initial data for today in Bangkok timezone (UTC+7)
    const params = await searchParams
    const dateStr = isDateKey(params?.date) ? params.date : todayBangkokKey()

    const [initial, employees] = await Promise.all([
        getAttendanceForDate(dateStr),
        getReportEmployees(),
    ])

    return (
        <AttendanceView
            initialDate={dateStr}
            initialData={initial.success ? initial : null}
            employees={employees}
        />
    )
}
