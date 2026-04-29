import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { ReportsView } from './reports-view'
import { getDepartments } from './actions'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    if (session.role !== 'hr_admin') redirect('/portal')

    const departments = await getDepartments()

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                    <FileText className="h-6 w-6 text-white dark:text-primary" />
                    รายงาน
                    <span className="ml-2 px-2 py-0.5 bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-md border border-white/10 text-white/40">
                        Analytics
                    </span>
                </h1>
                <p className="text-white/80 dark:text-muted-foreground text-sm">
                    สรุปข้อมูลการเข้างาน การใช้วันลา และสัญญาจ้าง พร้อมดาวน์โหลดเป็น CSV
                </p>
            </div>

            {/* useSearchParams() inside ReportsView requires a Suspense
                boundary so the page can stream during the initial param
                read instead of failing the build. */}
            <Suspense fallback={<div className="text-white/55 text-sm">กำลังโหลด...</div>}>
                <ReportsView departments={departments} />
            </Suspense>
        </div>
    )
}
