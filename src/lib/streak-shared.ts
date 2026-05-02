/**
 * §2.3 BETA_FEEDBACK — Attendance streak meter (client-safe types).
 *
 * Lives in its own file (no `server-only`) so the React profile page
 * can import the type + tier helpers without dragging supabaseAdmin
 * into the browser bundle. Same split pattern as
 * `card-scan-shared.ts` ↔ `card-scan-today.ts` and
 * `comp-days-shared.ts` ↔ `comp-days.ts`.
 *
 * Server-side computation lives in `./streak.ts`.
 */

export interface StreakTier {
    months: number
    label: string
    /** Emoji used in the badge — matches the playful tone of the
     *  existing leave/category icons across the app. */
    emoji: string
}

/**
 * Reward thresholds (3 / 6 / 9 / 12 เดือน) — current company policy.
 * Hardcoded for now; if HR ever adds custom tiers we can move this
 * to a `streak_tiers` table.
 */
export const STREAK_TIERS: StreakTier[] = [
    { months: 3,  label: '3 เดือน',  emoji: '🥉' },
    { months: 6,  label: '6 เดือน',  emoji: '🥈' },
    { months: 9,  label: '9 เดือน',  emoji: '🥇' },
    { months: 12, label: '12 เดือน', emoji: '🏆' },
]

/**
 * Why a streak got reset (or not, if streak is fresh and never broken).
 * The label is human-readable Thai; type is the machine code so the UI
 * can decide tone (e.g. red border for late, amber for sick leave).
 */
export type StreakResetType =
    | 'sick_leave'
    | 'personal_leave'
    | 'late_checkin'
    | 'absent'   // not detected in v1 — included for future use

export interface StreakResetEvent {
    type: StreakResetType
    /** ISO date YYYY-MM-DD — the day the event happened. Streak
     *  resumes the next workday after this. */
    date: string
    /** Human-readable Thai label, e.g. "ลาป่วย" or "มาสาย 09:14". */
    label: string
}

export interface StreakInfo {
    /** Months continuous (truncated). 0 if streak is shorter than a month. */
    months: number
    /** Days remaining after subtracting full months. 0–30. */
    days: number
    /** Total days in the streak (months × ~30 + days). Used for fine
     *  granularity on the progress bar. */
    totalDays: number
    /** Date streak started — either day after the last reset event, or
     *  the employee's start_date if never reset. */
    startedOn: string
    /** Highest tier crossed (null if not yet 3 months). */
    currentTier: StreakTier | null
    /** Next tier to aim for (null if maxed out at 12 months). */
    nextTier: StreakTier | null
    /** Days remaining until nextTier (0 if next is null). */
    daysToNextTier: number
    /** What broke the previous streak (null if the employee has never
     *  had a reset event — fresh start). */
    lastResetEvent: StreakResetEvent | null
}

const DAYS_PER_MONTH = 30  // Approximation — same constant used by
                           // employee tenure display in profile page.

/** Convert raw days → { months, daysRemainder }. Used by both server
 *  computation and any future client-side "preview" display. */
export function splitMonthsAndDays(totalDays: number): { months: number; days: number } {
    const months = Math.floor(totalDays / DAYS_PER_MONTH)
    const days = totalDays - months * DAYS_PER_MONTH
    return { months, days }
}

/** Pick the tier the employee currently qualifies for (highest reached). */
export function pickCurrentTier(months: number): StreakTier | null {
    let current: StreakTier | null = null
    for (const tier of STREAK_TIERS) {
        if (months >= tier.months) current = tier
    }
    return current
}

/** Pick the next tier (smallest tier > months). Null when maxed. */
export function pickNextTier(months: number): StreakTier | null {
    return STREAK_TIERS.find(t => t.months > months) ?? null
}

export const STREAK_RESET_LABEL: Record<StreakResetType, string> = {
    sick_leave:     'ลาป่วย',
    personal_leave: 'ลากิจ',
    late_checkin:   'มาสาย',
    absent:         'ขาดงาน',
}
