import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'

/**
 * GET /api/announcements/archive?page=1&limit=10
 *
 * Returns expired announcements (publish_status='published' AND
 * expires_at <= NOW()), newest first, paginated.
 */
export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '10', 10) || 10))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const nowIso = new Date().toISOString()

    const { data, count, error } = await supabaseAdmin
        .from('announcements')
        .select('id, headline, content, priority, publish_date, expires_at, image_path, created_by', { count: 'exact' })
        .eq('publish_status', 'published')
        .not('expires_at', 'is', null)
        .lte('expires_at', nowIso)
        .order('publish_date', { ascending: false })
        .range(from, to)

    if (error) {
        console.error('[archive api] query failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const items = (data ?? []).map(a => {
        let imageUrl: string | null = null
        if (a.image_path) {
            imageUrl = String(a.image_path).startsWith('http')
                ? String(a.image_path)
                : `${supabaseUrl}/storage/v1/object/public/announcement-images/${a.image_path}`
        }
        return { ...a, imageUrl }
    })

    const total = count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({
        items,
        total,
        page,
        pageSize,
        totalPages,
    })
}
