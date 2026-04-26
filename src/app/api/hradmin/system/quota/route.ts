import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, canManageSystem, isLegacyHrAdmin } from '@/lib/route-auth'

export const dynamic = 'force-dynamic'

// Supabase Free Tier limits (2026 plan). If Supabase changes pricing,
// update here — the UI reads these directly so everything stays in sync.
const FREE_TIER = {
    db_mb: 500,
    storage_mb: 1024,
    auth_users: 50_000,
} as const

const MB = 1024 * 1024

type Status = 'ok' | 'warning' | 'critical'

function classify(percent: number): Status {
    if (percent > 80) return 'critical'
    if (percent > 60) return 'warning'
    return 'ok'
}

function worst(statuses: Status[]): Status {
    if (statuses.includes('critical')) return 'critical'
    if (statuses.includes('warning')) return 'warning'
    return 'ok'
}

/** Months until a metric hits its limit at the current growth rate. null if growth <= 0 (can't project). */
function monthsUntilFull(currentBytes: number, limitBytes: number, growthBytesPerMonth: number): number | null {
    if (growthBytesPerMonth <= 0) return null
    const remaining = Math.max(0, limitBytes - currentBytes)
    return Math.round(remaining / growthBytesPerMonth)
}

/**
 * GET /api/hradmin/system/quota
 * HR-admin only. Returns an aggregated snapshot of Supabase resource
 * usage (DB size, storage per bucket, auth users, table row counts)
 * shaped for the dashboard, plus a recommendation level.
 */
export async function GET() {
    // System quota is super-admin territory: gated by can_manage_system OR legacy hr_admin role
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManageSystem(auth) && !isLegacyHrAdmin(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: raw, error } = await supabaseAdmin.rpc('get_system_quota')
    if (error) {
        console.error('[system/quota] rpc error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Raw shape from the SQL function — keep this narrow
    const rpc = raw as {
        db_size_bytes: number
        tables: Array<{ name: string; rows: number; size_bytes: number }>
        buckets: Array<{ name: string; count: number; size_bytes: number; public?: boolean }>
        storage_growth_30d_bytes: number
        auth_users_count: number
        auth_users_growth_30d: number
        computed_at: string
    }

    // ─── Database ──────────────────────────────────────────────────────────
    const dbSizeMb = rpc.db_size_bytes / MB
    const dbLimitMb = FREE_TIER.db_mb
    const dbPercent = (dbSizeMb / dbLimitMb) * 100
    const dbStatus = classify(dbPercent)

    // ─── Storage ──────────────────────────────────────────────────────────
    const storageBytes = rpc.buckets.reduce((sum, b) => sum + (b.size_bytes ?? 0), 0)
    const storageMb = storageBytes / MB
    const storageLimitMb = FREE_TIER.storage_mb
    const storagePercent = (storageMb / storageLimitMb) * 100
    const storageStatus = classify(storagePercent)
    const storageGrowthMb30d = rpc.storage_growth_30d_bytes / MB
    const storageMonthsLeft = monthsUntilFull(
        storageBytes,
        storageLimitMb * MB,
        rpc.storage_growth_30d_bytes,
    )

    const buckets = rpc.buckets.map(b => ({
        name: b.name,
        count: b.count,
        size_mb: +(b.size_bytes / MB).toFixed(2),
        size_bytes: b.size_bytes,
        percent_of_storage: storageBytes > 0 ? +((b.size_bytes / storageBytes) * 100).toFixed(1) : 0,
        public: Boolean(b.public),
    }))

    // ─── Auth ──────────────────────────────────────────────────────────────
    const authUsers = rpc.auth_users_count
    const authLimit = FREE_TIER.auth_users
    const authPercent = (authUsers / authLimit) * 100
    const authStatus = classify(authPercent)

    // ─── Tables ────────────────────────────────────────────────────────────
    const tables = rpc.tables.map(t => ({
        name: t.name,
        rows: t.rows,
        size_mb: +(t.size_bytes / MB).toFixed(2),
        size_bytes: t.size_bytes,
    }))
    const totalRows = tables.reduce((sum, t) => sum + t.rows, 0)

    // ─── Overall recommendation ───────────────────────────────────────────
    const overall = worst([dbStatus, storageStatus, authStatus])
    const nearLimitMetrics = [
        dbStatus !== 'ok' ? 'ฐานข้อมูล' : null,
        storageStatus !== 'ok' ? 'พื้นที่เก็บไฟล์' : null,
        authStatus !== 'ok' ? 'ผู้ใช้' : null,
    ].filter(Boolean) as string[]

    let recommendation: {
        level: Status
        headline: string
        body: string
        action?: { label: string; href: string } | null
    }

    if (overall === 'critical') {
        recommendation = {
            level: 'critical',
            headline: 'ต้อง upgrade ทันที',
            body: `${nearLimitMetrics.join(' · ')} เกิน 80% ของ free tier แล้ว แนะนำอัปเกรดเป็น Supabase Pro ($25/เดือน ~875 บาท) เพื่อได้ DB 8 GB, Storage 100 GB, backup รายวัน และ support`,
            action: { label: 'ไป Supabase Dashboard', href: 'https://supabase.com/dashboard' },
        }
    } else if (overall === 'warning') {
        recommendation = {
            level: 'warning',
            headline: 'ใกล้ถึง limit ของ free tier',
            body: `${nearLimitMetrics.join(' · ')} ใช้งานระหว่าง 60–80% ของ free tier แนะนำเตรียมการอัปเกรดในอีก 3–6 เดือนข้างหน้า`,
            action: { label: 'ดูแผน Supabase', href: 'https://supabase.com/pricing' },
        }
    } else {
        recommendation = {
            level: 'ok',
            headline: 'Free tier เพียงพอสำหรับการใช้งานปัจจุบัน',
            body: storageMonthsLeft && storageMonthsLeft < 24
                ? `อัตราการเพิ่มไฟล์ปัจจุบันประมาณเต็มใน ~${storageMonthsLeft} เดือน ยังไม่ต้องอัปเกรด แต่ควรติดตามต่อเนื่อง`
                : 'ยังไม่จำเป็นต้องอัปเกรดใน 12 เดือนข้างหน้า ใช้งาน Supabase Free ได้เต็มที่',
            action: null,
        }
    }

    return NextResponse.json({
        database: {
            size_mb: +dbSizeMb.toFixed(2),
            size_bytes: rpc.db_size_bytes,
            limit_mb: dbLimitMb,
            percent_used: +dbPercent.toFixed(2),
            status: dbStatus,
        },
        storage: {
            total_mb: +storageMb.toFixed(2),
            total_bytes: storageBytes,
            limit_mb: storageLimitMb,
            percent_used: +storagePercent.toFixed(2),
            status: storageStatus,
            growth_30d_mb: +storageGrowthMb30d.toFixed(2),
            months_until_full: storageMonthsLeft,
            buckets,
        },
        auth: {
            users: authUsers,
            users_growth_30d: rpc.auth_users_growth_30d,
            limit: authLimit,
            percent_used: +authPercent.toFixed(4),
            status: authStatus,
        },
        tables,
        total_rows: totalRows,
        services: {
            vercel: { plan: 'Hobby (Free)', status: 'active', cost_thb: 0, note: 'usage metrics ต้องเชื่อม API (phase ถัดไป)' },
            supabase: { plan: 'Free', status: 'active', cost_thb: 0, note: null },
            github: { plan: 'Free', status: 'active', cost_thb: 0, note: null },
            domain: { plan: 'เช่าโฮส', status: 'active', cost_thb: null, note: 'จัดการแยก' },
        },
        recommendation,
        computed_at: rpc.computed_at,
    })
}
