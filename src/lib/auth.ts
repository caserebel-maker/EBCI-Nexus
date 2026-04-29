import 'server-only'

import { cookies } from 'next/headers'
import type { SessionUser } from './auth-types'
import { SESSION_COOKIE_NAME, verifySessionCookie } from './session-cookie'

// Re-export type so existing server-side imports keep working.
export type { SessionUser } from './auth-types'

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies()
    return verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}
