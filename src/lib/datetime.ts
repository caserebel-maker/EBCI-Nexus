/**
 * Timezone-aware formatting for EBCI Nexus.
 *
 * Background: our tables use `timestamp without time zone`. Two
 * separate conventions exist for what the stored naive value means:
 *
 *   1. "utc" — inserted via `new Date().toISOString()` from Node, so
 *      the naive value represents a UTC wall-clock.
 *      Tables: checkins.checked_in_at / .checked_out_at, all Supabase
 *      timestamptz-equivalent fields returned without the 'Z' suffix,
 *      etc.
 *
 *   2. "bangkok" — stored raw in local wall-clock, because the source
 *      data is a Thai-local clock (e.g. CSV exported from the card
 *      reader at the office).
 *      Tables: card_scans.scan_time.
 *
 * Both conventions get handed back to the client as an ISO-ish string
 * without a timezone suffix. If you pass that to `new Date()`
 * directly, the browser parses it as *local* time, which silently
 * returns the wrong instant on any non-Bangkok machine (Vercel
 * runs in UTC). These helpers make the intent explicit.
 */

const BANGKOK_TZ = 'Asia/Bangkok'

/** Normalize the stored value into an ISO string suffixed with the right offset. */
function toIsoWithOffset(
    raw: string,
    source: 'utc' | 'bangkok',
): string {
    let s = raw.trim()
    // postgres often returns "2026-04-21 08:03:00" — swap to T separator
    if (!s.includes('T')) s = s.replace(' ', 'T')
    // If an offset or Z already exists, respect it.
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) return s
    // Otherwise append the right suffix for the source convention
    return source === 'utc' ? `${s}Z` : `${s}+07:00`
}

/**
 * Parse a stored naive timestamp into a correct Date.
 * Returns null if the input is empty or unparsable.
 */
export function toDate(
    raw: string | null | undefined,
    source: 'utc' | 'bangkok' = 'utc',
): Date | null {
    if (!raw) return null
    const iso = toIsoWithOffset(raw, source)
    const d = new Date(iso)
    return isNaN(d.getTime()) ? null : d
}

/** Format a stored timestamp as Bangkok wall-clock time "HH:mm". */
export function formatBangkokTime(
    raw: string | null | undefined,
    source: 'utc' | 'bangkok' = 'utc',
): string {
    const d = toDate(raw, source)
    if (!d) return '—'
    return new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: BANGKOK_TZ,
    }).format(d)
}

/** Format a stored timestamp as Bangkok "HH:mm:ss". */
export function formatBangkokTimeWithSeconds(
    raw: string | null | undefined,
    source: 'utc' | 'bangkok' = 'utc',
): string {
    const d = toDate(raw, source)
    if (!d) return '—'
    return new Intl.DateTimeFormat('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: BANGKOK_TZ,
    }).format(d)
}

/** Format a stored timestamp as a Thai "21 เม.ย. 2569 · 08:03". */
export function formatBangkokDateTime(
    raw: string | null | undefined,
    source: 'utc' | 'bangkok' = 'utc',
): string {
    const d = toDate(raw, source)
    if (!d) return '—'
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: BANGKOK_TZ,
    }).format(d)
}
