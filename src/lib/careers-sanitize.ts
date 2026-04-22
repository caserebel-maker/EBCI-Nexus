import 'server-only'

/**
 * Columns the client is never allowed to write from /start or
 * /autosave. Everything else from the body is forwarded to the DB
 * after sanitization.
 */
export const FORBIDDEN_APPLY_FIELDS: ReadonlySet<string> = new Set([
    'id',
    'reference_code',
    'application_status',
    'created_at',
    'updated_at',
    'submitted_at',
    'reviewed_by',
    'reviewed_at',
    'review_notes',
    'interview_evaluation',
    'pdpa_consented_at',
    'ip_address',
    'user_agent',
    'last_saved_at',
])

/**
 * Postgres date / numeric columns on job_applications. When the client
 * hasn't filled one yet, its form state is an empty string — which a
 * `date` column rejects with `invalid input syntax for type date: ""`
 * (same for `numeric`/`integer`).
 *
 * Sanitize by converting `''` → `null` for each of these, in both
 * /start and /autosave, so the insert/update succeeds regardless of
 * which client sent it.
 */
const DATE_COLUMNS: ReadonlySet<string> = new Set([
    'date_of_birth',
    'id_card_issued_date',
    'id_card_expiry_date',
    'can_start_date',
    'signed_date',
])

const NUMERIC_COLUMNS: ReadonlySet<string> = new Set([
    'expected_salary',
    'age',
    'height_cm',
    'weight_kg',
    'father_age',
    'mother_age',
    'children_count',
    'children_male',
    'children_female',
    'children_not_in_school',
    'children_studying',
    'siblings_total',
    'siblings_male',
    'siblings_female',
    'applicant_birth_order',
    'typing_thai_wpm',
    'typing_english_wpm',
])

/**
 * Strip forbidden keys and coerce empty strings to null for columns
 * where Postgres would otherwise reject them. Other values pass through
 * unchanged (jsonb arrays, booleans, normal text).
 *
 * Returns a new object — input is not mutated.
 */
export function sanitizeApplyFields(
    raw: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw ?? {})) {
        if (FORBIDDEN_APPLY_FIELDS.has(k)) continue
        if (v === '' && (DATE_COLUMNS.has(k) || NUMERIC_COLUMNS.has(k))) {
            out[k] = null
            continue
        }
        out[k] = v
    }
    return out
}
