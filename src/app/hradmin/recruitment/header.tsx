'use client'

import { User } from 'lucide-react'
import { useTranslation } from '@/contexts/language-context'

export function RecruitmentHeader() {
    const { t } = useTranslation()

    return (
        <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                <User className="h-6 w-6 text-white dark:text-primary" />
                {t('recruitment.title')}
                <span className="text-[10px] ml-1 bg-white/20 px-2 py-0.5 rounded text-white/60">
                    Cloud
                </span>
            </h1>
            <p className="text-white/80 dark:text-muted-foreground text-sm">
                {t('recruitment.applications')} - Production Level
            </p>
        </div>
    )
}
