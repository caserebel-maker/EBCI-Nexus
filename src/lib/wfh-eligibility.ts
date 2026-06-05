import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasApprovedWfhOn } from '@/lib/wfh'
import type { WfhEligibility } from '@/lib/wfh-eligibility-shared'

/**
 * §3.1 Layer 3 — Can this employee check in as WFH on this date?
 *
 * Combines the two upstream sources from Layers 1 + 2 into a single
 * yes/no decision the /portal/checkin page (and the checkIn server
 * action) can read with one call:
 *
 *   1. Company-wide WFH: `holidays.type='wfh'` row exists for `dateIso`
 *      → everyone is approved to WFH that day. This is the path HR uses
 *      via /hradmin/holidays/wfh-announce for short-notice org-wide
 *      events (oil spike, flooding, COVID).
 *   2. Personal approved WFH: an approved row in `wfh_requests` whose
 *      date range covers `dateIso` for THIS employee. This is the path
 *      individual employees use via /portal/wfh for ad-hoc reasons
 *      (ช่างมาล้างแอร์ · พาลูกหาหมอ).
 *   3. (Deferred §3.10) Field/flexible employees via
 *      employees.work_mode_default — not implemented yet.
 *
 * If neither source allows it, the WFH button on /portal/checkin is
 * disabled and the user is told to request WFH first. The checkIn
 * server action also enforces this so a tampered POST can't bypass.
 *
 * Type lives in a separate `-shared.ts` so the client component can
 * import it without dragging supabaseAdmin into the bundle.
 */

import { isWfhSaturday } from '@/lib/saturday-rules'

export async function checkWfhEligibility(
    employeeId: string,
    dateIso: string,                  // YYYY-MM-DD (Bangkok wall-clock)
): Promise<WfhEligibility> {
    if (!employeeId || !dateIso) return { allowed: false, source: null }

    // Check if it's the 3rd Saturday (company-wide WFH workday)
    if (isWfhSaturday(dateIso)) {
        return {
            allowed: true,
            source: 'company',
            label: 'วันทำงานครึ่งวัน (WFH)',
        }
    }

    // Layer 1: company-wide WFH? Cheap query — only one row max for the
    // date because we don't dedupe by type, and HR rarely creates two
    // entries for the same day.
    const { data: holiday } = await supabaseAdmin
        .from('holidays')
        .select('name, type')
        .eq('date', dateIso)
        .eq('type', 'wfh')
        .limit(1)
        .maybeSingle()
    if (holiday) {
        return {
            allowed: true,
            source: 'company',
            label: holiday.name as string,
        }
    }

    // Layer 2: personal approved request covering this date?
    const personal = await hasApprovedWfhOn(employeeId, dateIso)
    if (personal) {
        return { allowed: true, source: 'personal', label: 'คำขอ WFH ที่อนุมัติแล้ว' }
    }

    return { allowed: false, source: null }
}
