import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isRouteAllowed, ROLE_CONFIG, type UserRole } from '@/config/roles'

export function middleware(request: NextRequest) {
    const session = request.cookies.get('nexus_session')?.value
    const path = request.nextUrl.pathname

    // 1. If trying to access protected routes without session, redirect to login
    if (!session) {
        const protectedPrefixes = ['/dashboard', '/portal', '/employees', '/recruitment', '/leave']
        if (protectedPrefixes.some(prefix => path.startsWith(prefix))) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // 2. If logged in...
    if (session) {
        let user: { role: UserRole } | null = null
        try {
            user = JSON.parse(session)
        } catch (e) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        if (!user || !user.role || !ROLE_CONFIG[user.role]) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // 2a. Prevent accessing login page again -> Redirect to Role Home
        if (path === '/login') {
            const home = ROLE_CONFIG[user.role].homePath
            return NextResponse.redirect(new URL(home, request.url))
        }

        // 2b. Role-Based Access Control
        const isProtectedContext = ['/dashboard', '/portal', '/employees', '/recruitment', '/leave'].some(p => path.startsWith(p))

        if (isProtectedContext) {
            if (!isRouteAllowed(user.role, path)) {
                const safeHome = ROLE_CONFIG[user.role].homePath
                return NextResponse.redirect(new URL(safeHome, request.url))
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard',
        '/dashboard/:path*',
        '/portal',
        '/portal/:path*',
        '/employees',
        '/employees/:path*',
        '/recruitment',
        '/recruitment/:path*',
        '/careers',
        '/careers/:path*',
        '/leave',
        '/leave/:path*',
        '/login'
    ],
}
