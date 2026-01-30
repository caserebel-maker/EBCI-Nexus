import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isRouteAllowed, ROLE_CONFIG, type UserRole } from '@/config/roles'

export function middleware(request: NextRequest) {
    const session = request.cookies.get('nexus_session')?.value
    const path = request.nextUrl.pathname

    // 1. If trying to access protected routes without session, redirect to login
    if (!session) {
        // Build a regex only for simple startsWith checks if needed, or check prefixes manually
        // For simplicity, we assume any path not public needs checks if it matches known prefixes
        const protectedPrefixes = ['/dashboard', '/portal', '/employees', '/recruitment']
        if (protectedPrefixes.some(prefix => path.startsWith(prefix))) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // 2. If logged in...
    if (session) {
        // Parse user role
        let user: { role: UserRole } | null = null
        try {
            user = JSON.parse(session)
        } catch (e) {
            // Invalid session
            return NextResponse.redirect(new URL('/login', request.url))
        }

        if (!user || !user.role || !ROLE_CONFIG[user.role]) {
            // Invalid role or user structure
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // 2a. Prevent accessing login page again -> Redirect to Role Home
        if (path === '/login') {
            const home = ROLE_CONFIG[user.role].homePath
            return NextResponse.redirect(new URL(home, request.url))
        }

        // 2b. Role-Based Access Control (Dynamic)
        // If the path falls under ANY protected area, we strictly enforce isRouteAllowed
        // We define what constitutes a "protected area" broadly or check specific prefixes
        const isProtectedContext = ['/dashboard', '/portal', '/employees', '/recruitment'].some(p => path.startsWith(p))

        if (isProtectedContext) {
            if (!isRouteAllowed(user.role, path)) {
                // Unauthorized Access for this specific path
                // Redirect them to their safe "Home"
                const safeHome = ROLE_CONFIG[user.role].homePath
                return NextResponse.redirect(new URL(safeHome, request.url))
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/portal/:path*', '/employees/:path*', '/recruitment/:path*', '/login'],
}
