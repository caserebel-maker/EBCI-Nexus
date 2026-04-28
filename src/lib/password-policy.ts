/**
 * Single source of truth for password rules — used wherever a user picks
 * or sets a password (recovery flow, in-app change, HR-side new-employee
 * invite, super-admin createUser modal). Keeping the policy here means
 * we don't end up with three definitions of "strong enough" that drift
 * out of sync.
 *
 * Rules are deliberately modest — these aren't bank-grade requirements,
 * just enough friction to keep "0000" / "password" out. The real
 * defence-in-depth lives at the auth layer (rate limiting, audit log).
 */

export const PASSWORD_MIN_LENGTH = 8

/**
 * Common weak passwords + tester-shared temp values that need to be
 * blocked specifically. Lowercased; comparison is case-insensitive.
 *
 * EbciTest2026! is the temp the seed script handed to ปุ๊/เบน/หนิง/ต่าย
 * for the beta — they MUST replace it on first login or they're back to
 * a known string.
 */
const BLOCKLIST = new Set([
    '00000000',
    '11111111',
    '12345678',
    '123456789',
    '1234567890',
    'password',
    'password1',
    'password123',
    'qwerty',
    'qwertyui',
    'qwerty123',
    'abc12345',
    'iloveyou',
    'ebcitest2026!',  // shared beta temp — block so testers can't keep it
    'ebcitest2026',
    'ebcinexus',
    'ebci2026',
    'ebci2025',
    'admin1234',
    'admin12345',
    'letmein',
    'welcome1',
    'welcome123',
])

export interface PasswordCheckResult {
    ok: boolean
    error?: string
}

/**
 * Validate a password against the policy. Returns the first failure
 * with a Thai message ready for showing in a toast / inline error.
 *
 * Order matters — the cheapest checks fire first so the user sees the
 * most useful guidance for their current input.
 */
export function checkPasswordPolicy(password: string): PasswordCheckResult {
    if (!password || password.length === 0) {
        return { ok: false, error: 'กรุณากรอกรหัสผ่าน' }
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
        return {
            ok: false,
            error: `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`,
        }
    }
    // Reject all-same-character passwords ("aaaaaaaa", "11111111").
    if (/^(.)\1+$/.test(password)) {
        return {
            ok: false,
            error: 'รหัสผ่านต้องไม่ใช่ตัวอักษร/ตัวเลขเดียวซ้ำกัน',
        }
    }
    if (BLOCKLIST.has(password.toLowerCase())) {
        return {
            ok: false,
            error: 'รหัสผ่านนี้คาดเดาง่ายเกินไป กรุณาเลือกรหัสที่ไม่ซ้ำกับคนอื่น',
        }
    }
    // Require at least one letter + one digit. Mixing categories raises
    // brute-force cost without forcing the kind of `!@#` requirement
    // that drives users to write passwords on sticky notes.
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return {
            ok: false,
            error: 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข',
        }
    }
    return { ok: true }
}
