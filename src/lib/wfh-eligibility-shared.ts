/**
 * §3.1 Layer 3 — Client-safe type for WFH eligibility check.
 *
 * Lives apart from `wfh-eligibility.ts` so the /portal/checkin client
 * component can import the type without dragging supabaseAdmin into
 * the browser bundle. Same split pattern as the other client-safe
 * shared files (card-scan, comp-days, streak, wfh).
 */

export type WfhEligibilitySource = 'company' | 'personal' | 'work_mode'

export interface WfhEligibility {
    /** Whether the employee may check in as WFH today. */
    allowed: boolean
    /** Why they're allowed (or null if not). Drives the helper text
     *  next to the WFH check-in button so the user sees their own
     *  approved request, not a generic "เช็คอินสำเร็จ" toast. */
    source: WfhEligibilitySource | null
    /** Human-readable Thai label of the qualifying source — e.g. the
     *  holiday name ("WFH ลดการเดินทาง") or "คำขอ WFH ที่อนุมัติแล้ว". */
    label?: string
}
