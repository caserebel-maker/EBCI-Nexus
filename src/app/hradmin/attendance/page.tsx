import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AttendanceView } from './attendance-view'
import { getAttendanceForDate } from './actions'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')

    // Parse cookie to check HR Admin role
    try {
        const session = JSON.parse(sessionCookie.value)
        if (session.role !== 'hr_admin') {
            redirect('/portal')
        }
    } catch {
        redirect('/login')
    }

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
