import { Users, FileText, UserCheck, AlertCircle } from 'lucide-react'
import prisma from '@/lib/prisma'
import { PromotionCard } from '@/components/dashboard/promotion-card'
import { InternalNews } from '@/components/dashboard/internal-news'

export default async function AdminDashboard() {
    // 1. Fetch Latest Promotion
    const promotion = await prisma.announcement.findFirst({
        where: { priority: 'promote', publishStatus: 'published' },
        orderBy: { publishDate: 'desc' }
    })

    // 2. Fetch Internal News (Limit 5)
    const internalNews = await prisma.announcement.findMany({
        where: { priority: 'internal', publishStatus: 'published' },
        orderBy: { publishDate: 'desc' },
        take: 5
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white dark:text-foreground">HR Overview</h1>
                <span className="text-sm text-white/70 dark:text-muted-foreground">Last updated: Today, 12:00 PM</span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Employees" value="128" icon={Users} color="bg-blue-600 shadow-blue-900/20" />
                <StatCard title="New Applicants" value="12" icon={FileText} color="bg-emerald-600 shadow-emerald-900/20" />
                <StatCard title="Onboarding" value="3" icon={UserCheck} color="bg-amber-600 shadow-amber-900/20" />
                <StatCard title="Pending Review" value="5" icon={AlertCircle} color="bg-rose-600 shadow-rose-900/20" />
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[400px]">
                {/* Main Promotion Area (Span 3 cols) */}
                <PromotionCard promotion={promotion} />

                {/* Side Utility / News Area (Span 1 col) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <InternalNews announcements={internalNews} />
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color }: any) {
    return (
        <div className="bg-white/10 dark:bg-card backdrop-blur-md p-5 rounded-xl shadow-lg border border-white/20 dark:border-border flex items-center justify-between transition-all hover:bg-white/15 dark:hover:bg-accent group">
            <div>
                <p className="text-sm text-white/80 dark:text-muted-foreground font-bold uppercase tracking-tight">{title}</p>
                <p className="text-2xl font-black text-white dark:text-foreground mt-1">{value}</p>
            </div>
            <div className={`h-11 w-11 rounded-full ${color} flex items-center justify-center text-white shadow-lg border border-white/20`}>
                <Icon size={22} />
            </div>
        </div>
    )
}
