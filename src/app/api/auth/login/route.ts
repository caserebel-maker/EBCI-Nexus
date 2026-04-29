import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ROLE_CONFIG, type UserRole } from '@/config/roles'
import {
    createSessionCookie,
    SESSION_COOKIE_MAX_AGE_SECONDS,
    SESSION_COOKIE_NAME,
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
        const { email, password, redirectTo: requestedRedirect } = body

        if (!email || !password) {
            return NextResponse.json(
                { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
                { status: 400 }
            )
        }

        const emailLower = String(email).trim().toLowerCase()
        const ip = await clientIp()

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

        // Use supabaseAdmin.auth.signInWithPassword — zero Prisma / DATABASE_URL dependency
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        })

        if (error || !data.user) {
            // Record the failure BEFORE returning so the next attempt
            // sees an updated counter. await on this so a fast attacker
            // can't out-race the insert by submitting back-to-back.
            await recordAttempt(emailLower, ip, false)
            console.log(`[Auth] Failed: ${email} — ${error?.message}`)
            return NextResponse.json(
                { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
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

        const sessionData = await createSessionCookie({
            id: data.user.id,
            role,
            name,
            email: data.user.email ?? emailLower,
            employeeId,
        })
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
            maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
            path: '/',
        })

        const homePath = ROLE_CONFIG[role]?.homePath ?? '/portal'
        const redirectTo = sanitizeRedirectPath(requestedRedirect, role) ?? homePath
        console.log(`[Auth] OK: ${email} role=${role} → ${redirectTo} (requested=${requestedRedirect ?? 'none'})`)

        return NextResponse.json({ success: true, role, redirectTo })

    } catch (err) {
        console.error('[Auth] Error:', err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 })
    }
}
