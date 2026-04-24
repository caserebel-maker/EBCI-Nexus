/**
 * Employee-name display helpers.
 *
 * The `employees` table splits name into `first_name_th`, `last_name_th`
 * and `nickname` (plus `employee_code` as a secondary id). Callers
 * historically cherry-picked fields inline, resulting in inconsistent
 * formatting — some lists showed nickname-only, others the full name.
 *
 * These helpers normalize that:
 *
 *   formatEmployeeName(emp)  → "สุริยะ จันทร์วิภาสวงศ์ (ม๊อด)"
 *   employeeInitials(emp)    → "สม"    — for avatar fallback
 *
 * Both accept any object with the relevant fields present so they work
 * with either the snake_case DB rows or the camelCase client props.
 */

export interface NameSource {
    // Snake-case (matches Supabase row shape)
    first_name_th?: string | null
    last_name_th?: string | null

    // Camel-case (occasionally present on older props)
    firstName?: string | null
    lastName?: string | null

    // A concatenated full name, if the caller already has one prepared.
    fullName?: string | null

    // Always optional; rendered in parens when present.
    nickname?: string | null
}

const pick = <T,>(a: T | null | undefined, b: T | null | undefined): T | null => {
    if (a !== undefined && a !== null) return a
    if (b !== undefined && b !== null) return b
    return null
}

/**
 * Format a name string for list rows and headers.
 *
 *   • If `fullName` is provided it's used verbatim.
 *   • Otherwise first + last are joined with a space, trimmed, empty
 *     parts dropped.
 *   • If `nickname` is present it's appended as "(nick)".
 *   • When all fields are missing returns `fallback` (default "—").
 *
 * Safe on the server and in the client.
 */
export function formatEmployeeName(
    emp: NameSource | null | undefined,
    fallback = '—',
): string {
    if (!emp) return fallback
    const first = pick(emp.first_name_th, emp.firstName)
    const last = pick(emp.last_name_th, emp.lastName)
    const full = (emp.fullName ?? `${first ?? ''} ${last ?? ''}`).trim()
    const nick = emp.nickname?.trim() || null
    if (full && nick) return `${full} (${nick})`
    if (full) return full
    if (nick) return nick
    return fallback
}

/**
 * Two-letter initials for avatar placeholders. Prefers nickname first
 * char + first-name first char; falls back to any single char
 * available; then "?".
 */
export function employeeInitials(emp: NameSource | null | undefined): string {
    if (!emp) return '?'
    const first = pick(emp.first_name_th, emp.firstName) ?? ''
    const last = pick(emp.last_name_th, emp.lastName) ?? ''
    const nick = emp.nickname ?? ''
    const a = nick.charAt(0) || first.charAt(0) || last.charAt(0) || '?'
    const b = first.charAt(0) && nick ? first.charAt(0) : (last.charAt(0) || '')
    return (a + b).toUpperCase() || '?'
}
