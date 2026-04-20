import 'server-only'

import { cookies } from 'next/headers'
import type { SessionUser } from './auth-types'

// Re-export type so existing server-side imports keep working.
export type { SessionUser } from './auth-types'

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')

    if (!sessionCookie?.value) return null

    try {
        return JSON.parse(sessionCookie.value) as SessionUser
    } catch {
        return null
    }
}
