import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

/**
 * All /api/hradmin/leave/policies/* routes go through this guard.
 * Returns a NextResponse (403/401) when blocked, or null when OK.
 */
export async function requireHrAdmin(): Promise<NextResponse | null> {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'hr_admin') {
        return NextResponse.json({ error: 'Forbidden — HR Admin only' }, { status: 403 })
    }
    return null
}

/** Strip/coerce the user-editable subset of leave_policies columns. */
export function sanitizePolicyPayload(raw: Record<string, unknown>) {
    const numOrNull = (v: unknown): number | null => {
        if (v === null || v === undefined || v === '') return null
        const n = Number(v)
        return Number.isFinite(n) ? n : null
    }
    const strOrNull = (v: unknown): string | null => {
        if (v === null || v === undefined) return null
        const s = String(v).trim()
        return s.length ? s : null
    }
    return {
        leave_type_id: strOrNull(raw.leave_type_id),
        min_level: numOrNull(raw.min_level),
        max_level: numOrNull(raw.max_level),
        min_years_service: numOrNull(raw.min_years_service),
        max_years_service: numOrNull(raw.max_years_service),
        position_pattern: strOrNull(raw.position_pattern),
        days_per_year: numOrNull(raw.days_per_year),
        description: strOrNull(raw.description),
        priority: numOrNull(raw.priority) ?? 0,
        is_active: raw.is_active === undefined ? true : Boolean(raw.is_active),
    }
}
