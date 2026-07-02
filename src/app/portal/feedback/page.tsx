import { redirect } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { FeedbackForm } from './feedback-form'

export const dynamic = 'force-dynamic'

type EmployeeRow = {
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    employee_code: string | null
    department: string | null
    position: string | null
}

function buildDisplayName(emp: EmployeeRow | null): string {
    if (!emp) return 'พนักงาน'
    const fullName = [emp.first_name_th, emp.last_name_th].filter(Boolean).join(' ').trim()
    if (!fullName) return emp.employee_code ? `พนักงาน ${emp.employee_code}` : 'พนักงาน'
    return emp.nickname ? `${fullName} (${emp.nickname})` : fullName
}

export default async function FeedbackPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) redirect('/portal')

    const { data } = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname, employee_code, department, position')
        .eq('id', employeeId)
        .maybeSingle()

    const employee = (data as EmployeeRow | null) ?? null

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-1 pb-8 pt-2 sm:px-0">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-yellow-300 shadow-lg shadow-black/10">
                    <MessageSquare size={22} />
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300/80">
                        Feedback
                    </p>
                    <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">
                        เสนอแนะ / ติชม / ปรับปรุง
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                        ส่งความคิดเห็นเกี่ยวกับระบบ EBCI Nexus ถึงผู้ดูแลระบบโดยตรง
                    </p>
                </div>
            </div>

            <FeedbackForm
                employeeName={buildDisplayName(employee)}
                employeeCode={employee?.employee_code ?? null}
                department={employee?.department ?? null}
                position={employee?.position ?? null}
            />
        </div>
    )
}
