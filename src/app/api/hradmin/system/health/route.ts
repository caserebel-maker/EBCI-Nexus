import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { canManageSystem, getAuth, isHrStaff, isLegacyHrAdmin } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth) && !canManageSystem(auth) && !isLegacyHrAdmin(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
        .from('system_health_snapshots')
        .select('*')
        .eq('host_key', 'office-hip-sync-pc')
        .maybeSingle()

    if (error) {
        console.error('[system/health] lookup error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
        health: data ?? null,
        computed_at: new Date().toISOString(),
    })
}

