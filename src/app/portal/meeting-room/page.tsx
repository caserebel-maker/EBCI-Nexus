import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { listUpcomingBookings, listMyBookings } from './actions'
import { ROOM_NAME, BOOKING_HORIZON_DAYS } from './constants'
import { MeetingRoomView } from './meeting-room-view'

export const dynamic = 'force-dynamic'

export default async function MeetingRoomPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const [upcoming, mine] = await Promise.all([
        listUpcomingBookings(),
        listMyBookings(),
    ])

    return (
        <MeetingRoomView
            roomName={ROOM_NAME}
            horizonDays={BOOKING_HORIZON_DAYS}
            upcoming={upcoming}
            mine={mine}
            currentEmployeeId={session.employeeId ?? null}
            isHrAdmin={session.role === 'hr_admin'}
        />
    )
}
