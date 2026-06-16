/**
 * Canonical department list for employee forms and filters.
 *
 * Keep this at the "ฝ่าย/สำนัก" reporting level used by the HR dashboard
 * donut chart. Do not mix old sub-department labels such as "แผนก MIS" or
 * "แผนกเอกสารนำเข้า" back into global dropdowns; those make HR pick from
 * multiple names for the same reporting group.
 */
export const DEPARTMENTS = [
    'ฝ่ายประสานงานเอกสาร-นำเข้า',
    'ฝ่ายบัญชี-การเงิน',
    'ฝ่ายประสานงานเอกสาร-ส่งออก',
    'ฝ่ายปฏิบัติพิธีการศุลกากร',
    'สำนักกรรมการผู้จัดการ',
    'ฝ่ายเทคโนโลยีและสารสนเทศ',
    'ฝ่ายทรัพยากรบุคคลและธุรการ',
    'ฝ่ายประสานงานข้อมูลและตรวจสอบ',
    'ฝ่ายนวัตกรรมและเทคโนโลยี',
    'ที่ปรึกษา',
    'ฝ่ายสิทธิประโยชน์',
] as const

export type Department = (typeof DEPARTMENTS)[number]
