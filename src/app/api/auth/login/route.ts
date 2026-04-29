import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ROLE_CONFIG, type UserRole } from '@/config/roles'

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

        // Use supabaseAdmin.auth.signInWithPassword — zero Prisma / DATABASE_URL dependency
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        })

        if (error || !data.user) {
            console.log(`[Auth] Failed: ${email} — ${error?.message}`)
            return NextResponse.json(
                { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
                { status: 401 }
            )
        }

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

        const sessionData = JSON.stringify({ id: data.user.id, role, name, employeeId })
        const cookieStore = await cookies()
        // sameSite='lax' is the modern default in major browsers, but
        // an explicit value is the safer call: it locks CSRF protection
        // against future browser-default changes and matches what the
        // logout route already sets when clearing the cookie. Lax is the
        // right level here — Strict would break top-level GET-from-link
        // navigation (an HR admin opening /hradmin from a Slack link
        // would lose their session); we don't accept POSTs without an
        // existing same-origin context.
        cookieStore.set('nexus_session', sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

        const homePath = ROLE_CONFIG[role]?.homePath ?? '/portal'
        // Use requested redirect if present, but block non-hr_admin from /hradmin paths
        const redirectTo = (requestedRedirect && !(requestedRedirect.startsWith('/hradmin') && role !== 'hr_admin'))
            ? requestedRedirect
            : homePath
        console.log(`[Auth] OK: ${email} role=${role} → ${redirectTo} (requested=${requestedRedirect ?? 'none'})`)

        return NextResponse.json({ success: true, role, redirectTo })

    } catch (err) {
        console.error('[Auth] Error:', err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 })
    }
}
