import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReceiptText, WalletCards } from 'lucide-react'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { formatExpenseAmount } from '@/lib/employee-expense-shared'

export const dynamic = 'force-dynamic'

interface EmployeeRow {
    id: string
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    department: string | null
    position: string | null
}

interface BenefitRow {
    id: string
    employee_id: string
    is_active: boolean
}

interface PaymentRow {
    employee_id: string
    amount: number | string | null
    status: string
}

function fullName(employee: EmployeeRow) {
    return [employee.first_name_th, employee.last_name_th].filter(Boolean).join(' ') || employee.employee_code || 'ไม่ระบุชื่อ'
}

function isMissingExpenseTableError(error: { code?: string | null; message?: string | null }) {
    const message = (error.message ?? '').toLowerCase()
    return error.code === '42P01' || message.includes('employee_expense_')
}

export default async function HrAdminExpensesPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal/dashboard')

    const { data: employees } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, department, position')
        .eq('status', 'active')
        .order('employee_code', { ascending: true })

    const employeeRows = (employees ?? []) as EmployeeRow[]
    const employeeIds = employeeRows.map((employee) => employee.id)

    let benefits: BenefitRow[] = []
    let payments: PaymentRow[] = []
    let tableMissing = false

    if (employeeIds.length) {
        const benefitResult = await supabaseAdmin
            .from('employee_expense_benefits')
            .select('id, employee_id, is_active')
            .in('employee_id', employeeIds)

        if (benefitResult.error) {
            tableMissing = isMissingExpenseTableError(benefitResult.error)
            if (!tableMissing) throw new Error(benefitResult.error.message)
        } else {
            benefits = (benefitResult.data ?? []) as BenefitRow[]
        }

        const paymentResult = await supabaseAdmin
            .from('employee_expense_payments')
            .select('employee_id, amount, status')
            .in('employee_id', employeeIds)

        if (paymentResult.error) {
            tableMissing = tableMissing || isMissingExpenseTableError(paymentResult.error)
            if (!tableMissing) throw new Error(paymentResult.error.message)
        } else {
            payments = (paymentResult.data ?? []) as PaymentRow[]
        }
    }

    const byEmployee = new Map<string, { activeBenefits: number; paid: number; pending: number; totalPaid: number }>()
    for (const employee of employeeRows) {
        byEmployee.set(employee.id, { activeBenefits: 0, paid: 0, pending: 0, totalPaid: 0 })
    }
    for (const benefit of benefits) {
        const item = byEmployee.get(benefit.employee_id)
        if (item && benefit.is_active) item.activeBenefits += 1
    }
    for (const payment of payments) {
        const item = byEmployee.get(payment.employee_id)
        if (!item) continue
        if (payment.status === 'paid') {
            item.paid += 1
            item.totalPaid += Number(payment.amount ?? 0)
        }
        if (payment.status === 'pending') item.pending += 1
    }

    const totalActiveBenefits = benefits.filter((benefit) => benefit.is_active).length
    const totalPending = payments.filter((payment) => payment.status === 'pending').length
    const totalPaid = payments.filter((payment) => payment.status === 'paid').length

    return (
        <main className="space-y-6 text-white">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-center gap-4">
                    <span className="rounded-3xl bg-cyan-400/15 p-4 text-cyan-200 ring-1 ring-cyan-200/20">
                        <WalletCards className="h-7 w-7" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100/70">Employee Expenses</p>
                        <h1 className="mt-1 text-3xl font-bold">ค่าใช้จ่ายพนักงาน</h1>
                        <p className="mt-2 text-white/65">ภาพรวมรายการค่าใช้จ่ายและสวัสดิการเฉพาะบุคคล เช่น ค่าโทรศัพท์ ค่าเดินทาง หรือใบเสร็จที่บริษัทจ่ายให้</p>
                    </div>
                </div>
            </header>

            {tableMissing && (
                <div className="rounded-3xl border border-yellow-300/30 bg-yellow-400/10 p-5 text-yellow-50">
                    ยังไม่พบตารางค่าใช้จ่ายในฐานข้อมูล production กรุณา deploy/apply migration แล้วหน้านี้จะแสดงข้อมูลจริง
                </div>
            )}

            <section className="grid gap-3 md:grid-cols-4">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-xl backdrop-blur">
                    <p className="text-sm text-white/60">พนักงาน active</p>
                    <p className="mt-2 text-4xl font-bold">{employeeRows.length}</p>
                </div>
                <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-5 shadow-xl backdrop-blur">
                    <p className="text-sm text-cyan-100/75">สิทธิ์ค่าใช้จ่าย</p>
                    <p className="mt-2 text-4xl font-bold text-cyan-100">{totalActiveBenefits}</p>
                </div>
                <div className="rounded-3xl border border-yellow-300/20 bg-yellow-400/10 p-5 shadow-xl backdrop-blur">
                    <p className="text-sm text-yellow-100/75">รอจ่าย</p>
                    <p className="mt-2 text-4xl font-bold text-yellow-100">{totalPending}</p>
                </div>
                <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-xl backdrop-blur">
                    <p className="text-sm text-emerald-100/75">จ่ายแล้ว</p>
                    <p className="mt-2 text-4xl font-bold text-emerald-100">{totalPaid}</p>
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-xl backdrop-blur">
                <div className="grid grid-cols-[1.4fr_0.9fr_0.6fr_0.6fr_0.7fr_auto] gap-3 border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/55">
                    <span>พนักงาน</span>
                    <span>แผนก</span>
                    <span>สิทธิ์</span>
                    <span>รอจ่าย</span>
                    <span>จ่ายแล้ว</span>
                    <span>จัดการ</span>
                </div>
                {employeeRows.map((employee) => {
                    const stats = byEmployee.get(employee.id) ?? { activeBenefits: 0, paid: 0, pending: 0, totalPaid: 0 }
                    return (
                        <div key={employee.id} className="grid grid-cols-[1.4fr_0.9fr_0.6fr_0.6fr_0.7fr_auto] items-center gap-3 border-b border-white/10 px-5 py-4 last:border-b-0">
                            <div>
                                <p className="font-bold">{fullName(employee)} {employee.nickname ? `(${employee.nickname})` : ''}</p>
                                <p className="text-xs text-white/50">{employee.employee_code ?? 'ไม่มีรหัส'} · {employee.position ?? '-'}</p>
                            </div>
                            <p className="text-sm text-white/65">{employee.department ?? '-'}</p>
                            <p className="text-xl font-bold text-cyan-100">{stats.activeBenefits}</p>
                            <p className="text-xl font-bold text-yellow-100">{stats.pending}</p>
                            <div>
                                <p className="text-xl font-bold text-emerald-100">{stats.paid}</p>
                                <p className="text-xs text-white/45">{formatExpenseAmount(stats.totalPaid)} บาท</p>
                            </div>
                            <Link
                                href={`/hradmin/employees/${employee.employee_code ?? employee.id}#expenses`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-400/25"
                            >
                                <ReceiptText className="h-4 w-4" />
                                เปิด
                            </Link>
                        </div>
                    )
                })}
            </section>
        </main>
    )
}
