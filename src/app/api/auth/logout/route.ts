import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
    const cookieStore = await cookies()
    cookieStore.delete('nexus_session')
    return NextResponse.json({ success: true, redirectTo: '/login' })
}
