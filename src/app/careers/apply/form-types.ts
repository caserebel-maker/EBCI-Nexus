/**
 * Mirrors the subset of job_applications columns the public form
 * reads + writes. Field names match the DB exactly so
 * react-hook-form defaults + autosave patches stay 1:1 with
 * the server — no translation layer.
 *
 * Session B ships Step 1 fields only; remaining steps are `| null`
 * placeholders so the type compiles while the UI is stubbed.
 */
export interface ApplyFormValues {
    // ── Step 1: position + personal ──────────────────────────────
    position_applied: string
    expected_salary: number | null

    title_th: string // 'นาย' | 'นาง' | 'นางสาว'

    first_name_th: string
    last_name_th: string
    first_name_en: string
    last_name_en: string
    nickname: string

    email: string
    phone_mobile: string
    phone_home: string

    photo_url: string | null // set by /upload endpoint, not by text input

    // Future steps land here in later sessions
    // (kept as `unknown` buckets to avoid field churn)
}

export function defaultApplyFormValues(): ApplyFormValues {
    return {
        position_applied: '',
        expected_salary: null,
        title_th: 'นาย',
        first_name_th: '',
        last_name_th: '',
        first_name_en: '',
        last_name_en: '',
        nickname: '',
        email: '',
        phone_mobile: '',
        phone_home: '',
        photo_url: null,
    }
}

export const TOTAL_STEPS = 5

export const STEP_TITLES = [
    'ตำแหน่งและข้อมูลส่วนตัว',
    'ที่อยู่และข้อมูลเพิ่มเติม',
    'การศึกษาและประสบการณ์',
    'ทักษะและสุขภาพ',
    'อ้างอิงและยืนยัน',
] as const

/**
 * Columns the form actually sends via autosave/start payloads.
 * Anything not in this set is stripped so we never accidentally
 * forward DB-managed fields (submitted_at, reviewed_by, etc.).
 */
export const SAVABLE_FIELDS: ReadonlyArray<keyof ApplyFormValues> = [
    'position_applied',
    'expected_salary',
    'title_th',
    'first_name_th',
    'last_name_th',
    'first_name_en',
    'last_name_en',
    'nickname',
    'email',
    'phone_mobile',
    'phone_home',
    // photo_url is set server-side by /upload, never sent from the form
]
