/**
 * Safe URL helpers — defense-in-depth against XSS via injected URLs.
 *
 * These guards exist because notification rows + redirect params are
 * stored in places (DB, query strings) that could in principle be
 * tampered with — even though every WRITE path in the app is server-
 * controlled today. If an action_url ever leaked from a less-trusted
 * source, `router.push("javascript:alert(1)")` would still execute
 * inline JS on click. The fix is to validate before navigating.
 */

/**
 * True when `value` is an internal path safe to hand to Next's
 * `router.push()` or set on `<Link href>`. Accepts:
 *   - paths starting with a single `/`
 *   - optional querystring + hash
 *
 * Rejects:
 *   - `javascript:`, `data:`, `vbscript:`, etc. — anything with a scheme
 *   - protocol-relative `//evil.com/...` (would leave the site)
 *   - bare `relative/path` (could be relative to anywhere)
 *   - empty / non-string
 */
export function isInternalPath(value: unknown): value is string {
    if (typeof value !== 'string') return false
    if (!value.startsWith('/')) return false
    if (value.startsWith('//')) return false
    return true
}

/**
 * Normalize a candidate path to a guaranteed-internal one, or return
 * `null` if it's unsafe. Use this when the candidate is allowed to be
 * absent (and the caller has its own fallback) — `null` lets the caller
 * decide whether to skip navigation or substitute a default.
 */
export function toInternalPath(value: unknown): string | null {
    return isInternalPath(value) ? value : null
}
