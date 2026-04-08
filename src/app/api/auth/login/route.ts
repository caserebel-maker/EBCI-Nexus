import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
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
        const role: UserRole = (meta.role as UserRole) ?? 'employee'
        const name: string = meta.name ?? meta.full_name ?? data.user.email ?? 'User'

        const sessionData = JSON.stringify({ id: data.user.id, role, name })
        const cookieStore = await cookies()
        cookieStore.set('nexus_session', sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

        const redirectTo = ROLE_CONFIG[role]?.homePath ?? '/portal'
        console.log(`[Auth] OK: ${email} role=${role} → ${redirectTo}`)

        return NextResponse.json({ success: true, role, redirectTo })

    } catch (err) {
        console.error('[Auth] Error:', err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 })
    }
}
