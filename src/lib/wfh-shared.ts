/**
 * §3.1 Layer 2 — WFH (work-from-home) request shared types.
 *
 * Lives apart from `wfh.ts` so client components can import the type
 * + status helpers without dragging supabaseAdmin into the browser
 * bundle (Next.js 16 + Turbopack rule). Same split pattern as
 * `card-scan-shared.ts`, `comp-days-shared.ts`, `streak-shared.ts`.
 */

export type WfhStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface WfhRequest {
    id: string
    reference_code: string
    employee_id: string
    start_date: string                 // YYYY-MM-DD
    end_date: string                   // YYYY-MM-DD
    total_days: number
    reason: string
    contact_during_wfh: string | null
    status: WfhStatus
    approver_id: string | null
    approved_at: string | null
    approval_notes: string | null
    rejection_reason: string | null
    submitted_at: string
    cancelled_at: string | null
    cancellation_reason: string | null
    created_at: string
    updated_at: string
}

export const WFH_STATUS_LABEL: Record<WfhStatus, string> = {
    pending:   'รออนุมัติ',
    approved:  'อนุมัติแล้ว',
    rejected:  'ปฏิเสธ',
    cancelled: 'ยกเลิก',
}

/**
 * Tailwind class triple for a status badge. Same colour family the
 * leave/comp-day badges use so the UI stays cohesive — green = good
 * to go, amber = needs attention, red = bad outcome, dimmed = void.
 */
export const WFH_STATUS_BADGE: Record<WfhStatus, string> = {
    pending:   'text-amber-200 bg-amber-500/15 border-amber-500/30',
    approved:  'text-emerald-200 bg-emerald-500/15 border-emerald-500/30',
    rejected:  'text-rose-200 bg-rose-500/15 border-rose-500/30',
    cancelled: 'text-white/55 bg-white/5 border-white/15 line-through',
}
