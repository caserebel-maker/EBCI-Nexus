import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie'

export async function POST() {
    const cookieStore = await cookies()

    // Delete our custom session cookie
    cookieStore.delete(SESSION_COOKIE_NAME)

    // Also delete Supabase auth cookies (sb-*-auth-token pattern)
    const allCookies = cookieStore.getAll()
    for (const cookie of allCookies) {
        if (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) {
            cookieStore.delete(cookie.name)
        }
    }

    // Build response with explicit Set-Cookie headers as fallback
    const res = NextResponse.json({ success: true })

    // Explicitly expire nexus_session via response header
    res.cookies.set(SESSION_COOKIE_NAME, '', {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
    })

    // Expire any sb-* auth cookies found
    for (const cookie of allCookies) {
        if (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) {
            res.cookies.set(cookie.name, '', {
                maxAge: 0,
                path: '/',
                sameSite: 'lax',
            })
        }
    }

    return res
}
