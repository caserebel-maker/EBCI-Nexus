'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

export async function login(formData: FormData) {
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    console.log(`[Login] Attempt for user: ${username}`)

    if (!username || !password) {
        return { error: 'Please provide both username and password' }
    }

    try {
        // 1. Find User in DB
        const user = await prisma.user.findUnique({
            where: { username },
        })
        console.log(`[Login] User found: ${!!user}`)

        // 2. Validate Credentials (Simple check for Phase 1)
        if (!user || user.password !== password) {
            console.log(`[Login] Invalid credentials for ${username}`)
            return { error: 'Invalid credentials' }
        }

        // 3. Create Session (Cookie)
        // In production, sign this payload with a JWT library (jose/jsonwebtoken)
        const sessionData = JSON.stringify({
            id: user.id,
            role: user.role,
            name: user.name
        })

        // Phase 1: Simple cookie storage
        const cookieStore = await cookies();
        cookieStore.set('nexus_session', sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 Week
            path: '/',
        })

        // 4. Redirect based on role
    } catch (error) {
        console.error('Login error:', error)
        return { error: 'System error occurred. Please try again.' }
    }

    redirect(username === 'admin' ? '/dashboard' : '/portal')
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('nexus_session')
    redirect('/login')
}
