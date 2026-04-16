import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROLE_CONFIG, type UserRole } from '@/config/roles'

const PROTECTED_PREFIXES = ['/dashboard', '/portal', '/employees', '/recruitment', '/leave']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionCookie = request.cookies.get('nexus_session')?.value

    // ── 1. No session → redirect to login ────────────────────────────────────
    if (!sessionCookie) {
        if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        return NextResponse.next()
    }

    // ── 2. Parse session ──────────────────────────────────────────────────────
    let role: UserRole | null = null
    try {
        role = JSON.parse(sessionCookie).role
    } catch {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (!role || !ROLE_CONFIG[role]) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // ── 3. Already logged in, trying to visit /login → go home ───────────────
    if (pathname === '/login') {
        return NextResponse.redirect(new URL(ROLE_CONFIG[role].homePath, request.url))
    }

    // ── 4. Role-based access control ─────────────────────────────────────────

    if (role === 'hr_admin') {
        // hr_admin: full access to /dashboard and /portal — no restrictions
        return NextResponse.next()
    }

    if (role === 'employee') {
        // employee: /portal only — block /dashboard
        if (pathname.startsWith('/dashboard')) {
            return NextResponse.redirect(new URL('/portal', request.url))
        }
        return NextResponse.next()
    }

    if (role === 'manager') {
        // manager: /portal + /dashboard/leave/approve only
        if (
            pathname.startsWith('/dashboard') &&
            pathname !== '/dashboard/leave/approve' &&
            !pathname.startsWith('/dashboard/leave/approve/')
        ) {
            return NextResponse.redirect(new URL('/portal', request.url))
        }
        return NextResponse.next()
    }

    // Unknown role → login
    return NextResponse.redirect(new URL('/login', request.url))
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
        '/login',
    ],
}
