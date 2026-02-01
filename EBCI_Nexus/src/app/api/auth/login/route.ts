import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { username, password } = body

        console.log(`[API Login] Attempt: ${username}`)

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Please provide both username and password' },
                { status: 400 }
            )
        }

        // 1. Find User
        const user = await prisma.user.findUnique({
            where: { username }
        })

        // 2. Validate
        if (!user || user.password !== password) {
            console.log(`[API Login] Invalid credentials for ${username}`)
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        // 3. Create Session
        const sessionData = JSON.stringify({
            id: user.id,
            role: user.role,
            name: user.name
        })

        const cookieStore = await cookies()
        cookieStore.set('nexus_session', sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

        // 4. Return success and role for client redirect
        return NextResponse.json({
            success: true,
            role: user.role,
            redirectTo: user.username === 'admin' ? '/dashboard' : '/portal'
        })

    } catch (error) {
        console.error('Login API Error:', error)
        return NextResponse.json(
            { error: 'System error occurred' },
            { status: 500 }
        )
    }
}
