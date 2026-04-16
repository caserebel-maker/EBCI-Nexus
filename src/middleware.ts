import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROLE_CONFIG, type UserRole } from '@/config/roles'

const PROTECTED_PREFIXES = ['/hradmin', '/portal', '/employees', '/recruitment', '/leave']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionCookie = request.cookies.get('nexus_session')?.value

    // ── 0. Root redirect ─────────────────────────────────────────────────────
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/portal', request.url))
    }

    // ── 1. No session → redirect to login ────────────────────────────────────
    if (!sessionCookie) {
        if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
            const loginUrl = new URL('/login', request.url)
            if (pathname.startsWith('/portal')) {
                // Employee entry → send back to portal after login
                loginUrl.searchParams.set('redirect', '/portal')
            }
            // /hradmin entry → no redirect param → shows HR Admin badge
            return NextResponse.redirect(loginUrl)
        }
        return NextResponse.next()
    }

    // ── 2. Parse session ──────────────────────────────────────────────────────
    let role: UserRole | null = null
    try {
        const parsed = JSON.parse(sessionCookie)
        role = parsed.role
        console.log(`[middleware] path=${pathname} raw_session_keys=${Object.keys(parsed).join(',')} role=${role}`)
    } catch {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (!role || !ROLE_CONFIG[role]) {
        console.log(`[middleware] unknown role="${role}", redirecting to /login`)
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // ── 3. Already logged in, trying to visit /login → go home ───────────────
    if (pathname === '/login') {
        return NextResponse.redirect(new URL(ROLE_CONFIG[role].homePath, request.url))
    }

    // ── 4. Role-based access control ─────────────────────────────────────────

    if (role === 'hr_admin') {
        // hr_admin: full access to /hradmin and /portal — no restrictions
        return NextResponse.next()
    }

    if (role === 'employee') {
        // employee: /portal only — block /hradmin
        if (pathname.startsWith('/hradmin')) {
            return NextResponse.redirect(new URL('/portal', request.url))
        }
        return NextResponse.next()
    }

    if (role === 'manager') {
        // manager: /portal + /hradmin/leave/approve only
        if (
            pathname.startsWith('/hradmin') &&
            pathname !== '/hradmin/leave/approve' &&
            !pathname.startsWith('/hradmin/leave/approve/')
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
        '/',
        '/hradmin',
        '/hradmin/:path*',
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
