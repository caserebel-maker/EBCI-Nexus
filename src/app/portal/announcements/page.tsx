import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Megaphone, AlertTriangle, AlertCircle, Info, Calendar, ArrowLeft, Archive } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { AnnouncementsView } from './announcements-view'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsListPage() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')

    const { data: announcements } = await supabaseAdmin
        .from('announcements')
        .select('id, headline, content, priority, publish_date, expires_at, image_path')
        .eq('publish_status', 'published')
        .order('publish_date', { ascending: false })
        .limit(50)

    // Resolve image URLs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const list = (announcements ?? []).map(a => {
        let imageUrl: string | null = null
        if (a.image_path) {
            imageUrl = a.image_path.startsWith('http')
                ? a.image_path
                : `${supabaseUrl}/storage/v1/object/public/announcement-images/${a.image_path}`
        }
        return { ...a, imageUrl }
    })

    return (
        <div className="max-w-4xl mx-auto space-y-6">
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

            <AnnouncementsView announcements={list} />
        </div>
    )
}
