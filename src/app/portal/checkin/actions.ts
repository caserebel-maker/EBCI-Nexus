'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { haversineDistance } from '@/lib/geo'
import { revalidatePath } from 'next/cache'

// Helper: resolve employee_id from session (with email fallback for legacy users)
async function getEmployeeId(): Promise<string | null> {
    const session = await getSession()
    if (!session) return null
    if (session.employeeId) return session.employeeId

    // Fallback: look up by email (session.name = email for legacy users)
    const email = session.name
    if (!email || !email.includes('@')) return null

    const { data } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('email', email)
        .maybeSingle()
    return data?.id ?? null
}

export interface CheckInPayload {
    type: 'office' | 'wfh'
    latitude: number
    longitude: number
    accuracy: number
    notes?: string
}

export async function checkIn(payload: CheckInPayload) {
    const employeeId = await getEmployeeId()
    if (!employeeId) {
        return { error: 'ไม่พบข้อมูลพนักงาน — กรุณาติดต่อ HR' }
    }

    // Guard: 1 check-in per day (Option 1 — strict)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: openCheckin } = await supabaseAdmin
        .from('checkins')
        .select('id')
        .eq('employee_id', employeeId)
        .gte('checked_in_at', today.toISOString())
        .maybeSingle()

    if (openCheckin) {
        return { error: 'คุณได้เช็คอินแล้ววันนี้ กรุณาเช็คเอาท์ก่อน' }
    }

    // Get EBCI office location
    const { data: location } = await supabaseAdmin
        .from('check_in_locations')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

    if (!location) {
        return { error: 'ยังไม่ได้ตั้งค่าตำแหน่งออฟฟิศ' }
    }

    const distance = haversineDistance(
        payload.latitude,
        payload.longitude,
        location.latitude,
        location.longitude
    )

    // Determine actual type based on GPS vs user intent
    let actualType: 'office' | 'wfh' | 'offsite' = payload.type
    if (payload.type === 'office' && distance > location.radius_meters) {
        // User claims office but GPS says not near
        return { 
            error: `คุณอยู่ห่างจากออฟฟิศ ${Math.round(distance)} เมตร (เกินรัศมี ${location.radius_meters} ม.) กรุณาเข้ามาใกล้กว่านี้หรือเลือก WFH` 
        }
    }
    if (payload.type === 'wfh') {
        actualType = 'wfh'
    }

    const { data, error } = await supabaseAdmin
        .from('checkins')
        .insert({
            employee_id: employeeId,
            type: actualType,
            latitude: payload.latitude,
            longitude: payload.longitude,
            accuracy_meters: payload.accuracy,
            distance_from_office: distance,
            notes: payload.notes ?? null,
        })
        .select('id, checked_in_at, type')
        .single()

    if (error) {
        console.error('checkIn error:', error)
        return { error: error.message }
    }

    revalidatePath('/portal/checkin')
    return {
        success: true,
        id: data.id,
        type: data.type,
        checked_in_at: data.checked_in_at,
        distance_meters: Math.round(distance),
    }
}

export async function checkOut() {
    const employeeId = await getEmployeeId()
    if (!employeeId) {
        return { error: 'ไม่พบข้อมูลพนักงาน' }
    }

    // Find open checkin today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: openCheckin } = await supabaseAdmin
        .from('checkins')
        .select('id')
        .eq('employee_id', employeeId)
        .is('checked_out_at', null)
        .gte('checked_in_at', today.toISOString())
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (!openCheckin) {
        return { error: 'ยังไม่ได้เช็คอินวันนี้' }
    }

    const { error } = await supabaseAdmin
        .from('checkins')
        .update({ checked_out_at: new Date().toISOString() })
        .eq('id', openCheckin.id)

    if (error) return { error: error.message }

    revalidatePath('/portal/checkin')
    return { success: true }
}

export async function getTodayCheckin() {
    const employeeId = await getEmployeeId()
    if (!employeeId) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await supabaseAdmin
        .from('checkins')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('checked_in_at', today.toISOString())
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return data
}
