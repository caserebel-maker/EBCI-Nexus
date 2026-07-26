import { redirect } from 'next/navigation'
import { Scale } from 'lucide-react'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { ReconcileView } from './reconcile-view'
import { reconcileDate } from './actions'
import { todayBangkokKey } from '@/lib/datetime'

export const dynamic = 'force-dynamic'

export default async function AttendanceReconcilePage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal')

    const dateStr = todayBangkokKey()

    const result = await reconcileDate(dateStr)
    const initial = 'error' in result ? null : result.summary

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-white dark:text-foreground flex items-center gap-2">
                    <Scale className="h-6 w-6 text-white dark:text-primary" />
                    Attendance Reconciliation
                    <span className="ml-2 px-2 py-0.5 bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-md border border-white/10 text-white/40">
                        Parallel Run
                    </span>
                </h1>
                <p className="text-white/80 dark:text-muted-foreground text-sm">
                    เทียบเวลาเช็คอินจากเครื่องแตะบัตรกับมือถือ — บัตรเป็น source of truth
                </p>
            </div>
            <ReconcileView initialDate={dateStr} initialData={initial} />
        </div>
    )
}
