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
            if (pathname.startsWith('/hradmin')) {
                // HR admin entry → return to hradmin dashboard after login
                loginUrl.searchParams.set('redirect', '/hradmin/dashboard')
            } else if (pathname.startsWith('/portal')) {
                // Employee/manager entry → return to portal after login
                loginUrl.searchParams.set('redirect', '/portal')
            }
            return NextResponse.redirect(loginUrl)
        }
        return NextResponse.next()
    }

    // ── 2. Parse session ──────────────────────────────────────────────────────
    let role: UserRole | null = null
    try {
        const parsed = JSON.parse(sessionCookie)
        role = parsed.role
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

    // Permission-flag-gated /hradmin paths that non-hr_admin roles may
    // still reach when they hold the right per-user flag. The middleware
    // can't read DB flags (no I/O here for perf), so it whitelists the
    // path and defers the actual flag check to the page-level guard
    // (e.g. canManagePayroll(auth) at /hradmin/payroll/bulk/page.tsx).
    // Tighten this list carefully — every entry is a path that bypasses
    // the role gate.
    const isFlagGatedHradminPath =
        pathname === '/hradmin/payroll/bulk' ||
        pathname.startsWith('/hradmin/payroll/bulk/')

    if (role === 'hr_admin') {
        // hr_admin: full access to /hradmin and /portal — no restrictions
        return NextResponse.next()
    }

    if (role === 'employee') {
        // employee: /portal only — block /hradmin EXCEPT flag-gated paths
        // like /hradmin/payroll/bulk where a Payroll Manager-preset user
        // (can_manage_payroll=true) is allowed in. Real authorization
        // happens at the page level — middleware just opens the door.
        if (pathname.startsWith('/hradmin') && !isFlagGatedHradminPath) {
            return NextResponse.redirect(new URL('/portal', request.url))
        }
        return NextResponse.next()
    }

    if (role === 'manager') {
        // manager: /portal + /hradmin/leave/approve + flag-gated paths.
        // Same rationale as the employee branch — managers who hold
        // can_manage_payroll need the same payroll/bulk door open.
        if (
            pathname.startsWith('/hradmin') &&
            pathname !== '/hradmin/leave/approve' &&
            !pathname.startsWith('/hradmin/leave/approve/') &&
            !isFlagGatedHradminPath
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
