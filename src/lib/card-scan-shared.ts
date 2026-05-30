/**
 * Client-safe types + pure helpers for the card-scan suppression
 * banner on /portal/checkin (§3.1 BETA_FEEDBACK Phase 1A).
 *
 * Lives in its own file (no `server-only` import) so the client
 * component bundle can pull in the type and the format helper
 * without dragging supabaseAdmin into the browser. The server-side
 * lookup function lives in `./card-scan-today.ts`.
 */

export interface CardScanTodayInfo {
    /** Earliest scan today — drives the "scan แล้วเวลา XX:XX" banner. */
    earliestScanTime: string  // ISO without tz, Bangkok wall-clock
    /** Latest scan today — useful when employee has scanned out at end of day. */
    latestScanTime: string
    /** Total scans today (in + out + any extras). */
    scanCount: number
    /** Earliest scan_type when set ('in'|'out'|null). */
    earliestScanType: 'in' | 'out' | null
    /** All scans today. */
    scans?: Array<{ scanTime: string; scanType: 'in' | 'out' | null }>
}

/**
 * Format `2026-05-02T08:35:14` → `08:35`. Bangkok wall-clock string,
 * no timezone math because the stored value is already local. Falls
 * back to the raw input on bad shape.
 */
export function formatScanClock(iso: string): string {
    const m = /T(\d{2}):(\d{2})/.exec(iso)
    if (!m) return iso
    return `${m[1]}:${m[2]}`
}
