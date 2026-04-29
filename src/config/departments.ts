/**
 * Canonical department list — source of truth for all dropdowns.
 *
 * Synced 2026-04-24 to match every distinct value present in
 * `employees.department` for active staff (54 rows → 20 unique
 * departments). Order is rough headcount-first so the largest
 * groups surface near the top of dropdowns.
 *
 * Some entries are obvious duplicates / typos (e.g. "โครงการเฉพาะกิจ"
 * vs "แผนกโครงการเฉพาะกิจ", "แผนกบัญชี" vs "แผนกการเงิน" sitting
 * apart from "บัญชีและการเงิน"). They're kept verbatim for now so
 * existing employees keep their original department label; HR will
 * consolidate the canonical list in a follow-up cleanup pass.
 *
 * Add new departments here and they appear across the system
 * automatically (filter dropdown, edit profile, new-employee form,
 * and any other consumer of `DEPARTMENTS`).
 */
export const DEPARTMENTS = [
    // Largest first — saves a scroll for the most common pick.
    'แผนกประสานงานเอกสาร',           // 16 active
    'ที่ปรึกษา',                       // 6
    'แผนกการเงิน',                    // 4
    'แผนกตรวจปล่อย-นำเข้า',           // 4
    'สำนักกรรมการผู้จัดการ',          // 4
    'แผนกบัญชี',                      // 3
    'แผนกรับ - ส่ง เอกสาร',           // 3
    'แผนก IT',                        // 2

    // Single-employee departments — alphabetised within this block
    // so the order is stable when headcounts shift.
    'โครงการJOHNSON',
    'โครงการเฉพาะกิจ',
    'แผนกการตลาดและการขาย',
    'แผนกโครงการเฉพาะกิจ',
    'แผนกตรวจปล่อย - ส่งออก',
    'แผนกทำฟอร์ม',
    'แผนกธุรการ - แม่บ้าน',
    'แผนกบริหารงานบุคคล',
    'แผนกโลจิสติกส์และซัพพลายเชน',
    'ฝ่ายนวัตกรรมและเทคโนโลยี',
    'ฝ่ายปฏิบัติพิธีการศุลกากร',
    'สำนักประธานกรรมการ',
    'หน่วยขนส่ง',

    // Catch-all for new hires before HR assigns them a real department.
    'Unassigned',
] as const

export type Department = (typeof DEPARTMENTS)[number]
