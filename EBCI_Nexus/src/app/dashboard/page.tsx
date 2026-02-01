import { supabase } from '@/lib/supabase'
import { DashboardContent } from './dashboard-content'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    // 1. Fetch Emergency Alerts (ACTIVE)
    const { data: emergencies, error: emergencyError } = await supabase
        .from('announcements')
        .select('*')
        .eq('priority', 'emergency')
        .eq('publishStatus', 'published')
        .order('publish_date', { ascending: false })
        .limit(1)

    if (emergencyError) console.error("Emergency Fetch Error:", emergencyError)
    console.log("Active Emergencies Found:", emergencies?.length || 0)

    const activeEmergency = emergencies?.[0] || null

    // 2. Fetch Latest Promotion
    const { data: promotionRaw } = await supabase
        .from('announcements')
        .select('*')
        .eq('priority', 'promote')
        .eq('publishStatus', 'published')
        .order('publish_date', { ascending: false })
        .limit(1)

    let promotion = promotionRaw?.[0] || null
    if (promotion?.image_path) {
        const { data } = await supabase.storage
            .from('announcement-images')
            .createSignedUrl(promotion.image_path, 3600)
        promotion = { ...promotion, imageUrl: data?.signedUrl }
    }

    // 3. Fetch Internal News (Limit 5)
    const { data: internalNewsRaw } = await supabase
        .from('announcements')
        .select('*')
        .eq('priority', 'internal')
        .eq('publishStatus', 'published')
        .order('publish_date', { ascending: false })
        .limit(5)

    const internalNews = await Promise.all((internalNewsRaw || []).map(async (item) => {
        if (item.image_path) {
            const { data } = await supabase.storage
                .from('announcement-images')
                .createSignedUrl(item.image_path, 3600)
            return { ...item, imageUrl: data?.signedUrl }
        }
        return item
    }))

    return (
        <DashboardContent
            activeEmergency={activeEmergency}
            promotion={promotion}
            internalNews={internalNews}
        />
    )
}
