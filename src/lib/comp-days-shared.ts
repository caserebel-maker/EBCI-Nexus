/**
 * Client-safe types + status labels for the §2.1 Comp day feature.
 *
 * Lives in its own file (no `server-only` import) so React client
 * components can pull in types and label/color helpers without
 * dragging supabaseAdmin into the browser bundle.
 *
 * Same split pattern as `card-scan-shared.ts` ↔ `card-scan-today.ts`
 * (the lesson from the 2026-05-02 Vercel build break — Next.js 16 +
 * Turbopack rejects `'server-only'` modules in client trees).
 */

export type CompDayStatus = 'available' | 'used' | 'expired' | 'voided'

export interface CompDayRow {
    id: string
    employee_id: string
    worked_on: string                  // YYYY-MM-DD
    earned_reason: string | null
    granted_by: string | null
    granted_at: string                 // ISO timestamp
    used_on: string | null             // YYYY-MM-DD when used
    used_at: string | null             // ISO timestamp
    used_note: string | null
    expires_at: string | null          // YYYY-MM-DD
    voided_at: string | null           // ISO timestamp
    voided_by: string | null
    voided_reason: string | null
    created_at: string
    updated_at: string
}

export interface CompDaySummary {
    available: number
    used: number
    expired: number
    voided: number
    total: number
}

export const COMP_DAY_STATUS_LABEL: Record<CompDayStatus, string> = {
    available: 'พร้อมใช้',
    used:      'ใช้แล้ว',
    expired:   'หมดอายุ',
    voided:    'ยกเลิก',
}

/**
 * Tailwind class triple for a status badge (text + background + border).
 * Same vibe as the leave status badges so the UI stays cohesive.
 */
export const COMP_DAY_STATUS_BADGE: Record<CompDayStatus, string> = {
    available: 'text-emerald-200 bg-emerald-500/15 border-emerald-500/30',
    used:      'text-sky-200 bg-sky-500/15 border-sky-500/30',
    expired:   'text-amber-200 bg-amber-500/15 border-amber-500/30',
    voided:    'text-white/50 bg-white/5 border-white/15 line-through',
}
