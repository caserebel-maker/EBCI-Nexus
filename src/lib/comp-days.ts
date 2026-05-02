import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { bangkokTodayIso } from '@/lib/leave-validations'
import type {
    CompDayRow, CompDayStatus, CompDaySummary,
} from '@/lib/comp-days-shared'

/**
 * §2.1 BETA_FEEDBACK — Comp day (วันหยุดสะสม) core operations.
 *
 * Server-only because every function touches supabaseAdmin. The
 * client-safe types + status helpers live in `./comp-days-shared.ts`
 * so React components can import them without dragging the admin
 * client into the browser bundle (Next.js 16 / Turbopack rule).
 *
 * Status is computed, never stored — keeps audit history honest:
 *   - voided_at set            → 'voided'
 *   - used_on set              → 'used'
 *   - expires_at <= today      → 'expired'
 *   - otherwise                → 'available'
 */

const SELECT_COLS = `
    id, employee_id, worked_on, earned_reason,
    granted_by, granted_at,
    used_on, used_at, used_note,
    expires_at, voided_at, voided_by, voided_reason,
    created_at, updated_at
`.replace(/\s+/g, ' ').trim()

export function computeStatus(
    row: Pick<CompDayRow, 'used_on' | 'voided_at' | 'expires_at'>,
    today: string = bangkokTodayIso(),
): CompDayStatus {
    if (row.voided_at) return 'voided'
    if (row.used_on) return 'used'
    if (row.expires_at && row.expires_at <= today) return 'expired'
    return 'available'
}

/** List ALL comp_days for one employee (any status). */
export async function listCompDaysForEmployee(employeeId: string): Promise<CompDayRow[]> {
    const { data, error } = await supabaseAdmin
        .from('comp_days')
        .select(SELECT_COLS)
        .eq('employee_id', employeeId)
        .order('worked_on', { ascending: false })
    if (error) {
        console.error('[comp-days] list error:', error)
        return []
    }
    // Cast via unknown — comp_days isn't in the generated Supabase
    // types yet (this migration is the one that adds it). Run
    // generate_typescript_types after merge to drop the cast.
    return (data ?? []) as unknown as CompDayRow[]
}

/** Compute summary counts by status for one employee. */
export async function getCompDaySummary(employeeId: string): Promise<CompDaySummary> {
    const rows = await listCompDaysForEmployee(employeeId)
    const today = bangkokTodayIso()
    const summary: CompDaySummary = {
        available: 0, used: 0, expired: 0, voided: 0, total: rows.length,
    }
    for (const r of rows) {
        const s = computeStatus(r, today)
        summary[s]++
    }
    return summary
}

/** Just the count of available (usable) comp days — used by dashboard widget. */
export async function getAvailableCompDayCount(employeeId: string): Promise<number> {
    const today = bangkokTodayIso()
    // We could let Postgres compute this with a WHERE clause, but the
    // expires_at NULL-or-future logic is fiddly across PostgREST .or()
    // syntax. Counting in JS over a small table is fine (typical
    // employee has <30 lifetime comp days).
    const { data, error } = await supabaseAdmin
        .from('comp_days')
        .select('used_on, voided_at, expires_at')
        .eq('employee_id', employeeId)
        .is('used_on', null)
        .is('voided_at', null)
    if (error) {
        console.error('[comp-days] count error:', error)
        return 0
    }
    return (data ?? []).filter(r => !r.expires_at || r.expires_at > today).length
}

/**
 * HR grants a comp day. `grantedByUserId` MUST be User.id (auth UUID),
 * not employees.id — the FK targets the User table. Same gotcha that
 * bit `leave_balances.last_adjusted_by` (commit a27c3b1).
 */
export interface GrantCompDayInput {
    employeeId: string
    workedOn: string          // YYYY-MM-DD
    earnedReason?: string | null
    expiresAt?: string | null // YYYY-MM-DD, optional
    grantedByUserId: string
}

export async function grantCompDay(input: GrantCompDayInput): Promise<{ id: string } | { error: string }> {
    if (!input.employeeId || !input.workedOn) {
        return { error: 'employeeId + workedOn required' }
    }
    const { data, error } = await supabaseAdmin
        .from('comp_days')
        .insert({
            employee_id: input.employeeId,
            worked_on: input.workedOn,
            earned_reason: input.earnedReason ?? null,
            expires_at: input.expiresAt ?? null,
            granted_by: input.grantedByUserId,
        })
        .select('id')
        .single()
    if (error || !data) {
        console.error('[comp-days] grant error:', error)
        return { error: error?.message ?? 'ให้สิทธิ์ไม่สำเร็จ' }
    }
    return { id: data.id }
}

/**
 * Employee uses a comp day. Picks the OLDEST available row first
 * (FIFO — exhaust ones with closer expiries first). Caller has already
 * verified the session belongs to `employeeId`.
 */
export async function useCompDay(input: {
    employeeId: string
    useOn: string         // YYYY-MM-DD
    note?: string | null
}): Promise<{ id: string } | { error: string }> {
    const today = bangkokTodayIso()
    // Pick the oldest available row (FIFO). Sort by expires_at NULLS
    // LAST so rows with concrete deadlines burn down first.
    const { data: rows, error: lookupErr } = await supabaseAdmin
        .from('comp_days')
        .select('id, expires_at')
        .eq('employee_id', input.employeeId)
        .is('used_on', null)
        .is('voided_at', null)
        .order('expires_at', { ascending: true, nullsFirst: false })
        .order('worked_on', { ascending: true })
        .limit(20)
    if (lookupErr) {
        console.error('[comp-days] use lookup error:', lookupErr)
        return { error: 'ค้นหาวันหยุดสะสมไม่สำเร็จ' }
    }
    const target = (rows ?? []).find(r => !r.expires_at || r.expires_at > today)
    if (!target) {
        return { error: 'ไม่มีวันหยุดสะสมที่ใช้ได้' }
    }
    const { error: updErr } = await supabaseAdmin
        .from('comp_days')
        .update({
            used_on: input.useOn,
            used_at: new Date().toISOString(),
            used_note: input.note ?? null,
        })
        .eq('id', target.id)
        .is('used_on', null)         // Defensive: don't double-use if someone races
        .is('voided_at', null)
    if (updErr) {
        console.error('[comp-days] use update error:', updErr)
        return { error: 'บันทึกการใช้สิทธิ์ไม่สำเร็จ' }
    }
    return { id: target.id }
}

/**
 * HR voids a comp day. Used for grant mistakes / employee leaving.
 * Cannot void rows that are already used (would orphan the time-off).
 */
export async function voidCompDay(input: {
    id: string
    voidedByUserId: string
    reason?: string | null
}): Promise<{ ok: true } | { error: string }> {
    const { data: existing, error: lookupErr } = await supabaseAdmin
        .from('comp_days')
        .select('used_on, voided_at')
        .eq('id', input.id)
        .maybeSingle()
    if (lookupErr || !existing) return { error: 'ไม่พบสิทธิ์' }
    if (existing.used_on) return { error: 'ใช้แล้ว ยกเลิกไม่ได้ — ลบใบลาด้วย admin tool ก่อน' }
    if (existing.voided_at) return { error: 'ยกเลิกไปแล้ว' }
    const { error: updErr } = await supabaseAdmin
        .from('comp_days')
        .update({
            voided_at: new Date().toISOString(),
            voided_by: input.voidedByUserId,
            voided_reason: input.reason ?? null,
        })
        .eq('id', input.id)
    if (updErr) {
        console.error('[comp-days] void error:', updErr)
        return { error: 'ยกเลิกสิทธิ์ไม่สำเร็จ' }
    }
    return { ok: true }
}

/**
 * Did this employee use a comp day on `dateIso`? Used by /portal/checkin
 * + /hradmin/attendance/reconcile to suppress the "ขาด" flag in the
 * same way leave-day suppression already does.
 */
export async function isCompDayUsedOn(employeeId: string, dateIso: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from('comp_days')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('used_on', dateIso)
        .is('voided_at', null)
        .limit(1)
        .maybeSingle()
    if (error) {
        console.error('[comp-days] isUsedOn error:', error)
        return false
    }
    return !!data
}

/** Admin view: list ALL employees' comp days (paginated by employee). */
export async function listAllCompDays(opts: {
    employeeId?: string | null
    status?: CompDayStatus | 'all'
    limit?: number
}): Promise<CompDayRow[]> {
    let q = supabaseAdmin
        .from('comp_days')
        .select(SELECT_COLS)
        .order('granted_at', { ascending: false })
        .limit(opts.limit ?? 500)
    if (opts.employeeId) q = q.eq('employee_id', opts.employeeId)
    // Status filter: 'used'/'voided' are direct column checks; 'available'
    // and 'expired' need post-fetch JS filtering due to expires_at logic.
    if (opts.status === 'used') q = q.not('used_on', 'is', null)
    if (opts.status === 'voided') q = q.not('voided_at', 'is', null)
    const { data, error } = await q
    if (error) {
        console.error('[comp-days] listAll error:', error)
        return []
    }
    // Cast via unknown — same reason as listCompDaysForEmployee above.
    const rows = (data ?? []) as unknown as CompDayRow[]
    if (opts.status === 'available') {
        return rows.filter(r => computeStatus(r) === 'available')
    }
    if (opts.status === 'expired') {
        return rows.filter(r => computeStatus(r) === 'expired')
    }
    return rows
}
