'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { haversineDistance } from '@/lib/geo'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getLeaveTodayInfo } from '@/lib/leave-today'
import { checkWfhEligibility } from '@/lib/wfh-eligibility'
import { bangkokTodayIso } from '@/lib/leave-validations'
import { resolveLeaveApprover } from '@/lib/leave-approval'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'

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
    /**
     * Optional explanation when arriving late (>0 min past 08:00 BKK).
     * UI prompts but doesn't block: tier 1 (1-30 min) is optional,
     * tier 2 (31-60 min) is "please explain", tier 3 (>60 min)
     * triggers a notification to the direct manager regardless of
     * whether reason is provided.
     */
    lateReason?: string
}

// Official workday start (Bangkok wall-clock minutes from midnight).
// 08:00 = 8*60 = 480. Anything past this counts as late.
const OFFICIAL_START_MIN = 8 * 60
// Tier thresholds for late-check-in UX (minutes past OFFICIAL_START_MIN).
const LATE_TIER2_MIN = 30   // > 30 min = "please explain"
const LATE_TIER3_MIN = 60   // > 60 min = manager notified

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

    // ── §1.3 Leave-day suppression ─────────────────────────────────────────
    // If the employee has an approved (full-day) leave that covers today,
    // refuse the check-in attempt. Half-day leaves still allow check-in
    // (the other half of the day is normal work) — getLeaveTodayInfo
    // sets blocksCheckin=false for those.
    const leaveToday = await getLeaveTodayInfo(employeeId)
    if (leaveToday?.blocksCheckin) {
        const typeName = leaveToday.leave_type_name ?? 'ลา'
        return {
            error: `วันนี้คุณ${typeName}อยู่ — ไม่ต้องเช็คอิน หากต้องการยกเลิกใบลาให้กดที่หน้า "การลา"`,
        }
    }

    // ── §3.1 Layer 3: WFH eligibility enforcement ──────────────────────────
    // The UI already disables the WFH button when the user isn't eligible,
    // but the button could be bypassed via a tampered POST. Re-check
    // server-side: WFH is allowed only when (a) HR has announced a
    // company-wide WFH for today, OR (b) this employee has an approved
    // personal request covering today.
    if (payload.type === 'wfh') {
        const eligibility = await checkWfhEligibility(employeeId, bangkokTodayIso())
        if (!eligibility.allowed) {
            return {
                error: 'วันนี้ยังไม่ได้รับอนุมัติให้ WFH — กรุณาส่งคำขอ WFH ผ่าน /portal/wfh ก่อน',
            }
        }
    }

    // ── Time window: 6:00 → end of day (Bangkok) ─────────────────────────
    // Vercel serverless runs in UTC — shift +7h then read as UTC to get
    // the Bangkok wall clock without depending on the process timezone.
    //
    // Pre-04 May: hard-blocked past 09:30 (refused fallback for the very
    // case Mod surfaced in the audit — employee forgets card tap and can't
    // recover via web).
    // Pre-08 May: window was 07:00 → end-of-day. Mod reported some staff
    // arrive before 7:00 (early-shift / customs office) and got blocked
    // — pushed start to 06:00. Anti-trick concern is small at 6 AM (no
    // one legitimately checks in before sunrise except known shifts) and
    // the late_minutes column still records the exact punch time so HR
    // can spot anomalies post-hoc.
    const nowBkk = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const minutesOfDay = nowBkk.getUTCHours() * 60 + nowBkk.getUTCMinutes()
    const START_TIME = 6 * 60       // 6:00 = 360 minutes
    if (minutesOfDay < START_TIME) {
        return { error: 'เช็คอินได้ตั้งแต่ 6:00 น. เป็นต้นไป' }
    }
    // Compute lateness for record-keeping (NULL when on time).
    const lateMinutesRaw = minutesOfDay - OFFICIAL_START_MIN
    const lateMinutes = lateMinutesRaw > 0 ? lateMinutesRaw : null

    // Validate late-reason input. Tier 1 (1-30 min): optional.
    // Tier 2/3: still optional in the API (UI prompts but doesn't block —
    // forcing a reason just teaches employees to type "...") but if
    // provided, sanitize to fit the column.
    const trimmedLateReason = (payload.lateReason ?? '').trim().slice(0, 500) || null

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
            late_minutes: lateMinutes,
            late_reason: lateMinutes !== null ? trimmedLateReason : null,
        })
        .select('id, checked_in_at, type')
        .single()

    if (error) {
        console.error('checkIn error:', error)
        return { error: error.message }
    }

    // ── Tier 3: ping the direct manager when arrival > 60 min late ────────
    // Best-effort fan-out — failure to notify must NOT roll back the
    // check-in. The check-in itself is the source of truth; the
    // notification is just a heads-up.
    if (lateMinutes !== null && lateMinutes > LATE_TIER3_MIN) {
        try {
            const approver = await resolveLeaveApprover(employeeId)
            const approverUserId = approver
                ? await getEmployeeUserId(approver.id)
                : null
            if (approverUserId) {
                // Look up the late employee's display name for the title.
                const { data: emp } = await supabaseAdmin
                    .from('employees')
                    .select('first_name_th, nickname')
                    .eq('id', employeeId)
                    .maybeSingle()
                const empName = emp?.nickname?.trim()
                    || (emp?.first_name_th ?? '').trim()
                    || 'พนักงาน'
                const arrivalH = String(nowBkk.getUTCHours()).padStart(2, '0')
                const arrivalM = String(nowBkk.getUTCMinutes()).padStart(2, '0')
                await createNotification({
                    recipient_user_id: approverUserId,
                    type: 'late_checkin_alert',
                    title: `${empName} เช็คอินสาย ${lateMinutes} นาที`,
                    body: trimmedLateReason
                        ? `เวลาเช็คอิน ${arrivalH}:${arrivalM} · เหตุผล: ${trimmedLateReason}`
                        : `เวลาเช็คอิน ${arrivalH}:${arrivalM} · ไม่ได้ระบุเหตุผล`,
                    color: 'red',
                    icon: 'AlertTriangle',
                    entity_type: 'checkin',
                    entity_id: data.id,
                    action_url: '/hradmin/attendance',
                })
            }
        } catch (e) {
            console.error('[checkin] tier-3 manager notify failed (non-blocking):', e)
        }
    }

    revalidatePath('/portal/checkin')
    return {
        success: true,
        id: data.id,
        type: data.type,
        checked_in_at: data.checked_in_at,
        distance_meters: distance !== null ? Math.round(distance) : null,
        late_minutes: lateMinutes,
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
