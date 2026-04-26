import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Megaphone, Plus } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { resolveCreators, displayCreator } from '@/lib/creators'
import { ManageAnnouncementsView } from './announcements-view'

export const dynamic = 'force-dynamic'

const ARCHIVE_PAGE_SIZE = 10

interface SearchParams {
    tab?: string
    page?: string
}

export default async function HrAnnouncementsManagePage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal/announcements')
    const session = auth.session

    const sp = await searchParams
    const initialTab: 'active' | 'archive' = sp.tab === 'archive' ? 'archive' : 'active'
    const requestedPage = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

    const nowIso = new Date().toISOString()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

    const resolveImage = (imagePath: string | null) => {
        if (!imagePath) return null
        return imagePath.startsWith('http')
            ? imagePath
            : `${supabaseUrl}/storage/v1/object/public/announcement-images/${imagePath}`
    }

    // Active: published + (no expiry OR expires in the future)
    const { data: activeRows } = await supabaseAdmin
        .from('announcements')
        .select('id, headline, content, priority, publish_date, expires_at, image_path, created_by')
        .eq('publish_status', 'published')
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('publish_date', { ascending: false })
        .limit(100)

    const activeCreatorMap = await resolveCreators((activeRows ?? []).map(a => a.created_by as string | null))
    const active = (activeRows ?? []).map(a => ({
        ...a,
        imageUrl: resolveImage(a.image_path as string | null),
        creator_name: displayCreator(a.created_by as string | null, activeCreatorMap),
    }))

    // Archive: expired — paginated 10/page
    const from = (requestedPage - 1) * ARCHIVE_PAGE_SIZE
    const to = from + ARCHIVE_PAGE_SIZE - 1
    const { data: archiveRows, count: archiveCount } = await supabaseAdmin
        .from('announcements')
        .select('id, headline, content, priority, publish_date, expires_at, image_path, created_by', { count: 'exact' })
        .eq('publish_status', 'published')
        .not('expires_at', 'is', null)
        .lte('expires_at', nowIso)
        .order('publish_date', { ascending: false })
        .range(from, to)

    const archiveTotal = archiveCount ?? 0
    const totalPages = Math.max(1, Math.ceil(archiveTotal / ARCHIVE_PAGE_SIZE))
    const initialPage = Math.min(requestedPage, totalPages)

    const archiveCreatorMap = await resolveCreators((archiveRows ?? []).map(a => a.created_by as string | null))
    const archiveInitial = (archiveRows ?? []).map(a => ({
        ...a,
        imageUrl: resolveImage(a.image_path as string | null),
        creator_name: displayCreator(a.created_by as string | null, archiveCreatorMap),
    }))

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                        <Megaphone size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">ประกาศข่าวสาร</h1>
                        <p className="text-sm text-white/50">จัดการประกาศภายในองค์กร</p>
                    </div>
                </div>
                <Link
                    href="/hradmin/hr/announcements"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#882136] hover:bg-[#a02640] text-white text-sm font-semibold rounded-lg shadow-lg shadow-[#882136]/30 transition-all active:scale-95"
                >
                    <Plus size={16} />
                    สร้างประกาศใหม่
                </Link>
            </div>

            <ManageAnnouncementsView
                activeItems={active}
                initialArchive={{
                    items: archiveInitial,
                    total: archiveTotal,
                    page: initialPage,
                    pageSize: ARCHIVE_PAGE_SIZE,
                    totalPages,
                }}
                initialTab={initialTab}
            />
        </div>
    )
}
