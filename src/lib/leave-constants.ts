/**
 * §3.16 priority 2 — Leave policy constants.
 *
 * Single source of truth for half-day time windows and leave policy
 * configuration that's shared across check-in, reconcile, leave form,
 * and the /portal/leave-policy page.
 *
 * These values use sensible company defaults. When ม๊อด decides §1.5
 * (check-in window timing), update the numbers here — every consumer
 * picks them up automatically.
 */

// ── Work schedule ──────────────────────────────────────────────────────
export const WORK_SCHEDULE = {
    /** Full-day office hours */
    fullDayStart: '08:00',
    fullDayEnd: '17:30',

    /** Morning half = 08:00 – 12:00 */
    morningStart: '08:00',
    morningEnd: '12:00',

    /** Afternoon half = 13:00 – 17:30 */
    afternoonStart: '13:00',
    afternoonEnd: '17:30',

    /** Lunch break */
    lunchStart: '12:00',
    lunchEnd: '13:00',
} as const

// ── Half-day leave rules ───────────────────────────────────────────────
export const HALF_DAY_RULES = {
    /** When employee takes morning leave, they must check in by this time */
    afternoonCheckinDeadline: '13:30',
    /** When employee takes afternoon leave, they must check in before this time */
    morningCheckinDeadline: '08:00',
    /** Half-day deduction in days */
    deductionDays: 0.5,
} as const

// ── Sick leave rules ───────────────────────────────────────────────────
export const SICK_LEAVE_RULES = {
    /** Number of consecutive days that triggers medical certificate requirement */
    medicalCertificateThreshold: 3,
    /** Must be a past date (retroactive) */
    retroactiveOnly: true,
} as const

// ── Personal leave (ลากิจ) rules ───────────────────────────────────────
/**
 * Minimum hours for personal leave. Set to 4 (half-day) as a default
 * until ม๊อด decides §4.3 (options: 1/2/4/no minimum).
 * When decided, just change this number.
 */
export const PERSONAL_LEAVE_MIN_HOURS = 4

// ── Leave policy display data ──────────────────────────────────────────
export interface LeavePolicyRule {
    id: string
    title: string
    description: string
    icon?: string
}

export const HALF_DAY_POLICY_RULES: LeavePolicyRule[] = [
    {
        id: 'half-morning',
        title: 'ลาครึ่งวันเช้า',
        description: `ลาตั้งแต่ ${WORK_SCHEDULE.morningStart} - ${WORK_SCHEDULE.morningEnd} น. · ไม่ต้องเช็คอินตอนเช้า · ต้องเช็คอินตอนบ่ายก่อน ${HALF_DAY_RULES.afternoonCheckinDeadline} น.`,
        icon: '🌅',
    },
    {
        id: 'half-afternoon',
        title: 'ลาครึ่งวันบ่าย',
        description: `ลาตั้งแต่ ${WORK_SCHEDULE.afternoonStart} - ${WORK_SCHEDULE.afternoonEnd} น. · เช็คอินตอนเช้าตามปกติ (ก่อน ${HALF_DAY_RULES.morningCheckinDeadline} น.) · ไม่ต้องเช็คอินตอนบ่าย`,
        icon: '🌇',
    },
    {
        id: 'half-deduction',
        title: 'การหักวันลา',
        description: `ลาครึ่งวัน = หัก ${HALF_DAY_RULES.deductionDays} วัน จากสิทธิ์ · ต้องเป็นวันเดียวกัน (เลือกวันเริ่ม = วันสิ้นสุด)`,
        icon: '📊',
    },
]

export const GENERAL_POLICY_RULES: LeavePolicyRule[] = [
    {
        id: 'approval-required',
        title: 'ต้องได้รับอนุมัติก่อนลาหยุด',
        description: 'การลาพักผ่อนประจำปีต้องยื่นขออนุมัติล่วงหน้าไม่น้อยกว่า 3 วัน และลากิจต้องยื่นขออนุมัติล่วงหน้าไม่น้อยกว่า 1 วัน โดยต้องได้รับอนุมัติก่อนจึงจะลาหยุดได้',
        icon: '✅',
    },
    {
        id: 'comp-days-policy',
        title: 'วันหยุดสะสม (Comp Days)',
        description: 'หากต้องมาทำงานในวันหยุด พนักงานต้องแจ้ง HR ทุกครั้งเพื่อรักษาสิทธิ์ของตนเอง และต้องใช้สิทธิ์หยุดงานชดเชยนั้นภายใน 90 วัน นับจากวันที่มาทำงานวันหยุด',
        icon: '⏳',
    },
    {
        id: 'sick-submit',
        title: 'การยื่นลาป่วย',
        description: `ต้องยื่นใบลาป่วยในวันแรกที่กลับมาทำงาน · หากลาป่วยตั้งแต่ ${SICK_LEAVE_RULES.medicalCertificateThreshold} วันทำงานติดต่อกัน ต้องส่งใบรับรองแพทย์หรือสถานพยาบาลของทางราชการ หากไม่มีต้องชี้แจงเป็นหนังสือ`,
        icon: '🏥',
    },
    {
        id: 'reason-required',
        title: 'ลากิจต้องระบุเหตุผล',
        description: 'พนักงานที่ลากิจต้องระบุเหตุผลในการลากิจทุกครั้ง',
        icon: '📝',
    },
    {
        id: 'marriage-eligibility',
        title: 'ลาเพื่อการสมรส',
        description: 'พนักงานที่ทำงานกับบริษัทครบ 1 ปี มีสิทธิลาเพื่อการสมรสของตนเอง โดยต้องยื่นล่วงหน้าอย่างน้อย 3 วัน',
        icon: '💍',
    },
    {
        id: 'cancel-pending',
        title: 'ยกเลิกใบลา (รออนุมัติ)',
        description: 'ใบลาที่ยังรออนุมัติ สามารถกดยกเลิกได้ทันที',
        icon: '❌',
    },
    {
        id: 'cancel-approved',
        title: 'ยกเลิกใบลา (อนุมัติแล้ว)',
        description: 'ใบลาที่อนุมัติแล้ว ต้องส่งคำขอยกเลิกให้ผู้อนุมัติพิจารณา · ถ้าวันลายังไม่ถึง ระบบจะคืนวันลาอัตโนมัติ',
        icon: '🔄',
    },
    {
        id: 'overlap',
        title: 'ห้ามทับซ้อน',
        description: 'ไม่สามารถยื่นลาซ้อนกับใบลาที่รออนุมัติหรือได้รับอนุมัติแล้วได้',
        icon: '🚫',
    },
]
