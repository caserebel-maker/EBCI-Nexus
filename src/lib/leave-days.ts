/** Date-only helpers for leave day counting. */
export function toEpochDay(date: string): number {
    const [year, month, day] = date.split('-').map(Number)
    if (!year || !month || !day) return NaN
    return Date.UTC(year, month - 1, day) / 86400000
}

export function isWeekendEpochDay(epochDay: number): boolean {
    // 1970-01-01 was Thursday. 0 = Sunday, 6 = Saturday.
    const dayOfWeek = (epochDay + 4) % 7
    return dayOfWeek === 0 || dayOfWeek === 6
}

/**
 * Count working days inclusive between start and end, excluding Saturday/Sunday.
 * Half-day leaves always count as 0.5 and should be restricted to one date by UI/API.
 */
export function calculateWorkingLeaveDays(
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
): number {
    if (isHalfDay) return 0.5
    const start = toEpochDay(startDate)
    const end = toEpochDay(endDate)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0

    let count = 0
    for (let day = start; day <= end; day += 1) {
        if (!isWeekendEpochDay(day)) count += 1
    }
    return count
}
