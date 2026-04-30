import { supabaseAdmin } from '@/lib/supabase-admin'
import { bangkokTodayIso } from '@/lib/leave-validations'

/**
 * §1.3 — Leave-day check-in suppression.
 *
 * Returns the approved leave row that covers TODAY (Bangkok local) for
 * the given employee, or null if none. Used by the check-in surfaces
 * to:
 *   - hide / disable the check-in CTA so the user doesn't accidentally
 *     punch in during their approved day off
 *   - block the underlying server action with a clear error message so
 *     the API can't be tricked even if the UI guard is bypassed
 *   - power the attendance dashboard's "ลา" pill instead of "ขาด"
 *
 * Half-day awareness: when is_half_day is true, the leave only covers
 * either the morning or the afternoon. We still surface the row so the
 * caller can decide whether to show "ลาเช้า / มาทำงานบ่าย" UX, but the
 * default policy treats half-days as still requiring a check-in (HR
 * said: half-day takers usually walk into the office for the other
 * half — so don't auto-suppress, just inform).
 */
export interface LeaveTodayInfo {
    id: string
    leave_type_id: string
    leave_type_name: string | null
    leave_type_color: string | null
    leave_type_icon: string | null
    start_date: string
    end_date: string
    is_half_day: boolean
    half_day_period: 'morning' | 'afternoon' | null
    status: 'approved' | 'pending'
    /** True only if the leave is APPROVED + covers a full day today.
     *  Half-day approvals and pending approvals do NOT count. */
    blocksCheckin: boolean
}

export async function getLeaveTodayInfo(
    employeeId: string,
): Promise<LeaveTodayInfo | null> {
    const today = bangkokTodayIso()
    // Inclusive range: start_date <= today <= end_date.
    const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`
            id, status, leave_type_id, start_date, end_date,
            is_half_day, half_day_period
        `)
        .eq('employee_id', employeeId)
        .in('status', ['approved', 'pending'])
        .lte('start_date', today)
        .gte('end_date', today)
        .order('status', { ascending: true }) // 'approved' < 'pending'
        .limit(1)
        .maybeSingle()

    if (error) {
        console.error('[leave-today] lookup error:', error)
        return null
    }
    if (!data) return null

    // Pull the leave type meta in one extra round-trip — keeps the
    // primary query simple and lets the join-shape stay obvious.
    const { data: typeRow } = await supabaseAdmin
        .from('leave_types')
        .select('name_th, color, icon')
        .eq('id', data.leave_type_id)
        .maybeSingle()

    const isApproved = data.status === 'approved'
    const blocksCheckin = isApproved && !data.is_half_day

    return {
        id: data.id as string,
        leave_type_id: data.leave_type_id as string,
        leave_type_name: typeRow?.name_th ?? null,
        leave_type_color: typeRow?.color ?? null,
        leave_type_icon: typeRow?.icon ?? null,
        start_date: data.start_date as string,
        end_date: data.end_date as string,
        is_half_day: Boolean(data.is_half_day),
        half_day_period: (data.half_day_period as 'morning' | 'afternoon' | null) ?? null,
        status: data.status as 'approved' | 'pending',
        blocksCheckin,
    }
}
