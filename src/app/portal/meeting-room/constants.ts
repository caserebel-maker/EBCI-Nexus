// Non-action exports for the meeting-room feature. Kept out of actions.ts
// because that file is "use server" — Next.js requires every export from a
// "use server" module to be an async function, otherwise the module is
// stripped entirely. Constants and shared types live here instead.

export const ROOM_NAME = 'ห้องประชุมชั้น 2'
export const BOOKING_HORIZON_DAYS = 7

export interface RoomBooking {
    id: string
    title: string
    notes: string | null
    attendees: string | null
    starts_at: string
    ends_at: string
    booked_by_employee_id: string | null
    booked_by_name: string
    cancelled_at: string | null
    cancelled_by_name: string | null
    cancellation_reason: string | null
    created_at: string
}
