'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { BOOKING_HORIZON_DAYS, type RoomBooking } from './constants'

const MIN_DURATION_MIN = 15
const MAX_DURATION_HOURS = 8

interface CreatePayload {
    title: string
    notes?: string
    attendees?: string
    startsAt: string
    endsAt: string
}

async function resolveBooker() {
    const session = await getSession()
    if (!session) return null

    let employeeId: string | null = session.employeeId ?? null
    let name = session.name

    if (employeeId) {
        const { data } = await supabaseAdmin
            .from('employees')
            .select('first_name_th, last_name_th, employee_code')
            .eq('id', employeeId)
            .maybeSingle()
        if (data) {
            name = `${data.first_name_th ?? ''} ${data.last_name_th ?? ''}`.trim() || name
        }
    }

    return { session, employeeId, name }
}

export async function listUpcomingBookings(): Promise<RoomBooking[]> {
    const horizonMs = BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000
    const cutoff = new Date(Date.now() + horizonMs).toISOString()

    const { data, error } = await supabaseAdmin
        .from('room_bookings')
        .select('id, title, notes, attendees, starts_at, ends_at, booked_by_employee_id, booked_by_name, cancelled_at, cancelled_by_name, cancellation_reason, created_at')
        .is('cancelled_at', null)
        .lte('starts_at', cutoff)
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true })

    if (error) {
        console.error('listUpcomingBookings error:', error)
        return []
    }
    return data ?? []
}

export async function listAllBookingsForHr(): Promise<RoomBooking[]> {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') return []

    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const to = new Date(Date.now() + BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabaseAdmin
        .from('room_bookings')
        .select('id, title, notes, attendees, starts_at, ends_at, booked_by_employee_id, booked_by_name, cancelled_at, cancelled_by_name, cancellation_reason, created_at')
        .gte('starts_at', from)
        .lte('starts_at', to)
        .order('starts_at', { ascending: false })

    if (error) {
        console.error('listAllBookingsForHr error:', error)
        return []
    }
    return data ?? []
}

export async function listMyBookings(): Promise<RoomBooking[]> {
    const session = await getSession()
    if (!session?.employeeId) return []

    const { data, error } = await supabaseAdmin
        .from('room_bookings')
        .select('id, title, notes, attendees, starts_at, ends_at, booked_by_employee_id, booked_by_name, cancelled_at, cancelled_by_name, cancellation_reason, created_at')
        .eq('booked_by_employee_id', session.employeeId)
        .gte('ends_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('starts_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('listMyBookings error:', error)
        return []
    }
    return data ?? []
}

export async function createBooking(payload: CreatePayload): Promise<{ error?: string; success?: boolean }> {
    const booker = await resolveBooker()
    if (!booker) return { error: 'กรุณาเข้าสู่ระบบก่อน' }

    const title = payload.title?.trim()
    if (!title) return { error: 'กรอกหัวเรื่องการประชุม' }
    if (title.length > 200) return { error: 'หัวเรื่องยาวเกิน 200 ตัวอักษร' }

    const notes = payload.notes?.trim() || null
    if (notes && notes.length > 1000) return { error: 'หมายเหตุยาวเกิน 1,000 ตัวอักษร' }

    const attendees = payload.attendees?.trim() || null
    if (attendees && attendees.length > 500) return { error: 'รายชื่อผู้ร่วมประชุมยาวเกิน 500 ตัวอักษร' }

    const startsAt = new Date(payload.startsAt)
    const endsAt = new Date(payload.endsAt)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        return { error: 'เวลาเริ่ม/สิ้นสุดไม่ถูกต้อง' }
    }
    if (endsAt <= startsAt) {
        return { error: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม' }
    }

    const now = new Date()
    if (startsAt.getTime() < now.getTime() - 60 * 1000) {
        return { error: 'จองย้อนหลังไม่ได้' }
    }

    const horizon = new Date(now.getTime() + BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000)
    if (startsAt > horizon) {
        return { error: `จองล่วงหน้าได้ไม่เกิน ${BOOKING_HORIZON_DAYS} วัน` }
    }

    const durationMin = (endsAt.getTime() - startsAt.getTime()) / 60000
    if (durationMin < MIN_DURATION_MIN) {
        return { error: `ระยะเวลาประชุมต้องอย่างน้อย ${MIN_DURATION_MIN} นาที` }
    }
    if (durationMin > MAX_DURATION_HOURS * 60) {
        return { error: `ระยะเวลาประชุมเกิน ${MAX_DURATION_HOURS} ชั่วโมงไม่ได้` }
    }

    const { error } = await supabaseAdmin
        .from('room_bookings')
        .insert({
            title,
            notes,
            attendees,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            booked_by_employee_id: booker.employeeId,
            booked_by_name: booker.name,
        })

    if (error) {
        // Postgres exclusion constraint code is 23P01.
        if (error.code === '23P01' || /room_bookings_no_overlap/i.test(error.message)) {
            return { error: 'ช่วงเวลานี้มีคนจองห้องแล้ว — กรุณาเลือกช่วงเวลาอื่น' }
        }
        console.error('createBooking error:', error)
        return { error: 'จองไม่สำเร็จ — ' + error.message }
    }

    revalidatePath('/portal/meeting-room')
    revalidatePath('/portal/calendar')
    revalidatePath('/hradmin/meeting-room')
    return { success: true }
}

export async function cancelBooking(bookingId: string, reason?: string): Promise<{ error?: string; success?: boolean }> {
    const booker = await resolveBooker()
    if (!booker) return { error: 'กรุณาเข้าสู่ระบบก่อน' }

    const { data: booking, error: fetchError } = await supabaseAdmin
        .from('room_bookings')
        .select('id, booked_by_employee_id, cancelled_at, ends_at')
        .eq('id', bookingId)
        .maybeSingle()

    if (fetchError || !booking) return { error: 'ไม่พบรายการจองนี้' }
    if (booking.cancelled_at) return { error: 'รายการนี้ถูกยกเลิกไปแล้ว' }
    if (new Date(booking.ends_at) < new Date()) {
        return { error: 'รายการนี้ผ่านไปแล้ว — ยกเลิกไม่ได้' }
    }

    const isOwner = booking.booked_by_employee_id && booking.booked_by_employee_id === booker.employeeId
    const isHrAdmin = booker.session.role === 'hr_admin'
    if (!isOwner && !isHrAdmin) {
        return { error: 'เฉพาะผู้จองหรือ HR เท่านั้นที่ยกเลิกได้' }
    }

    const { error } = await supabaseAdmin
        .from('room_bookings')
        .update({
            cancelled_at: new Date().toISOString(),
            cancelled_by_employee_id: booker.employeeId,
            cancelled_by_name: booker.name,
            cancellation_reason: reason?.trim() || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)

    if (error) {
        console.error('cancelBooking error:', error)
        return { error: 'ยกเลิกไม่สำเร็จ — ' + error.message }
    }

    revalidatePath('/portal/meeting-room')
    revalidatePath('/portal/calendar')
    revalidatePath('/hradmin/meeting-room')
    return { success: true }
}
