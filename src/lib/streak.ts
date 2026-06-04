import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { bangkokTodayIso } from '@/lib/leave-validations'
import { WORK_SCHEDULE } from '@/lib/leave-constants'
import {
    type StreakInfo, type StreakResetEvent, type StreakResetType,
    pickCurrentTier, pickNextTier, splitMonthsAndDays,
} from '@/lib/streak-shared'

/**
 * §2.3 BETA_FEEDBACK — Attendance streak meter (server compute).
 *
 * Goal: show "X เดือน Y วัน ติดต่อกัน — ไม่ลาป่วย ไม่ลากิจ ไม่สาย"
 * on /portal/profile and crown the rewards (3/6/9/12 เดือน) the
 * employee has earned.
 *
 * Reset rules (default — configurable later):
 *   ✅ Reset on:
 *      - approved sick leave (any duration)
 *      - approved personal leave (any duration)
 *      - late check-in / scan (clock-in time of day > 08:00 Bangkok)
 *   ❌ Don't reset on:
 *      - approved annual / maternity / military / training / ordination
 *        / marriage / bereavement / sterilization (they're entitlements,
 *        not "ขาดงาน")
 *      - holidays / weekends (no expectation to work)
 *      - "absent" (no check-in on a workday) — DEFERRED to v2 because
 *        we don't yet have a reliable absent aggregator (NEXT.md §3.11)
 *
 * Algorithm:
 *   1. Find the most recent reset event since employee.start_date
 *   2. streak_start = max(employee.start_date, last_reset_date + 1)
 *   3. streak_days = today - streak_start
 *   4. Convert to months + days, pick current/next tier
 */

const RESET_LEAVE_TYPES = ['sick', 'personal']

/** Late = check-in time (HH:MM) strictly later than this. Pulled from
 *  WORK_SCHEDULE.fullDayStart so a future config change cascades. */
function getLateCutoff(): { h: number; m: number } {
    const [h, m] = WORK_SCHEDULE.fullDayStart.split(':').map(Number)
    return { h: h ?? 8, m: m ?? 30 }
}

/** Bangkok wall-clock check: is the time of day in `iso` later than the
 *  cutoff? `iso` is treated as Bangkok local (matches how we store
 *  scan_time + check_in elsewhere — see card-scan-today.ts). */
function isLateBangkok(iso: string, cutoff: { h: number; m: number }): boolean {
    const m = /T(\d{2}):(\d{2})/.exec(iso)
    if (!m) return false
    const h = parseInt(m[1], 10)
    const min = parseInt(m[2], 10)
    if (h > cutoff.h) return true
    if (h === cutoff.h && min > cutoff.m) return true
    return false
}

/** "YYYY-MM-DD" + 1 day → "YYYY-MM-DD". */
function nextDayIso(iso: string): string {
    const d = new Date(iso + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().slice(0, 10)
}

/** Days between two YYYY-MM-DD strings (b - a, inclusive of both ends → +1). */
function daysBetween(a: string, b: string): number {
    const dA = new Date(a + 'T00:00:00Z').getTime()
    const dB = new Date(b + 'T00:00:00Z').getTime()
    return Math.max(0, Math.floor((dB - dA) / 86_400_000))
}

/**
 * Find the most recent sick/personal leave that's "approved" and
 * actually started (start_date <= today). We treat the leave's last
 * day (end_date) as the reset point — streak resumes the day after.
 */
async function findLatestStreakBreakingLeave(employeeId: string, sinceDate: string):
    Promise<{ date: string; type: StreakResetType; label: string } | null>
{
    const today = bangkokTodayIso()
    const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .select('end_date, leave_type_id')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .in('leave_type_id', RESET_LEAVE_TYPES)
        .gte('end_date', sinceDate)
        .lte('end_date', today)
        .order('end_date', { ascending: false })
        .limit(1)
    if (error) {
        console.error('[streak] leave lookup error:', error)
        return null
    }
    const row = (data ?? [])[0] as { end_date: string; leave_type_id: string } | undefined
    if (!row) return null
    return {
        date: row.end_date,
        type: row.leave_type_id === 'sick' ? 'sick_leave' : 'personal_leave',
        label: row.leave_type_id === 'sick' ? 'ลาป่วย' : 'ลากิจ',
    }
}

/**
 * Find the most recent late check-in or card scan since `sinceDate`.
 * We union both sources because some employees use the mobile app
 * and some tap the office card — both should reset the streak if
 * either was late.
 */
async function findLatestLateCheckin(employeeId: string, sinceDate: string):
    Promise<{ date: string; iso: string } | null>
{
    const cutoff = getLateCutoff()
    const today = bangkokTodayIso()

    // Mobile checkins: type='office' (WFH/field don't have a fixed
    // start time we can rule on). Pull recent ones, filter in JS for
    // late — Postgres can't do "extract time-of-day > X" easily.
    const { data: mobileRaw } = await supabaseAdmin
        .from('checkins')
        .select('checked_in_at, type')
        .eq('employee_id', employeeId)
        .eq('type', 'office')
        .gte('checked_in_at', `${sinceDate}T00:00:00`)
        .lte('checked_in_at', `${today}T23:59:59`)
        .order('checked_in_at', { ascending: false })
        .limit(200)
    const mobile = (mobileRaw ?? []) as Array<{ checked_in_at: string }>

    // Card scans: only consider the FIRST scan of each day (employee
    // could scan in then out — only the in-scan is "arrival time").
    const { data: scanRaw } = await supabaseAdmin
        .from('card_scans')
        .select('scan_time')
        .eq('employee_id', employeeId)
        .gte('scan_time', `${sinceDate}T00:00:00`)
        .lte('scan_time', `${today}T23:59:59`)
        .order('scan_time', { ascending: true })
        .limit(2000)
    const scans = (scanRaw ?? []) as Array<{ scan_time: string }>

    // Group scans by date, keep earliest per day
    const earliestPerDay = new Map<string, string>()
    for (const s of scans) {
        const date = s.scan_time.slice(0, 10)
        if (!earliestPerDay.has(date)) earliestPerDay.set(date, s.scan_time)
    }

    // Combine candidates: mobile arrivals + earliest-per-day scans.
    const candidates: Array<{ date: string; iso: string }> = []
    for (const m of mobile) {
        candidates.push({ date: m.checked_in_at.slice(0, 10), iso: m.checked_in_at })
    }
    for (const [date, iso] of earliestPerDay) {
        candidates.push({ date, iso })
    }

    // Find latest late one. Sort descending by date, return first that
    // crosses cutoff. (We can't pre-filter at DB level — see comment above.)
    candidates.sort((a, b) => b.date.localeCompare(a.date))
    for (const c of candidates) {
        if (isLateBangkok(c.iso, cutoff)) return c
    }
    return null
}

/**
 * Compute the streak info for one employee.
 * Returns sensible defaults (zero streak, no events) when employee
 * isn't found or has no start_date — UI should still render gracefully.
 */
export async function getStreakInfo(employeeId: string): Promise<StreakInfo> {
    const today = bangkokTodayIso()

    // Employee start_date floors the streak — can't be longer than
    // tenure. New hires start with a fresh streak from day 1.
    //
    // employees.start_date is `timestamp without time zone` (legacy;
    // should arguably be DATE), so Postgrest hands it back as
    // "YYYY-MM-DD HH:MM:SS" with a SPACE — not the ISO "T" separator
    // that `new Date(...)` likes. Slice the first 10 chars so every
    // downstream consumer (daysBetween, the UI's toLocaleDateString)
    // gets a clean YYYY-MM-DD. Without this slice we get NaN months
    // and "Invalid Date" in the StreakCard footnote (Mod's 4 May
    // screenshot).
    const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('start_date')
        .eq('id', employeeId)
        .maybeSingle()
    const rawStart = (emp as { start_date: string | null } | null)?.start_date
    const startDate = rawStart ? rawStart.slice(0, 10) : today

    // Look back from the employee's start_date for any reset event.
    // (We never look further back than start_date because anything
    // before that is pre-employment and irrelevant.)
    const [leaveBreak, lateBreak] = await Promise.all([
        findLatestStreakBreakingLeave(employeeId, startDate),
        findLatestLateCheckin(employeeId, startDate),
    ])

    // Pick the more recent of the two events as the reset point.
    let lastResetEvent: StreakResetEvent | null = null
    if (leaveBreak && lateBreak) {
        lastResetEvent = leaveBreak.date >= lateBreak.date
            ? { type: leaveBreak.type, date: leaveBreak.date, label: leaveBreak.label }
            : { type: 'late_checkin', date: lateBreak.date,
                label: `มาสาย ${lateBreak.iso.slice(11, 16)}` }
    } else if (leaveBreak) {
        lastResetEvent = { type: leaveBreak.type, date: leaveBreak.date, label: leaveBreak.label }
    } else if (lateBreak) {
        lastResetEvent = { type: 'late_checkin', date: lateBreak.date,
            label: `มาสาย ${lateBreak.iso.slice(11, 16)}` }
    }

    const streakStart = lastResetEvent
        ? nextDayIso(lastResetEvent.date)
        : startDate

    // If the reset event is in the future for some reason (shouldn't
    // happen but guard against bad data), or streak start is after today,
    // the streak is 0.
    const totalDays = streakStart > today ? 0 : daysBetween(streakStart, today)
    const { months, days } = splitMonthsAndDays(totalDays)

    const currentTier = pickCurrentTier(months)
    const nextTier = pickNextTier(months)
    const daysToNextTier = nextTier ? Math.max(0, nextTier.months * 30 - totalDays) : 0

    return {
        months, days, totalDays,
        startedOn: streakStart,
        currentTier, nextTier, daysToNextTier,
        lastResetEvent,
    }
}
