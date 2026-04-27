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

/**
 * Bangkok-local YYYY-MM-DD key for grouping. Use this whenever you'd
 * normally `string.slice(0, 10)` on an ISO timestamp — that produces
 * the UTC date, which is off by one day for events between 17:00-24:00
 * UTC (= 00:00-07:00 the next day in Bangkok).
 *
 * Example:
 *   raw = "2026-04-24T19:00:00"  (UTC wall-clock = 02:00 Bangkok next day)
 *   slice(0,10)         → "2026-04-24"  ❌
 *   bangkokDateKey()    → "2026-04-25"  ✓
 */
export function bangkokDateKey(
    raw: string | null | undefined,
    source: 'utc' | 'bangkok' = 'utc',
): string | null {
    const d = toDate(raw, source)
    if (!d) return null
    // Build YYYY-MM-DD from Bangkok-zoned parts. Intl.DateTimeFormat with
    // the right timeZone gives us the calendar date as Bangkok sees it.
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: BANGKOK_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(d)
    const y = parts.find(p => p.type === 'year')?.value
    const m = parts.find(p => p.type === 'month')?.value
    const day = parts.find(p => p.type === 'day')?.value
    if (!y || !m || !day) return null
    return `${y}-${m}-${day}`
}

/**
 * Today's Bangkok-local YYYY-MM-DD. Use this whenever you'd reach
 * for `new Date().toISOString().slice(0, 10)` — that returns the UTC
 * date, off by one for night users in Bangkok (00:00–06:59 UTC+7).
 *
 * Safe on the server and in the client.
 */
export function todayBangkokKey(): string {
    return bangkokDateKey(new Date().toISOString(), 'utc') ?? ''
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
