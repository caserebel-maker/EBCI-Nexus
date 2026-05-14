import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ROLE_CONFIG, type UserRole } from '@/config/roles'
import {
    createSessionCookie,
    SESSION_COOKIE_MAX_AGE_SECONDS,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_REMEMBER_AGE_SECONDS,
} from '@/lib/session-cookie'

// Rate-limit thresholds. Tuned to block credential-stuffing without
// frustrating legitimate users who fat-finger a password a few times.
//   - 5 fails per email in 5 min  → block that email for 15 min
//   - 20 fails per IP in 5 min     → block that IP for 15 min
// Both windows roll: the count is "fails in last 5 min", not "fails
// since last reset", so a successful login doesn't free up an attacker
// who's still spraying.
const RL_WINDOW_MIN = 5
const RL_BLOCK_MIN  = 15
const RL_EMAIL_MAX  = 5
const RL_IP_MAX     = 20

function createAuthClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    )
}

interface RateLimitDecision {
    blocked: boolean
    reason?: 'email' | 'ip'
    retryAfterSec?: number
}

function sanitizeRedirectPath(value: unknown, role: UserRole): string | null {
    if (typeof value !== 'string') return null
    if (!value.startsWith('/') || value.startsWith('//')) return null

    try {
        const parsed = new URL(value, 'https://nexus.local')
        const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
        if (path.startsWith('/hradmin') && role !== 'hr_admin') {
            const isPayrollBulk = parsed.pathname === '/hradmin/payroll/bulk'
                || parsed.pathname.startsWith('/hradmin/payroll/bulk/')
            return isPayrollBulk ? path : null
        }
        return path
    } catch {
        return null
    }
}

/**
 * Resolve the actual `auth.users.email` to use for sign-in from a free-form
 * login identifier. Accepts either:
 *
 *   - an email   (contains `@`) — used as-is, lowercased
 *   - an employee_code (no `@`) — looked up against `employees.employee_code`
 *     and the matching `employees.email` is returned
 *
 * The employee-code path is tolerant of casual formatting:
 *   "074-47", "07447", "074 47", " 074-47 " all resolve to the same row.
 *
 * Returns null when nothing matches; the caller treats that the same as a
 * wrong-password attempt so we don't leak which codes exist.
 */
async function resolveLoginEmail(rawInput: string): Promise<string | null> {
    const trimmed = rawInput.trim()
    if (!trimmed) return null

    if (trimmed.includes('@')) {
        return trimmed.toLowerCase()
    }

    // Employee code path. Every code in the DB is stored as `XXX-YY`
    // (verified: 55/55 rows have a dash). Postgrest's .or() can't
    // call replace() server-side, so the resilient way to match
    // "074-47" / "07447" / "074 47" against the canonical "074-47"
    // row is to fetch all (codes, emails) pairs and compare on the
    // normalized form in JS. ~55 rows × ~30 bytes = ~2 KB per login,
    // cheap given the per-attempt rate-limit cap. Refactor to a
    // SECURITY DEFINER RPC if the directory grows past a few hundred.
    const inputNormalized = trimmed.replace(/[\s-]/g, '').toLowerCase()
    if (!inputNormalized) return null

    const { data, error } = await supabaseAdmin
        .from('employees')
        .select('email, employee_code')
        .not('employee_code', 'is', null)
    if (error) {
        console.warn('[Auth] employee_code lookup failed:', error)
        return null
    }
    const match = (data ?? []).find(r => {
        const code = (r.employee_code as string | null) ?? ''
        return code.replace(/[\s-]/g, '').toLowerCase() === inputNormalized
    })
    const email = (match?.email as string | null)?.trim()
    if (!email) return null
    return email.toLowerCase()
}

/** Pull the client IP out of the proxy headers Vercel sets. Falls back
 *  to null if neither header is set (local dev usually) so the IP
 *  bucket simply doesn't fire. */
async function clientIp(): Promise<string | null> {
    const h = await headers()
    const fwd = h.get('x-forwarded-for')
    if (fwd) return fwd.split(',')[0].trim()
    return h.get('x-real-ip')
}

/** Return whether to block this attempt + which counter tripped. */
async function checkRateLimit(emailLower: string, ip: string | null): Promise<RateLimitDecision> {
    const sinceIso = new Date(Date.now() - RL_WINDOW_MIN * 60 * 1000).toISOString()

    // Email bucket — narrowest signal, check first.
    const { count: emailFails } = await supabaseAdmin
        .from('login_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('email_lower', emailLower)
        .eq('success', false)
        .gte('attempted_at', sinceIso)
    if ((emailFails ?? 0) >= RL_EMAIL_MAX) {
        return { blocked: true, reason: 'email', retryAfterSec: RL_BLOCK_MIN * 60 }
    }

    if (ip) {
        const { count: ipFails } = await supabaseAdmin
            .from('login_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('ip_address', ip)
            .eq('success', false)
            .gte('attempted_at', sinceIso)
        if ((ipFails ?? 0) >= RL_IP_MAX) {
            return { blocked: true, reason: 'ip', retryAfterSec: RL_BLOCK_MIN * 60 }
        }
    }
    return { blocked: false }
}

/** Best-effort attempt log. Errors are swallowed so a transient DB
 *  glitch doesn't block legitimate logins; in that case we lose a
 *  tick of rate-limit accuracy, not auth. */
async function recordAttempt(emailLower: string, ip: string | null, success: boolean) {
    try {
        await supabaseAdmin.from('login_attempts').insert({
            email_lower: emailLower,
            ip_address: ip,
            success,
        })
    } catch (err) {
        console.warn('[Auth] login_attempts insert failed:', err)
    }
}

/**
 * Resolve role from the public."User" table when auth metadata is
 * missing it. Tries two link patterns, in order of reliability:
 *   1. Direct id match — public."User".id == auth.users.id
 *   2. Via employees.email — employees.email == auth.users.email
 *      → employees.user_id → public."User".id
 *
 * Legacy accounts split across these patterns because public."User"
 * still holds CUID ids from the Prisma era alongside newer UUID rows
 * that do match auth.users.id.
 */
async function lookupRoleFromUserTable(
    authUserId: string,
    email: string | null | undefined,
): Promise<UserRole | undefined> {
    try {
        const { data: byId } = await supabaseAdmin
            .from('User')
            .select('role')
            .eq('id', authUserId)
            .maybeSingle()
        if (byId?.role) return byId.role as UserRole

        if (!email) return undefined

        const { data: emp } = await supabaseAdmin
            .from('employees')
            .select('user_id')
            .eq('email', email)
            .maybeSingle()
        if (emp?.user_id) {
            const { data: byUserId } = await supabaseAdmin
                .from('User')
                .select('role')
                .eq('id', emp.user_id)
                .maybeSingle()
            if (byUserId?.role) return byUserId.role as UserRole
        }
    } catch (err) {
        console.error('[Auth] role lookup fallback failed:', err)
    }
    return undefined
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        // The form field is still called `email` for backward compat
        // (existing sessions, password-reset flows, etc.) but the value
        // is now a free-form login identifier — accepts either an email
        // or an employee_code. resolveLoginEmail() handles the lookup.
        const {
            email: loginInput,
            password,
            redirectTo: requestedRedirect,
            // "จำฉันไว้" checkbox — extends the cookie max-age + the
            // signed payload's `exp` from 7 days to 30 days. Same
            // hardening (httpOnly, secure, sameSite=lax, HMAC sig);
            // only the lifetime changes.
            rememberMe,
        } = body

        if (!loginInput || !password) {
            return NextResponse.json(
                { error: 'กรุณากรอกรหัสพนักงาน/อีเมล และรหัสผ่าน' },
                { status: 400 }
            )
        }

        const ip = await clientIp()

        // Resolve the input → actual auth.users email. Failures here
        // return the same generic 401 as wrong-password so an attacker
        // can't enumerate which employee_codes exist.
        const resolvedEmail = await resolveLoginEmail(String(loginInput))
        if (!resolvedEmail) {
            // Log against the raw input bucket so rate-limit still
            // catches code-based spraying. We deliberately don't log
            // success/fail to avoid populating a "valid codes" oracle.
            await recordAttempt(String(loginInput).trim().toLowerCase(), ip, false)
            return NextResponse.json(
                { error: 'รหัสพนักงาน/อีเมล หรือรหัสผ่านไม่ถูกต้อง' },
                { status: 401 }
            )
        }
        const emailLower = resolvedEmail

        // Pre-flight rate-limit check. Do this BEFORE Supabase Auth so
        // a bot spraying passwords burns a ~5ms count() instead of a
        // network round-trip to Supabase per attempt.
        const limit = await checkRateLimit(emailLower, ip)
        if (limit.blocked) {
            console.warn(`[Auth] rate-limited: ${limit.reason} (email=${emailLower} ip=${ip})`)
            return NextResponse.json(
                {
                    error: limit.reason === 'email'
                        ? `บัญชีนี้พยายาม login ผิดเกินจำนวนครั้งที่อนุญาต — ลองใหม่ในอีก ${RL_BLOCK_MIN} นาที หรือใช้ "ลืมรหัสผ่าน?"`
                        : `เครื่องนี้พยายาม login ผิดเกินจำนวนครั้งที่อนุญาต — ลองใหม่ในอีก ${RL_BLOCK_MIN} นาที`,
                },
                {
                    status: 429,
                    headers: limit.retryAfterSec ? { 'Retry-After': String(limit.retryAfterSec) } : undefined,
                },
            )
        }

        // Use a short-lived anon auth client for password sign-in.
        // Do NOT call signInWithPassword on supabaseAdmin: the Supabase
        // JS client keeps auth state in memory, and Vercel can reuse the
        // module instance between requests. If the admin client gets
        // polluted with an employee access token, the next employee-code
        // lookup may run as the previous user instead of service-role.
        const authClient = createAuthClient()
        const { data, error } = await authClient.auth.signInWithPassword({
            email: emailLower,
            password,
        })

        if (error || !data.user) {
            // Record the failure BEFORE returning so the next attempt
            // sees an updated counter. await on this so a fast attacker
            // can't out-race the insert by submitting back-to-back.
            await recordAttempt(emailLower, ip, false)
            console.log(`[Auth] Failed: ${emailLower} (input='${loginInput}') — ${error?.message}`)
            return NextResponse.json(
                { error: 'รหัสพนักงาน/อีเมล หรือรหัสผ่านไม่ถูกต้อง' },
                { status: 401 }
            )
        }

        // Successful login — log it too so we have the full audit
        // trail (last successful login is useful for HR forensics).
        await recordAttempt(emailLower, ip, true)

        const meta = data.user.user_metadata ?? {}
        const appMeta = data.user.app_metadata ?? {}
        // Role resolution order:
        //   1. user_metadata.role  (source of truth for most accounts)
        //   2. app_metadata.role   (some Supabase-managed admins live here)
        //   3. app_metadata.claims_admin boolean → hr_admin
        //   4. Fallback: look up public."User".role so historical accounts
        //      whose auth metadata never got the role field still resolve
        //      correctly instead of silently defaulting to "employee".
        let rawRole: string | undefined =
            meta.role ?? appMeta.role ?? (appMeta.claims_admin ? 'hr_admin' : undefined)
        let roleSource: 'metadata' | 'user-table' | 'default' = rawRole ? 'metadata' : 'default'
        if (!rawRole) {
            const fallback = await lookupRoleFromUserTable(data.user.id, data.user.email)
            if (fallback) {
                rawRole = fallback
                roleSource = 'user-table'
            }
        }
        const role: UserRole = (rawRole as UserRole) ?? 'employee'
        console.log(`[Auth] user_metadata.role=${meta.role} app_metadata.role=${appMeta.role} → resolved=${role} (source=${roleSource})`)

        // Self-heal: when the role came from the User-table fallback, copy
        // it into auth metadata so the next login skips the extra queries
        // and future sessions elsewhere in the app see a consistent shape.
        if (roleSource === 'user-table') {
            supabaseAdmin.auth.admin
                .updateUserById(data.user.id, { user_metadata: { ...meta, role } })
                .catch(err => console.warn('[Auth] failed to persist resolved role to metadata:', err))
        }
        const name: string = meta.name ?? meta.full_name ?? data.user.email ?? 'User'
        const employeeId: string | undefined = meta.employeeId ?? undefined

        const wantsRemember = rememberMe === true || rememberMe === 'on'
        const sessionLifetime = wantsRemember
            ? SESSION_COOKIE_REMEMBER_AGE_SECONDS
            : SESSION_COOKIE_MAX_AGE_SECONDS
        const sessionData = await createSessionCookie(
            {
                id: data.user.id,
                role,
                name,
                email: data.user.email ?? emailLower,
                employeeId,
            },
            { expiresInSeconds: sessionLifetime },
        )
        const cookieStore = await cookies()
        // sameSite='lax' is the modern default in major browsers, but
        // an explicit value is the safer call: it locks CSRF protection
        // against future browser-default changes and matches what the
        // logout route already sets when clearing the cookie. Lax is the
        // right level here — Strict would break top-level GET-from-link
        // navigation (an HR admin opening /hradmin from a Slack link
        // would lose their session); we don't accept POSTs without an
        // existing same-origin context.
        cookieStore.set(SESSION_COOKIE_NAME, sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: sessionLifetime,
            path: '/',
        })

        const homePath = ROLE_CONFIG[role]?.homePath ?? '/portal'
        const redirectTo = sanitizeRedirectPath(requestedRedirect, role) ?? homePath
        console.log(`[Auth] OK: ${emailLower} role=${role} → ${redirectTo} (requested=${requestedRedirect ?? 'none'})`)

        return NextResponse.json({ success: true, role, redirectTo })

    } catch (err) {
        console.error('[Auth] Error:', err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 })
    }
}
