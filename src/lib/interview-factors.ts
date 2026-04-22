/**
 * The 12 interview factors, shared between API validation + UI.
 * IDs are stable and used as the canonical key inside the
 * interview_evaluation jsonb column.
 */

export interface InterviewFactor {
    id: number
    label: string
}

export const INTERVIEW_FACTORS: readonly InterviewFactor[] = [
    { id: 1,  label: 'การควบคุมอารมณ์ขณะสัมภาษณ์' },
    { id: 2,  label: 'เจตคติที่ดีในการทำงาน' },
    { id: 3,  label: 'ความเหมาะสมของบุคลิกภาพกับตำแหน่งงาน' },
    { id: 4,  label: 'มีเป้าหมายในการทำงานที่ชัดเจน' },
    { id: 5,  label: 'ความมั่นใจในตัวเอง' },
    { id: 6,  label: 'ความสามารถในการตัดสินใจและการแก้ปัญหา' },
    { id: 7,  label: 'ความคิดสร้างสรรค์' },
    { id: 8,  label: 'ความกล้าในการแสดงความคิดเห็น' },
    { id: 9,  label: 'ความรอบรู้เกี่ยวกับภาระงานในตำแหน่งที่สมัคร' },
    { id: 10, label: 'ความสามารถในการตอบคำถาม' },
    { id: 11, label: 'ความพร้อมของเอกสาร' },
    { id: 12, label: 'ลายมือในการกรอกใบสมัคร' },
] as const

export const EVAL_SCORE_LABELS = [
    '', // index 0 unused
    'น้อยที่สุด',
    'น้อย',
    'ปานกลาง',
    'มาก',
    'มากที่สุด',
] as const
