/**
 * §3.1 Layer 3 — Client-safe type for WFH eligibility check.
 *
 * Lives apart from `wfh-eligibility.ts` so the /portal/checkin client
 * component can import the type without dragging supabaseAdmin into
 * the browser bundle. Same split pattern as the other client-safe
 * shared files (card-scan, comp-days, streak, wfh).
 */

export type WfhEligibilitySource = 'company' | 'personal' | 'pending_personal' | 'work_mode'

export interface WfhEligibility {
    /** Whether the employee may check in as WFH today. */
    allowed: boolean
    /** Why they're allowed (or null if not). `pending_personal` means the
     *  employee already filed a same-day WFH request and may check in
     *  provisionally while waiting for the approver. */
    source: WfhEligibilitySource | null
    /** Human-readable Thai label of the qualifying source — e.g. the
     *  holiday name ("WFH ลดการเดินทาง") or "คำขอ WFH ที่อนุมัติแล้ว". */
    label?: string
}
