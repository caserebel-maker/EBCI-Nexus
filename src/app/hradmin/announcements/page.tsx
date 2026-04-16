import { supabaseAdmin } from '@/lib/supabase-admin'
import { AnnouncementsView } from './announcements-view'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
    const { data: raw } = await supabaseAdmin
        .from('announcements')
        .select('id, headline, content, priority, publish_date, image_path')
        .eq('publishStatus', 'published')
        .order('publish_date', { ascending: false })

    // Resolve signed URLs for images
    const announcements = await Promise.all(
        (raw ?? []).map(async (a: any) => {
            if (!a.image_path) return { ...a, image_url: null }
            const { data } = await supabaseAdmin.storage
                .from('announcement-images')
                .createSignedUrl(a.image_path, 3600)
            return { ...a, image_url: data?.signedUrl ?? null }
        })
    )

    return <AnnouncementsView announcements={announcements} />
}
