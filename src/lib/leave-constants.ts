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
    fullDayStart: '08:30',
    fullDayEnd: '17:30',

    /** Morning half = 08:30 – 12:00 */
    morningStart: '08:30',
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
    morningCheckinDeadline: '08:30',
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
        description: `ลาตั้งแต่ ${WORK_SCHEDULE.afternoonStart} - ${WORK_SCHEDULE.afternoonEnd} น. · เช็คอินตอนเช้าตามปกติ (ก่อน ${WORK_SCHEDULE.morningEnd} น.) · ไม่ต้องเช็คอินตอนบ่าย`,
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
        id: 'sick-cert',
        title: 'ใบรับรองแพทย์',
        description: `ลาป่วยตั้งแต่ ${SICK_LEAVE_RULES.medicalCertificateThreshold} วันขึ้นไป ต้องแนบใบรับรองแพทย์ · ลาป่วยไม่เกิน 2 วันไม่ต้องแนบ`,
        icon: '🏥',
    },
    {
        id: 'sick-retroactive',
        title: 'ลาป่วยต้องยื่นย้อนหลัง',
        description: 'ลาป่วยต้องเลือกวันที่ผ่านไปแล้ว (ไม่สามารถยื่นลาป่วยล่วงหน้าได้)',
        icon: '📅',
    },
    {
        id: 'advance-notice',
        title: 'การขอลาล่วงหน้า',
        description: 'ลาพักร้อนต้องขอล่วงหน้าตามจำนวนวันที่กำหนด (ดูรายละเอียดในแต่ละประเภท)',
        icon: '⏰',
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
