import { supabaseAdmin } from '@/lib/supabase-admin'
import { DashboardContent } from './dashboard-content'

export const dynamic = 'force-dynamic'

async function withSignedUrl(item: any) {
    if (!item?.image_path) return item
    try {
        const { data } = await supabaseAdmin.storage
            .from('announcement-images')
            .createSignedUrl(item.image_path, 3600)
        return { ...item, imageUrl: data?.signedUrl }
    } catch {
        return item
    }
}

export default async function AdminDashboard() {
    try {
        const [
            { data: emergencies },
            { data: urgentRaw },
            { data: promotionRaw },
            { data: internalNewsRaw },
        ] = await Promise.all([
            // 1. Emergency (priority = 'emergency') — used by layout banner
            supabaseAdmin.from('announcements').select('*')
                .eq('priority', 'emergency').eq('publishStatus', 'published')
                .order('publish_date', { ascending: false }).limit(1),

            // 2. Urgent (priority = 'urgent') — yellow banners on dashboard
            supabaseAdmin.from('announcements').select('*')
                .eq('priority', 'urgent').eq('publishStatus', 'published')
                .order('publish_date', { ascending: false }).limit(10),

            // 3. Promotion
            supabaseAdmin.from('announcements').select('*')
                .eq('priority', 'promote').eq('publishStatus', 'published')
                .order('publish_date', { ascending: false }).limit(1),

            // 4. Internal News
            supabaseAdmin.from('announcements').select('*')
                .eq('priority', 'internal').eq('publishStatus', 'published')
                .order('publish_date', { ascending: false }).limit(5),
        ])

        const activeEmergency = emergencies?.[0] || null
        const promotion = await withSignedUrl(promotionRaw?.[0] || null)
        const urgentBanners = await Promise.all((urgentRaw || []).map(withSignedUrl))
        const internalNews = await Promise.all((internalNewsRaw || []).map(withSignedUrl))

        return (
            <DashboardContent
                activeEmergency={activeEmergency}
                urgentBanners={urgentBanners}
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
