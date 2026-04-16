'use client'

import { Users, FileText, UserCheck, AlertCircle } from 'lucide-react'
import { PromotionCard } from '@/components/dashboard/promotion-card'
import { InternalNews } from '@/components/dashboard/internal-news'
import { UrgentBanners } from '@/components/dashboard/urgent-banners'
import { useTranslation } from '@/contexts/language-context'

interface DashboardContentProps {
    activeEmergency: any
    urgentBanners: any[]
    promotion: any
    internalNews: any[]
}

export function DashboardContent({ activeEmergency, urgentBanners, promotion, internalNews }: DashboardContentProps) {
    const { t } = useTranslation()

    return (
        <div className="space-y-6 relative">

            {/* Urgent Banners — above heading, stacked */}
            <UrgentBanners banners={urgentBanners} />

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white dark:text-foreground">{t('dashboard.hrOverview')}</h1>
                <span className="text-sm text-white/70 dark:text-muted-foreground font-mono">
                    {t('dashboard.systemStatus')}: <span className="text-emerald-400 font-bold">{t('dashboard.cloudConnected')}</span>
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={t('dashboard.stats.totalEmployees')} value="128" icon={Users} color="bg-blue-600 shadow-blue-900/20" />
                <StatCard title={t('dashboard.stats.newApplicants')} value="12" icon={FileText} color="bg-emerald-600 shadow-emerald-900/20" />
                <StatCard title={t('dashboard.stats.onboarding')} value="3" icon={UserCheck} color="bg-amber-600 shadow-amber-900/20" />
                <StatCard title={t('dashboard.stats.pendingReview')} value="5" icon={AlertCircle} color="bg-rose-600 shadow-rose-900/20" />
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[400px]">
                <PromotionCard promotion={promotion} />
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
