import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { refreshSignedUrl } from '@/lib/applicant-files'
import { ApplicantsListView } from './applicants-view'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface SearchParams {
    q?: string
    status?: string
    position?: string
    from?: string
    to?: string
    page?: string
}

export default async function HrApplicantsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    // Auth guard — HR staff (legacy hr_admin role OR can_edit_employees / can_manage_system)
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/hradmin/dashboard')

    const sp = await searchParams
    const q = (sp.q ?? '').trim()
    const status = (sp.status ?? 'all').trim()
    const position = (sp.position ?? '').trim()
    const from = sp.from ?? ''
    const to = sp.to ?? ''
    const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
    const offset = (page - 1) * PAGE_SIZE

    // Base query + filters
    let query = supabaseAdmin
        .from('job_applications')
        .select(`
            id, reference_code, application_status, current_step,
            position_applied, expected_salary,
            first_name_th, last_name_th, nickname, email, phone_mobile,
            photo_url, created_at, submitted_at, last_saved_at
        `, { count: 'exact' })

    if (status !== 'all') query = query.eq('application_status', status)
    if (position) query = query.ilike('position_applied', `%${position}%`)
    if (from) query = query.gte('created_at', `${from}T00:00:00`)
    if (to)   query = query.lte('created_at', `${to}T23:59:59.999`)

    if (q) {
        // Search across reference_code OR email OR first_name_th OR last_name_th
        query = query.or([
            `reference_code.ilike.%${q}%`,
            `email.ilike.%${q}%`,
            `first_name_th.ilike.%${q}%`,
            `last_name_th.ilike.%${q}%`,
            `nickname.ilike.%${q}%`,
        ].join(','))
    }

    // Default: submitted first (most actionable), then newest
    query = query
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

    const { data: rows, count, error } = await query
    if (error) {
        console.error('[hradmin/applicants] query error:', error)
    }

    // Also fetch summary counts by status for the filter chips
    const { data: statusCounts } = await supabaseAdmin
        .from('job_applications')
        .select('application_status')

    const counts: Record<string, number> = { all: 0 }
    for (const r of statusCounts ?? []) {
        const s = String(r.application_status ?? 'unknown')
        counts[s] = (counts[s] ?? 0) + 1
        counts.all += 1
    }

    const total = count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    // Re-sign every applicant photo URL — uploads stamp a 7-day expiry
    // into the saved URL, which goes 403 once the hiring cycle drifts
    // past a week. /hradmin/applicants/[id] already does this for the
    // detail view; here we do the same for the grid so cards stop
    // rendering broken-image alt-text on older entries. Done in parallel
    // because each call is one Supabase round-trip and PAGE_SIZE caps
    // the fan-out at 20.
    const rowsWithFreshPhotos = await Promise.all(
        (rows ?? []).map(async row => ({
            ...row,
            photo_url: await refreshSignedUrl((row as { photo_url?: string | null }).photo_url ?? null),
        })),
    )

    return (
        <ApplicantsListView
            items={rowsWithFreshPhotos}
            total={total}
            page={Math.min(page, totalPages)}
            pageSize={PAGE_SIZE}
            totalPages={totalPages}
            filters={{ q, status, position, from, to }}
            counts={counts}
        />
    )
}
