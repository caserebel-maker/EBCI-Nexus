import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const path = req.nextUrl.searchParams.get('path')
        const scope = req.nextUrl.searchParams.get('scope')

        // Active threshold: past 3 minutes (180 seconds)
        const threshold = new Date(Date.now() - 3 * 60 * 1000).toISOString()

        let query = supabaseAdmin
            .from('employees')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
            .gte('last_active_at', threshold)

        if (scope !== 'all') {
            if (!path) {
                return NextResponse.json({ error: 'Path is required' }, { status: 400 })
            }
            query = query.eq('last_active_path', path)
        }

        const { count, error } = await query

        if (error) {
            console.error('[active-count] DB error:', error)
            return NextResponse.json({ activeCount: 1 }) // fallback to 1 (current user)
        }

        // Return count (minimum 1 as the current user is active on it)
        const activeCount = Math.max(1, count ?? 0)
        return NextResponse.json({ activeCount })
    } catch (e: unknown) {
        console.error('[active-count] error:', e)
        return NextResponse.json({ activeCount: 1 })
    }
}
