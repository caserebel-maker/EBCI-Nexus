import { isWorkingDateByCalendar } from './saturday-rules'

/** Date-only helpers for leave day counting. */
export function toEpochDay(date: string): number {
    if (!date || typeof date !== 'string') return NaN
    const [year, month, day] = date.split('-').map(Number)
    if (!year || !month || !day) return NaN
    return Date.UTC(year, month - 1, day) / 86400000
}

function epochDayToDateKey(epochDay: number): string | null {
    if (!Number.isFinite(epochDay)) return null
    const dateObj = new Date(epochDay * 86400000)
    if (isNaN(dateObj.getTime())) return null
    const y = dateObj.getUTCFullYear()
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
    const d = String(dateObj.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

export function isWeekendEpochDay(epochDay: number): boolean {
    const dateKey = epochDayToDateKey(epochDay)
    if (!dateKey) return true
    return !isWorkingDateByCalendar(dateKey)
}

/**
 * Count working days inclusive between start and end, taking into account:
 * - Saturday rules (1st & 3rd Saturday are workdays, 2nd, 4th, 5th Saturday are holidays)
 * - Sunday is always a non-working weekend
 * - Company calendar DB overrides (e.g. 25 July 2026 set to 'work' or 'wfh', or Mon-Fri set to holiday)
 */
export function calculateWorkingLeaveDays(
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
    holidaysMap?: Map<string, string> | Record<string, string>,
): number {
    if (isHalfDay) return 0.5
    const start = toEpochDay(startDate)
    const end = toEpochDay(endDate)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0

    let count = 0
    for (let day = start; day <= end; day += 1) {
        const dateKey = epochDayToDateKey(day)
        if (!dateKey) continue

        let holidayType: string | undefined = undefined
        if (holidaysMap) {
            if (holidaysMap instanceof Map) {
                holidayType = holidaysMap.get(dateKey)
            } else if (typeof holidaysMap === 'object' && holidaysMap !== null) {
                holidayType = (holidaysMap as Record<string, string>)[dateKey]
            }
        }

        if (isWorkingDateByCalendar(dateKey, holidayType)) {
            count += 1
        }
    }
    return count
}
