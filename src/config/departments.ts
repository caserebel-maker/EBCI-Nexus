/**
 * Canonical department list — source of truth for all dropdowns.
 *
 * 2026-05-08 — ม๊อด consolidated + renamed per beta feedback:
 *   • +แผนกเอกสารนำเข้า, +แผนกเอกสารส่งออก  (split from แผนกตรวจปล่อย)
 *   • แผนก IT → แผนก MIS
 *   • หน่วยขนส่ง → LSC logistics and supply chain
 *   • แผนกบัญชี + แผนกการเงิน → แผนกบัญชีและการเงิน
 *   • แผนกบริหารงานบุคคล + แผนกธุรการ-แม่บ้าน → Human Resources and Purchasing
 *   • แผนกรับ-ส่งเอกสาร → แผนกเอกสารนำเข้า (merged in)
 *   • โครงการJOHNSON, โครงการเฉพาะกิจ — removed; employees moved to Unassigned
 *
 * The SQL migration `20260508_consolidate_departments.sql` moves every
 * affected `employees.department` row to the new canonical value
 * before this list goes live in prod.
 *
 * Add new departments here and they appear across the system
 * automatically (filter dropdown, edit profile, new-employee form,
 * and any other consumer of `DEPARTMENTS`).
 */
export const DEPARTMENTS = [
    // Largest first — saves a scroll for the most common pick.
    'แผนกประสานงานเอกสาร',                 // 16 active
    'แผนกบัญชีและการเงิน',                  // 7  (was: บัญชี 3 + การเงิน 4)
    'ที่ปรึกษา',                            // 6
    'Human Resources and Purchasing',       // ~3 (HR + ธุรการ + แม่บ้าน)
    'แผนกตรวจปล่อย-นำเข้า',                // 4
    'สำนักกรรมการผู้จัดการ',               // 4
    'แผนกเอกสารนำเข้า',                    // ~3 (NEW — incl. former รับ-ส่งเอกสาร)
    'แผนก MIS',                            // 2  (renamed from แผนก IT)

    // Smaller departments — alphabetised within this block so the
    // order is stable when headcounts shift.
    'LSC logistics and supply chain',      // renamed from หน่วยขนส่ง
    'ฝ่ายนวัตกรรมและเทคโนโลยี',
    'ฝ่ายปฏิบัติพิธีการศุลกากร',
    'แผนกการตลาดและการขาย',
    'แผนกเอกสารส่งออก',                    // NEW
    'แผนกตรวจปล่อย - ส่งออก',
    'แผนกทำฟอร์ม',
    'แผนกโลจิสติกส์และซัพพลายเชน',
    'สำนักประธานกรรมการ',

    // Catch-all for new hires before HR assigns them a real department.
    'Unassigned',
] as const

export type Department = (typeof DEPARTMENTS)[number]
