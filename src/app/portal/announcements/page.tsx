import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Megaphone, ArrowLeft } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveCreators, displayCreator } from '@/lib/creators'
import { AnnouncementsView } from './announcements-view'

export const dynamic = 'force-dynamic'

const ARCHIVE_PAGE_SIZE = 10

interface SearchParams {
    tab?: string
    page?: string
    focus?: string
}

export default async function AnnouncementsListPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const session = await getSession()
    if (!session) redirect('/login')

    const sp = await searchParams
    const initialTab: 'active' | 'archive' = sp.tab === 'archive' ? 'archive' : 'active'
    const requestedPage = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
    const focusId = sp.focus?.trim() || null

    const nowIso = new Date().toISOString()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

    const resolveImage = (imagePath: string | null) => {
        if (!imagePath) return null
        return imagePath.startsWith('http')
            ? imagePath
            : `${supabaseUrl}/storage/v1/object/public/announcement-images/${imagePath}`
    }

    const toViewItem = (a: any, creatorMap: Map<string, string>) => ({
        ...a,
        imageUrl: resolveImage(a.image_path as string | null),
        creator_name: displayCreator(a.created_by as string | null, creatorMap),
    })

    // Active = published + (no expiry OR expires in the future)
    const { data: activeRows } = await supabaseAdmin
        .from('announcements')
        .select('id, headline, content, priority, publish_date, expires_at, image_path, created_by')
        .eq('publish_status', 'published')
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('publish_date', { ascending: false })
        .limit(50)

    const activeCreatorMap = await resolveCreators((activeRows ?? []).map(a => a.created_by as string | null))
    const active = (activeRows ?? []).map(a => toViewItem(a, activeCreatorMap))

    // Archive = published + expired (expires_at <= NOW) — paginated
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
    // Clamp the requested page if it's out of range (e.g. old bookmark)
    const initialPage = Math.min(requestedPage, totalPages)
    const archiveCreatorMap = await resolveCreators((archiveRows ?? []).map(a => a.created_by as string | null))
    const archiveInitial = (archiveRows ?? []).map(a => toViewItem(a, archiveCreatorMap))

    let finalInitialTab = initialTab
    let activeItems = active
    let archiveItems = archiveInitial

    if (focusId) {
        const alreadyLoaded = activeItems.some(a => a.id === focusId) || archiveItems.some(a => a.id === focusId)

        if (!alreadyLoaded) {
            const { data: focusedRow } = await supabaseAdmin
                .from('announcements')
                .select('id, headline, content, priority, publish_date, expires_at, image_path, created_by')
                .eq('id', focusId)
                .eq('publish_status', 'published')
                .maybeSingle()

            if (focusedRow) {
                const focusedCreatorMap = await resolveCreators([focusedRow.created_by as string | null])
                const focused = toViewItem(focusedRow, focusedCreatorMap)
                const isArchived = Boolean(focusedRow.expires_at && focusedRow.expires_at <= nowIso)
                if (isArchived) {
                    archiveItems = [focused, ...archiveItems.filter(a => a.id !== focusId)]
                    finalInitialTab = 'archive'
                } else {
                    activeItems = [focused, ...activeItems.filter(a => a.id !== focusId)]
                    finalInitialTab = 'active'
                }
            }
        } else if (archiveItems.some(a => a.id === focusId)) {
            finalInitialTab = 'archive'
        } else {
            finalInitialTab = 'active'
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href="/portal/dashboard"
                    className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white border border-white/15 transition-all"
                >
                    <ArrowLeft size={18} />
                </Link>
                <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                    <Megaphone size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">ประกาศข่าวสาร</h1>
                    <p className="text-sm text-white/50">ดูประกาศและข่าวสารจากบริษัท</p>
                </div>
            </div>

            <AnnouncementsView
                activeItems={activeItems}
                initialArchive={{
                    items: archiveItems,
                    total: archiveTotal,
                    page: initialPage,
                    pageSize: ARCHIVE_PAGE_SIZE,
                    totalPages,
                }}
                initialTab={finalInitialTab}
                focusId={focusId}
            />
        </div>
    )
}
