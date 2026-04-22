/**
 * Mirrors the subset of job_applications columns the public form
 * reads + writes. Field names match the DB exactly so autosave +
 * /submit patches stay 1:1 with the server — no translation layer.
 */

// ── Nested row shapes for jsonb columns ──────────────────────────────────
export interface SiblingRow {
    name: string
    age: string
    occupation: string
    phone: string
}
export interface EducationRow {
    level: string
    institution: string
    major: string
    start_year: string
    end_year: string
}
export interface ExperienceRow {
    workplace: string
    position: string
    start_date: string
    end_date: string
    salary: string
    description: string
    reason_leaving: string
}
export interface LanguageRow {
    language: string
    speaking: string  // 'ดีมาก' | 'ดี' | 'พอใช้'
    reading: string
    writing: string
}
export interface VehicleRow {
    type: string
    brand: string
    model: string
    year: string
}
export interface ReferenceRow {
    name: string
    relation: string
    occupation: string
    phone: string
    address: string
}
export interface OtherDocumentRow {
    name: string
    path: string
    url: string | null
    kind: 'other'
    uploaded_at?: string
}

// ── Full form state ──────────────────────────────────────────────────────
export interface ApplyFormValues {
    // ── Step 1: position + personal ──────────────────────────────────────
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
    photo_url: string | null

    // ── Step 2: addresses, ID, family ────────────────────────────────────
    // ID-card address (all required by spec)
    id_card_address_no: string
    id_card_address_moo: string
    id_card_address_subdistrict: string
    id_card_address_district: string
    id_card_address_province: string
    id_card_address_postal: string
    // Current address
    same_as_id_address: boolean
    current_address_no: string
    current_address_moo: string
    current_address_road: string
    current_address_subdistrict: string
    current_address_district: string
    current_address_province: string
    current_address_postal: string
    living_with: string // 'ครอบครัว' | 'บ้านตัวเอง' | 'บ้านเช่า' | 'หอพัก'
    // Personal
    date_of_birth: string // YYYY-MM-DD
    nationality: string
    ethnicity: string
    religion: string
    height_cm: number | null
    weight_kg: number | null
    blood_type: string // A|B|O|AB
    id_card_number: string
    id_card_issued_date: string
    id_card_expiry_date: string
    marital_status: string
    military_status: string // only used for นาย
    // Family
    father_name: string
    father_age: number | null
    father_status: string // 'alive' | 'deceased'
    mother_name: string
    mother_age: number | null
    mother_status: string
    spouse_name: string
    spouse_occupation: string
    spouse_workplace: string
    spouse_position: string
    spouse_phone: string
    children_count: number | null
    children_male: number | null
    children_female: number | null
    children_not_in_school: number | null
    children_studying: number | null
    children_school_level: string
    siblings_total: number | null
    siblings_male: number | null
    siblings_female: number | null
    applicant_birth_order: number | null
    siblings_details: SiblingRow[]

    // ── Step 3: education, experience, documents ─────────────────────────
    education: EducationRow[]
    work_experience: ExperienceRow[]
    cv_url: string | null
    transcript_url: string | null
    id_card_copy_url: string | null
    house_registration_url: string | null
    other_documents: OtherDocumentRow[]

    // ── Step 4: skills + health ─────────────────────────────────────────
    languages: LanguageRow[]
    typing_thai_wpm: number | null
    typing_english_wpm: number | null
    computer_skills: string
    driving_license_car: string
    driving_license_car_type: string
    driving_license_motorcycle: string
    driving_license_motorcycle_type: string
    office_equipment_skills: string
    hobbies: string
    sports: string
    special_knowledge: string
    other_skills: string
    can_work_upcountry: boolean | null
    can_work_upcountry_note: string
    has_vehicle: boolean | null
    vehicles: VehicleRow[]
    has_chronic_disease: boolean | null
    chronic_disease_details: string
    had_surgery: boolean | null
    surgery_details: string
    has_criminal_record: boolean | null
    criminal_record_details: string

    // ── Step 5: references + consent + signature ─────────────────────────
    emergency_contact_name: string
    emergency_contact_relation: string
    emergency_contact_address: string
    emergency_contact_phone: string
    reference_persons: ReferenceRow[]
    allow_background_check: boolean | null
    background_check_reason: string
    applied_before: boolean | null
    applied_before_date: string
    knows_ebci_employees: string
    heard_from: string
    heard_from_other: string
    can_start_date: string
    consider_other_positions: boolean | null
    pdpa_consented: boolean
    signature_data: string | null // base64 data URL
    signed_date: string
    signed_location: string
}

const emptyLanguageRow: LanguageRow = { language: '', speaking: 'พอใช้', reading: 'พอใช้', writing: 'พอใช้' }
const emptyReferenceRow: ReferenceRow = { name: '', relation: '', occupation: '', phone: '', address: '' }

export function defaultApplyFormValues(): ApplyFormValues {
    return {
        // Step 1
        position_applied: '', expected_salary: null,
        title_th: 'นาย',
        first_name_th: '', last_name_th: '',
        first_name_en: '', last_name_en: '', nickname: '',
        email: '', phone_mobile: '', phone_home: '',
        photo_url: null,

        // Step 2
        id_card_address_no: '', id_card_address_moo: '',
        id_card_address_subdistrict: '', id_card_address_district: '',
        id_card_address_province: '', id_card_address_postal: '',
        same_as_id_address: true,
        current_address_no: '', current_address_moo: '', current_address_road: '',
        current_address_subdistrict: '', current_address_district: '',
        current_address_province: '', current_address_postal: '',
        living_with: 'ครอบครัว',
        date_of_birth: '',
        nationality: 'ไทย', ethnicity: 'ไทย', religion: 'พุทธ',
        height_cm: null, weight_kg: null, blood_type: '',
        id_card_number: '', id_card_issued_date: '', id_card_expiry_date: '',
        marital_status: 'โสด', military_status: 'ยกเว้น',
        father_name: '', father_age: null, father_status: 'alive',
        mother_name: '', mother_age: null, mother_status: 'alive',
        spouse_name: '', spouse_occupation: '', spouse_workplace: '',
        spouse_position: '', spouse_phone: '',
        children_count: null, children_male: null, children_female: null,
        children_not_in_school: null, children_studying: null, children_school_level: '',
        siblings_total: null, siblings_male: null, siblings_female: null,
        applicant_birth_order: null, siblings_details: [],

        // Step 3
        education: [{ level: 'มัธยมปลาย', institution: '', major: '', start_year: '', end_year: '' }],
        work_experience: [],
        cv_url: null, transcript_url: null,
        id_card_copy_url: null, house_registration_url: null,
        other_documents: [],

        // Step 4
        languages: [
            { ...emptyLanguageRow, language: 'ไทย', speaking: 'ดีมาก', reading: 'ดีมาก', writing: 'ดีมาก' },
            { ...emptyLanguageRow, language: 'อังกฤษ' },
        ],
        typing_thai_wpm: null, typing_english_wpm: null,
        computer_skills: '',
        driving_license_car: '', driving_license_car_type: '',
        driving_license_motorcycle: '', driving_license_motorcycle_type: '',
        office_equipment_skills: '',
        hobbies: '', sports: '', special_knowledge: '', other_skills: '',
        can_work_upcountry: null, can_work_upcountry_note: '',
        has_vehicle: null, vehicles: [],
        has_chronic_disease: null, chronic_disease_details: '',
        had_surgery: null, surgery_details: '',
        has_criminal_record: null, criminal_record_details: '',

        // Step 5
        emergency_contact_name: '', emergency_contact_relation: '',
        emergency_contact_address: '', emergency_contact_phone: '',
        reference_persons: [ { ...emptyReferenceRow }, { ...emptyReferenceRow } ],
        allow_background_check: null, background_check_reason: '',
        applied_before: null, applied_before_date: '',
        knows_ebci_employees: '',
        heard_from: '', heard_from_other: '',
        can_start_date: '', consider_other_positions: null,
        pdpa_consented: false,
        signature_data: null,
        signed_date: '', signed_location: 'กรุงเทพมหานคร',
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
 * Columns the form sends via autosave / start / submit payloads.
 * photo_url, cv_url, transcript_url, id_card_copy_url,
 * house_registration_url, other_documents are managed server-side by
 * /upload — they live in the form state so the UI can echo the value
 * back, but we never send them as text patches (the server owns them).
 */
export const SAVABLE_FIELDS: ReadonlyArray<keyof ApplyFormValues> = [
    // Step 1
    'position_applied', 'expected_salary', 'title_th',
    'first_name_th', 'last_name_th', 'first_name_en', 'last_name_en', 'nickname',
    'email', 'phone_mobile', 'phone_home',
    // Step 2
    'id_card_address_no', 'id_card_address_moo', 'id_card_address_subdistrict',
    'id_card_address_district', 'id_card_address_province', 'id_card_address_postal',
    'same_as_id_address',
    'current_address_no', 'current_address_moo', 'current_address_road',
    'current_address_subdistrict', 'current_address_district',
    'current_address_province', 'current_address_postal',
    'living_with',
    'date_of_birth', 'nationality', 'ethnicity', 'religion',
    'height_cm', 'weight_kg', 'blood_type',
    'id_card_number', 'id_card_issued_date', 'id_card_expiry_date',
    'marital_status', 'military_status',
    'father_name', 'father_age', 'father_status',
    'mother_name', 'mother_age', 'mother_status',
    'spouse_name', 'spouse_occupation', 'spouse_workplace',
    'spouse_position', 'spouse_phone',
    'children_count', 'children_male', 'children_female',
    'children_not_in_school', 'children_studying', 'children_school_level',
    'siblings_total', 'siblings_male', 'siblings_female', 'applicant_birth_order',
    'siblings_details',
    // Step 3
    'education', 'work_experience',
    // Step 4
    'languages', 'typing_thai_wpm', 'typing_english_wpm',
    'computer_skills',
    'driving_license_car', 'driving_license_car_type',
    'driving_license_motorcycle', 'driving_license_motorcycle_type',
    'office_equipment_skills',
    'hobbies', 'sports', 'special_knowledge', 'other_skills',
    'can_work_upcountry', 'can_work_upcountry_note',
    'has_vehicle', 'vehicles',
    'has_chronic_disease', 'chronic_disease_details',
    'had_surgery', 'surgery_details',
    'has_criminal_record', 'criminal_record_details',
    // Step 5
    'emergency_contact_name', 'emergency_contact_relation',
    'emergency_contact_address', 'emergency_contact_phone',
    'reference_persons',
    'allow_background_check', 'background_check_reason',
    'applied_before', 'applied_before_date',
    'knows_ebci_employees',
    'heard_from', 'heard_from_other',
    'can_start_date', 'consider_other_positions',
    'pdpa_consented',
    'signature_data', 'signed_date', 'signed_location',
]
