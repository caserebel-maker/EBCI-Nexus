'use client'

import { Users } from 'lucide-react'
import { useTranslation } from '@/contexts/language-context'

export function EmployeesHeader() {
    const { t } = useTranslation()

    return (
        <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                <Users className="h-6 w-6 text-white dark:text-primary" />
                {t('employees.title')}
                <span className="ml-2 px-2 py-0.5 bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-md border border-white/10 text-white/40">
                    Cloud
                </span>
            </h1>
            <p className="text-white/80 dark:text-muted-foreground text-sm">
                Manage and monitor all employee detailed information from Supabase Cloud.
            </p>
        </div>
    )
}
