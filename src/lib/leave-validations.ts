import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { LeaveType } from '@/lib/leave-balance'
import { computeRemaining, type LeaveBalanceRow } from '@/lib/leave-balance'

export interface ValidateLeaveArgs {
    leaveType: LeaveType
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
    isHalfDay: boolean
    hasAttachment: boolean
    balance: LeaveBalanceRow | null
    employeeId: string
    todayBangkokIso: string // YYYY-MM-DD in Bangkok
}

export type ValidationResult =
    | { ok: true; totalDays: number }
    | { ok: false; field?: string; error: string }

// ── Date helpers ───────────────────────────────────────────────────────────
/** parses YYYY-MM-DD as an arithmetic epoch-day to avoid timezone surprises */
function toEpochDay(d: string): number {
    const [y, m, day] = d.split('-').map(Number)
    if (!y || !m || !day) return NaN
    return Date.UTC(y, m - 1, day) / 86400000
}

/**
 * Count calendar days inclusive between start and end.
 * Weekends are *included* (spec note: "รวมเสาร์-อาทิตย์ด้วยตามค่า default").
 * Half-day short-circuits to 0.5 regardless of range (UI restricts to 1 day).
 */
export function calculateLeaveDays(
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
): number {
    if (isHalfDay) return 0.5
    const s = toEpochDay(startDate)
    const e = toEpochDay(endDate)
    if (!Number.isFinite(s) || !Number.isFinite(e)) return 0
    return Math.max(1, e - s + 1)
}

// ── Overlap check ──────────────────────────────────────────────────────────
/**
 * True if there is another active (pending | approved) leave whose
 * date range overlaps with [startDate, endDate] for the same
 * employee. Callers pass `ignoreRequestId` when editing an existing
 * request so it doesn't clash with itself.
 */
export async function hasOverlappingLeave(args: {
    employeeId: string
    startDate: string
    endDate: string
    ignoreRequestId?: string
}): Promise<boolean> {
    let q = supabaseAdmin
        .from('leave_requests')
        .select('id, start_date, end_date, status')
        .eq('employee_id', args.employeeId)
        .in('status', ['pending', 'approved'])
        // existing.start_date <= new.end_date AND existing.end_date >= new.start_date
        .lte('start_date', args.endDate)
        .gte('end_date', args.startDate)
    if (args.ignoreRequestId) q = q.neq('id', args.ignoreRequestId)
    const { data, error } = await q.limit(1)
    if (error) {
        console.error('[leave-validations] overlap query failed:', error)
        return false // fail-open so a db hiccup doesn't block legitimate leaves
    }
    return (data ?? []).length > 0
}

// ── Main validator ─────────────────────────────────────────────────────────
/**
 * Enforces the 7 leave-request rules from the spec:
 *   1. start_date <= end_date
 *   2. not in the past (except sick-leave, which *must* be past)
 *   3. advance_notice_days on leave_type (e.g. annual ≥ 7 days ahead)
 *   4. same_day_allowed gate (sick leave rejects today onwards)
 *   5. requires_attachment
 *   6. total_days ≤ remaining (unless leave_type is unlimited)
 *   7. no overlap with another active leave
 *
 * Returns totalDays on success so callers don't re-compute.
 */
export async function validateLeaveRequest(
    args: ValidateLeaveArgs,
): Promise<ValidationResult> {
    const {
        leaveType, startDate, endDate, isHalfDay,
        hasAttachment, balance, employeeId, todayBangkokIso,
    } = args

    if (!startDate || !endDate) {
        return { ok: false, field: 'date', error: 'กรุณาเลือกวันที่ลา' }
    }

    const startEpoch = toEpochDay(startDate)
    const endEpoch = toEpochDay(endDate)
    const todayEpoch = toEpochDay(todayBangkokIso)

    if (!Number.isFinite(startEpoch) || !Number.isFinite(endEpoch)) {
        return { ok: false, field: 'date', error: 'รูปแบบวันที่ไม่ถูกต้อง' }
    }

    // Rule 1 — chronological
    if (startEpoch > endEpoch) {
        return { ok: false, field: 'date', error: 'วันที่เริ่มต้องมาก่อนหรือเท่ากับวันที่สิ้นสุด' }
    }

    const sameDayAllowed = leaveType.same_day_allowed !== false
    const advanceDays = leaveType.advance_notice_days ?? 0

    // Rule 4 — sick leave is retroactive only; spec wording:
    // "ลาป่วยต้องเป็นวันที่ผ่านไปแล้ว" → start_date must be strictly in the past.
    if (leaveType.id === 'sick') {
        if (startEpoch >= todayEpoch) {
            return {
                ok: false,
                field: 'date',
                error: 'ลาป่วยต้องเป็นวันที่ผ่านไปแล้ว — ยื่นในวันนี้หรือล่วงหน้าไม่ได้',
            }
        }
    } else {
        // Rule 2 — non-sick leave must start today or later
        if (startEpoch < todayEpoch) {
            return { ok: false, field: 'date', error: 'ไม่สามารถยื่นลาย้อนหลังได้' }
        }
        // Rule 4 — same_day_allowed = false (non-sick) means can't start today
        if (!sameDayAllowed && startEpoch === todayEpoch) {
            return {
                ok: false,
                field: 'date',
                error: 'ประเภทนี้ไม่อนุญาตให้ยื่นลาในวันเดียวกัน',
            }
        }
        // Rule 3 — advance notice (e.g. annual needs ≥7 days)
        if (advanceDays > 0 && startEpoch - todayEpoch < advanceDays) {
            return {
                ok: false,
                field: 'date',
                error: `ต้องขอล่วงหน้าอย่างน้อย ${advanceDays} วัน (${leaveType.name_th})`,
            }
        }
    }

    // Rule 5 — required attachment
    if (leaveType.requires_attachment && !hasAttachment) {
        const note = leaveType.attachment_description
            ? ` — ${leaveType.attachment_description}`
            : ''
        return {
            ok: false,
            field: 'attachment',
            error: `ประเภทนี้ต้องแนบเอกสารประกอบ${note}`,
        }
    }

    const totalDays = calculateLeaveDays(startDate, endDate, isHalfDay)

    // Rule 6 — balance (skip for unlimited types)
    if (!leaveType.is_unlimited) {
        const remaining = computeRemaining(balance)
        if (totalDays > remaining) {
            return {
                ok: false,
                field: 'days',
                error: `วันลาไม่พอ — คงเหลือ ${remaining} วัน · ขอ ${totalDays} วัน`,
            }
        }
    }

    // Rule 7 — overlap
    const overlap = await hasOverlappingLeave({
        employeeId, startDate, endDate,
    })
    if (overlap) {
        return {
            ok: false,
            field: 'date',
            error: 'ช่วงวันที่นี้ทับซ้อนกับใบลาอื่นที่กำลังรออนุมัติหรือได้รับอนุมัติแล้ว',
        }
    }

    return { ok: true, totalDays }
}

/** Bangkok-local YYYY-MM-DD for "today". Uses UTC+7 shift so it's stable on Vercel. */
export function bangkokTodayIso(): string {
    const now = new Date()
    const bkk = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    return bkk.toISOString().slice(0, 10)
}
