import 'server-only'

import { bangkokDateKey, formatBangkokTime } from '@/lib/datetime'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type EmployeeCardAttendanceDay = {
    date: string
    firstScan: string
    lastScan: string
    scanCount: number
    inCount: number
    outCount: number
    scanTimes: string[]
}

export type EmployeeCardAttendanceMonth = {
    month: string
    days: EmployeeCardAttendanceDay[]
    scanCount: number
}

type CardScanRow = {
    scan_time: string
    scan_type: string | null
}

/**
 * Raw HIP card taps, grouped for the employee profile. Card-reader values are
 * Bangkok wall-clock timestamps, so they must not be parsed as UTC here.
 */
export async function getEmployeeCardAttendanceHistory(
    employeeId: string,
): Promise<EmployeeCardAttendanceMonth[]> {
    const { data, error } = await supabaseAdmin
        .from('card_scans')
        .select('scan_time, scan_type')
        .eq('employee_id', employeeId)
        .order('scan_time', { ascending: false })

    if (error) throw new Error(error.message)

    const daysByKey = new Map<string, EmployeeCardAttendanceDay>()
    for (const row of (data ?? []) as CardScanRow[]) {
        const date = bangkokDateKey(row.scan_time, 'bangkok')
        if (!date) continue

        const existing = daysByKey.get(date) ?? {
            date,
            firstScan: row.scan_time,
            lastScan: row.scan_time,
            scanCount: 0,
            inCount: 0,
            outCount: 0,
            scanTimes: [],
        }

        existing.scanCount += 1
        existing.scanTimes.push(formatBangkokTime(row.scan_time, 'bangkok'))
        if (row.scan_time < existing.firstScan) existing.firstScan = row.scan_time
        if (row.scan_time > existing.lastScan) existing.lastScan = row.scan_time

        // Older HIP imports may not classify the tap. Keep those in the total
        // rather than guessing their direction.
        if (row.scan_type === 'in') existing.inCount += 1
        if (row.scan_type === 'out') existing.outCount += 1
        daysByKey.set(date, existing)
    }

    const monthsByKey = new Map<string, EmployeeCardAttendanceMonth>()
    for (const day of daysByKey.values()) {
        day.scanTimes.sort()
        const month = day.date.slice(0, 7)
        const existing = monthsByKey.get(month) ?? { month, days: [], scanCount: 0 }
        existing.days.push(day)
        existing.scanCount += day.scanCount
        monthsByKey.set(month, existing)
    }

    return Array.from(monthsByKey.values())
        .map(month => ({
            ...month,
            days: month.days.sort((a, b) => b.date.localeCompare(a.date)),
        }))
        .sort((a, b) => b.month.localeCompare(a.month))
}
