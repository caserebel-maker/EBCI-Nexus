import { cookies } from 'next/headers'

export interface SessionUser {
    id: string
    role: 'hr_admin' | 'manager' | 'employee'
    name: string
    employeeId?: string // linked employee record id
}

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')

    if (!sessionCookie?.value) return null

    try {
        return JSON.parse(sessionCookie.value) as SessionUser
    } catch (error) {
        return null
    }
}
