import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Scale } from 'lucide-react'
import { ReconcileView } from './reconcile-view'
import { reconcileDate } from './actions'

export const dynamic = 'force-dynamic'

export default async function AttendanceReconcilePage() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('nexus_session')
    if (!sessionCookie?.value) redirect('/login')
    try {
        const session = JSON.parse(sessionCookie.value)
        if (session.role !== 'hr_admin') redirect('/portal')
    } catch {
        redirect('/login')
    }

    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

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
