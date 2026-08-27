import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { bangkokTodayIso } from '@/lib/leave-validations'
import type { CardScanTodayInfo } from '@/lib/card-scan-shared'

/**
 * Smart office check-in suppression — Phase 1 of §3.1 BETA_FEEDBACK.
 *
 * If the employee tapped their card at the office today, we already
 * have their attendance via card_scans (HIP Ci100S → CSV import or
 * future webhook). Showing the in-app check-in CTA on top of that is
 * pure noise — they don't need to "check in" twice.
 *
 * This helper looks up TODAY's card_scans for one employee and returns
 * a small summary the check-in page uses to swap the CTA for an
 * acknowledgement banner ("บัตรของคุณ scan แล้ว 08:35"). Returns null
 * when no scan exists yet — the page falls through to the normal CTA
 * with a tip explaining the card-import lag.
 *
 * Latency note: card_scans is currently populated by manual CSV
 * import (HR clicks "ดาวน์โหลดอัตโนมัติ" in HIP software → CSV →
 * /hradmin/attendance/import). Until realtime sync ships (Tuesday
 * office visit will confirm whether HIP Ci100S supports HTTP push to
 * /api/webhooks/card-scan), today's scans only appear AFTER HR
 * imports the file. The page surface accounts for this by showing a
 * gentle tip on the no-scan path.
 *
 * scan_time is stored as Bangkok wall-clock (per existing reconcile
 * comments in src/app/hradmin/attendance/reconcile/actions.ts) — we
 * compare directly against bangkokTodayIso() without timezone math.
 *
 * The `CardScanTodayInfo` type and `formatScanClock` helper live in
 * `./card-scan-shared.ts` so client components can import them
 * without dragging supabaseAdmin / 'server-only' into the browser
 * bundle (Next.js 16 Turbopack enforces this strictly).
 */

export async function getCardScanTodayInfo(
    employeeId: string,
): Promise<CardScanTodayInfo | null> {
    if (!employeeId) return null
    const today = bangkokTodayIso()
    const dayStart = `${today}T00:00:00`
    const dayEnd = `${today}T23:59:59.999`

    const { data, error } = await supabaseAdmin
        .from('card_scans')
        .select('scan_time, scan_type')
        .eq('employee_id', employeeId)
        .gte('scan_time', dayStart)
        .lte('scan_time', dayEnd)
        .order('scan_time', { ascending: true })

    if (error) {
        console.error('[card-scan-today] lookup error:', error)
        return null
    }
    if (!data || data.length === 0) return null

    const scans = data as Array<{ scan_time: string; scan_type: string | null }>
    const latestScan = scans[scans.length - 1]
    const latestTimePart = (latestScan.scan_time.split('T')[1] || '').trim()
    const isLatestAfter1630 = latestTimePart >= '16:30:00'
    const latestScanType = (latestScan.scan_type as 'in' | 'out' | null) ?? (isLatestAfter1630 ? 'out' : null)
    const hasCheckedOut = isLatestAfter1630 || scans.some(s => {
        const t = (s.scan_time.split('T')[1] || '').trim()
        return t >= '16:30:00' || s.scan_type === 'out'
    })

    return {
        earliestScanTime: scans[0].scan_time,
        latestScanTime:   scans[scans.length - 1].scan_time,
        scanCount:        scans.length,
        earliestScanType: (scans[0].scan_type as 'in' | 'out' | null) ?? 'in',
        latestScanType,
        hasCheckedOut,
        scans: scans.map(s => {
            const t = (s.scan_time.split('T')[1] || '').trim()
            const sType = (s.scan_type as 'in' | 'out' | null) ?? (t >= '16:30:00' ? 'out' : 'in')
            return {
                scanTime: s.scan_time,
                scanType: sType,
            }
        }),
    }
}
