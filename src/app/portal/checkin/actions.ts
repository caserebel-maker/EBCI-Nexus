'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { haversineDistance } from '@/lib/geo'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

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
    /**
     * Three modes:
     *   office — must be inside the office geofence (default).
     *   wfh    — at home, no GPS validation, GPS optional.
     *   field  — anywhere off-site (customer meeting, delivery,
     *            sales visit). Skips the geofence check but still
     *            captures GPS for audit + requires a note explaining
     *            where the user is heading. Available to every
     *            employee on every day; soft accountability is
     *            handled by the HR review dashboard, not by gating
     *            access at this layer.
     */
    type: 'office' | 'wfh' | 'field'
    // GPS is required for office check-in (gated client-side) but
    // optional for WFH where the user might be on a desktop without
    // location services. Server validates type==='office' branch
    // before persisting any non-null lat/lng.
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    notes?: string
}

/** Minimum character count enforced on the field-checkin note. Long
 *  enough to make typing a placeholder ("ก") feel obviously lazy in
 *  the audit dashboard but short enough that a real reason fits
 *  ("ประชุม ABC", "ส่งของ X"). */
const FIELD_NOTE_MIN_LENGTH = 5

export async function checkIn(payload: CheckInPayload) {
    const employeeId = await getEmployeeId()
    if (!employeeId) {
        return { error: 'ไม่พบข้อมูลพนักงาน — กรุณาติดต่อ HR' }
    }

    // ── Anti-Trick #1: Time restriction (7:00-9:30 Bangkok time) ───────────
    // Vercel serverless runs in UTC — shift +7h then read as UTC to get
    // the Bangkok wall clock without depending on the process timezone.
    const nowBkk = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const minutesOfDay = nowBkk.getUTCHours() * 60 + nowBkk.getUTCMinutes()
    const START_TIME = 7 * 60       // 7:00 = 420 minutes
    const END_TIME = 9 * 60 + 30    // 9:30 = 570 minutes
    if (minutesOfDay < START_TIME || minutesOfDay > END_TIME) {
        return { error: 'เช็คอินได้เฉพาะเวลา 7:00-9:30 น. เท่านั้น' }
    }

    // Office check-in requires accurate GPS — WFH skips the check entirely.
    // Field check-in requires GPS too (the whole point is to capture where
    // the user really is) but doesn't validate against the office radius.
    // The GPS-spoof guard rejects > 100m only when we actually have a reading.
    const hasGps = payload.latitude !== null && payload.longitude !== null
    if (payload.type === 'office' && !hasGps) {
        return { error: 'ต้องมีสัญญาณ GPS สำหรับเช็คอินที่ออฟฟิศ — เปิด location services แล้วลองใหม่' }
    }
    if (payload.type === 'field' && !hasGps) {
        return { error: 'ต้องมีสัญญาณ GPS สำหรับเช็คอินภาคสนาม — เปิด location services แล้วลองใหม่' }
    }
    if (hasGps && payload.accuracy !== null && payload.accuracy > 100) {
        return { error: `สัญญาณ GPS ไม่แม่นยำพอ (${Math.round(payload.accuracy)} ม.) กรุณาไปยังที่โล่งแจ้งและลองใหม่` }
    }

    // Field check-in requires a non-trivial note describing where the user
    // is going — destination + reason. Pure trust system (no manager
    // approval, no photo) so the note is the only thing standing between
    // honest use and "I'm just clicking Field from home". HR sees the note
    // in the audit dashboard.
    const trimmedNote = (payload.notes ?? '').trim()
    if (payload.type === 'field' && trimmedNote.length < FIELD_NOTE_MIN_LENGTH) {
        return { error: `กรุณาระบุปลายทาง/เหตุผลอย่างน้อย ${FIELD_NOTE_MIN_LENGTH} ตัวอักษร (เช่น "ประชุม ABC ที่บางนา")` }
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

    // Distance check only runs when we have GPS (WFH may skip it entirely).
    // For office + field, the early-return above guarantees both lat/lng
    // are non-null. We compute it for all three so the audit row records
    // distance-from-office even for field check-ins (an anomaly heuristic
    // in the HR dashboard flags Field rows whose distance is *inside* the
    // office radius — likely a fake field click).
    const distance = (payload.latitude !== null && payload.longitude !== null)
        ? haversineDistance(payload.latitude, payload.longitude, location.latitude, location.longitude)
        : null

    // Determine actual type based on GPS vs user intent.
    let actualType: 'office' | 'wfh' | 'field' = payload.type
    if (payload.type === 'office' && distance !== null && distance > location.radius_meters) {
        // User claims office but GPS says not near.
        return {
            error: `คุณอยู่ห่างจากออฟฟิศ ${Math.round(distance)} เมตร (เกินรัศมี ${location.radius_meters} ม.) กรุณาเข้ามาใกล้กว่านี้หรือเลือก WFH/ออกพื้นที่`
        }
    }

    // ── Anti-Trick #3: Get IP from server-side headers (safer than client-supplied) ──
    const h = await headers()
    const forwardedFor = h.get('x-forwarded-for')
    const realIp = h.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0].trim() || realIp || null

    const { data, error } = await supabaseAdmin
        .from('checkins')
        .insert({
            employee_id: employeeId,
            type: actualType,
            latitude: payload.latitude,
            longitude: payload.longitude,
            accuracy_meters: payload.accuracy,
            distance_from_office: distance,
            notes: trimmedNote || null,
            ip_address: ipAddress,
            source: 'web',
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
        distance_meters: distance !== null ? Math.round(distance) : null,
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
