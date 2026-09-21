import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
    createSessionCookie,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_REMEMBER_AGE_SECONDS,
    SESSION_COOKIE_REMEMBER_REFRESH_THRESHOLD_SECONDS,
} from '@/lib/session-cookie'

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session || !session.employeeId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const employeeId = session.employeeId
        const now = new Date()

        const body = await req.json().catch(() => null)
        const path = typeof body?.path === 'string' ? body.path : null

        // Client activity is throttled to five minutes. Keep this endpoint to
        // one database operation so a normal presence update is inexpensive.
        const { error: updateError } = await supabaseAdmin
            .from('employees')
            .update({
                last_active_at: now.toISOString(),
                last_active_path: path,
            })
            .eq('id', employeeId)

        if (updateError) {
            console.error('[heartbeat] employee update error:', updateError)
        }

        const response = NextResponse.json({ success: true })
        const nowSeconds = Math.floor(Date.now() / 1000)
        const remainingSeconds = (session.sessionExpiresAt ?? 0) - nowSeconds

        // Refresh at most once every 30 active days. This keeps the 90-day
        // remembered-device window sliding without rewriting the cookie on
        // every heartbeat.
        if (session.rememberMe && remainingSeconds <= SESSION_COOKIE_REMEMBER_REFRESH_THRESHOLD_SECONDS) {
            const refreshedCookie = await createSessionCookie(session, {
                expiresInSeconds: SESSION_COOKIE_REMEMBER_AGE_SECONDS,
            })
            response.cookies.set(SESSION_COOKIE_NAME, refreshedCookie, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: SESSION_COOKIE_REMEMBER_AGE_SECONDS,
                path: '/',
            })
        }

        return response
    } catch (error: unknown) {
        console.error('[heartbeat] error:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Heartbeat failed',
        }, { status: 500 })
    }
}
