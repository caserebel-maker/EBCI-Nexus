import { supabase } from '@/lib/supabase'
import { DashboardContent } from './dashboard-content'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    try {
        // 1. Fetch Emergency Alerts (ACTIVE)
        const { data: emergencies, error: emergencyError } = await supabase
            .from('announcements')
            .select('*')
            .eq('priority', 'emergency')
            .eq('publishStatus', 'published')
            .order('publish_date', { ascending: false })
            .limit(1)

        if (emergencyError) console.error("Emergency Fetch Error:", emergencyError)
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
            try {
                const { data } = await supabase.storage
                    .from('announcement-images')
                    .createSignedUrl(promotion.image_path, 3600)
                promotion = { ...promotion, imageUrl: data?.signedUrl }
            } catch (e) {
                console.error("Promotion Image URL Error:", e)
            }
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
                try {
                    const { data } = await supabase.storage
                        .from('announcement-images')
                        .createSignedUrl(item.image_path, 3600)
                    return { ...item, imageUrl: data?.signedUrl }
                } catch (e) {
                    console.error("News Image URL Error:", e)
                }
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
    } catch (error) {
        console.error("CRITICAL DASHBOARD ERROR:", error)
        return (
            <div className="p-8 text-white bg-red-900/20 rounded-xl border border-red-500/50">
                <h1 className="text-xl font-bold mb-2">Dashboard partially unavailable</h1>
                <p className="opacity-70">We are experiencing issues fetching data. Please try again later.</p>
                <code className="block mt-4 text-xs opacity-50">{(error as Error).message}</code>
            </div>
        )
    }
}
