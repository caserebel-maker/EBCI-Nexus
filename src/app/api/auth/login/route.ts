import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { ROLE_CONFIG, type UserRole } from '@/config/roles'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json(
                { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
                { status: 400 }
            )
        }

        // Use Supabase Auth — no Prisma / DATABASE_URL needed
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error || !data.user) {
            console.log(`[Auth] Failed login: ${email} — ${error?.message}`)
            return NextResponse.json(
                { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
                { status: 401 }
            )
        }

        const user = data.user
        const meta = user.user_metadata ?? {}

        // Role and name come from Supabase Auth user_metadata
        const role: UserRole = (meta.role as UserRole) ?? 'employee'
        const name: string = meta.name ?? meta.full_name ?? user.email ?? 'User'

        // Build session cookie (same format as before — compatible with all existing middleware/pages)
        const sessionData = JSON.stringify({ id: user.id, role, name })

        const cookieStore = await cookies()
        cookieStore.set('nexus_session', sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        })

        const redirectTo = ROLE_CONFIG[role]?.homePath ?? '/portal'
        console.log(`[Auth] Login OK: ${email} role=${role} → ${redirectTo}`)

        return NextResponse.json({ success: true, role, redirectTo })

    } catch (error) {
        console.error('[Auth] Login error:', error)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 })
    }
}
