import 'server-only'

import { cookies } from 'next/headers'
import type { SessionUser } from './auth-types'
import { SESSION_COOKIE_NAME, verifySessionCookie } from './session-cookie'
import { supabaseAdmin } from './supabase-admin'

// Re-export type so existing server-side imports keep working.
export type { SessionUser } from './auth-types'

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies()
    const session = await verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
    if (!session) return null

    // Per-user revocation without rotating the global cookie secret. Existing
    // cookies created before this field was introduced count as version 1, so
    // only users whose version is deliberately incremented are signed out.
    const query = supabaseAdmin
        .from('User')
        .select('session_version')
        .eq('id', session.id)
        .maybeSingle()
    let { data } = await query

    if (!data && session.email) {
        const fallback = await supabaseAdmin
            .from('User')
            .select('session_version')
            .ilike('username', session.email.trim())
            .maybeSingle()
        data = fallback.data
    }

    if (data) {
        const currentVersion = Number(data.session_version ?? 1)
        const cookieVersion = session.sessionVersion ?? 1
        if (currentVersion !== cookieVersion) return null
    }

    return session
}
