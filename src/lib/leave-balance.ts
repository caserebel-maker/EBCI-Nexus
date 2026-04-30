import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface LeaveType {
    id: string
    name_th: string
    name_en: string | null
    default_days_per_year: number | null
    is_unlimited: boolean | null
    requires_attachment: boolean | null
    attachment_description: string | null
    advance_notice_days: number | null
    same_day_allowed: boolean | null
    icon: string | null
    color: string | null
    description: string | null
    is_active: boolean | null
    display_order: number | null
    /** 'male' | 'female' | null. When set, this leave_type is hidden
     *  from employees of the opposite gender (e.g. ลาคลอด is female-
     *  only, ลาเกณฑ์ทหาร / ลาอุปสมบท are male-only). NULL = visible
     *  to everyone. */
    gender_restriction: string | null
}

/** Map any historical gender literal (English code or legacy Thai) to
 *  the canonical 'male' | 'female' used by gender_restriction. NULL
 *  means "unknown" — we then show every type, since hiding leave
 *  options based on missing data would punish the employee. */
export function normalizeGender(g: string | null | undefined): 'male' | 'female' | null {
    if (!g) return null
    const s = g.trim().toLowerCase()
    if (s === 'male' || s === 'm' || s === 'ชาย') return 'male'
    if (s === 'female' || s === 'f' || s === 'หญิง') return 'female'
    return null
}

/** Predicate: should this leave type appear in the dropdown for an
 *  employee with the given (normalised) gender? */
export function leaveTypeVisibleForGender(
    type: Pick<LeaveType, 'gender_restriction'>,
    gender: 'male' | 'female' | null,
): boolean {
    if (!type.gender_restriction) return true
    if (gender === null) return true // unknown gender → don't hide
    return type.gender_restriction === gender
}

export interface LeaveBalanceRow {
    id: string
    employee_id: string
    leave_type_id: string
    year: number
    total_days: number
    used_days: number
    pending_days: number
    remaining_days: number | null
    notes: string | null
}

export async function fetchActiveLeaveTypes(): Promise<LeaveType[]> {
    const { data, error } = await supabaseAdmin
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false })
    if (error) {
        console.error('[leave-balance] fetchActiveLeaveTypes error:', error)
        return []
    }
    return (data ?? []) as LeaveType[]
}

export async function fetchBalancesForEmployee(
    employeeId: string,
    year: number,
): Promise<LeaveBalanceRow[]> {
    const { data, error } = await supabaseAdmin
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', year)
    if (error) {
        console.error('[leave-balance] fetchBalancesForEmployee error:', error)
        return []
    }
    return (data ?? []) as LeaveBalanceRow[]
}

/**
 * Atomic-ish pending-days adjustment.
 *
 * Supabase/PostgREST lacks server-side arithmetic via update(), so we
 * read → compute → write. Not transactional across multiple rows, but
 * each leave request only touches one balance row, and we guard status
 * transitions in the request row itself to avoid double-adjustment.
 *
 * delta > 0 = reserve more pending (on submit)
 * delta < 0 = release pending    (on cancel, reject, or move to used)
 *
 * Creates the balance row if it doesn't exist yet (covers leave types
 * with NULL default_days_per_year that weren't seeded initially —
 * annual/marriage/bereavement). New rows start at total=0 until HR
 * grants the quota.
 */
export async function adjustPendingDays(args: {
    employeeId: string
    leaveTypeId: string
    year: number
    delta: number
}): Promise<{ ok: true; row: LeaveBalanceRow } | { ok: false; error: string }> {
    const { employeeId, leaveTypeId, year, delta } = args
    const { data: existing, error: readErr } = await supabaseAdmin
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('leave_type_id', leaveTypeId)
        .eq('year', year)
        .maybeSingle()
    if (readErr) return { ok: false, error: readErr.message }

    if (existing) {
        const nextPending = Math.max(0, Number(existing.pending_days) + delta)
        const { data: updated, error: updErr } = await supabaseAdmin
            .from('leave_balances')
            .update({ pending_days: nextPending, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select('*')
            .single()
        if (updErr) return { ok: false, error: updErr.message }
        return { ok: true, row: updated as LeaveBalanceRow }
    }

    // No seeded row — create one with default_days fallback so the employee
    // at least has an audit trail. total stays 0 until HR sets a quota.
    const nextPending = Math.max(0, delta)
    const { data: inserted, error: insErr } = await supabaseAdmin
        .from('leave_balances')
        .insert({
            employee_id: employeeId,
            leave_type_id: leaveTypeId,
            year,
            total_days: 0,
            used_days: 0,
            pending_days: nextPending,
        })
        .select('*')
        .single()
    if (insErr) return { ok: false, error: insErr.message }
    return { ok: true, row: inserted as LeaveBalanceRow }
}

/** Compute remaining = total - used - pending. Defensive against null. */
export function computeRemaining(row: Pick<LeaveBalanceRow, 'total_days' | 'used_days' | 'pending_days'> | null | undefined): number {
    if (!row) return 0
    const total = Number(row.total_days ?? 0)
    const used = Number(row.used_days ?? 0)
    const pending = Number(row.pending_days ?? 0)
    return Math.max(0, total - used - pending)
}
