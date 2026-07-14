'use client'

import { Download, ReceiptText, WalletCards } from 'lucide-react'
import {
    formatExpenseAmount,
    formatExpenseMonth,
    getCategoryLabel,
    getStatusLabel,
    type EmployeeExpenseBenefit,
    type ExpensePaymentStatus,
} from '@/lib/employee-expense-shared'

interface Props {
    benefits: EmployeeExpenseBenefit[]
    hasEmployeeRow: boolean
}

function statusClass(status: ExpensePaymentStatus) {
    if (status === 'paid') return 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100'
    if (status === 'pending') return 'border-yellow-300/40 bg-yellow-400/15 text-yellow-100'
    if (status === 'not_eligible') return 'border-slate-300/30 bg-white/10 text-white/70'
    return 'border-rose-300/40 bg-rose-400/15 text-rose-100'
}

export function PortalExpensesView({ benefits, hasEmployeeRow }: Props) {
    const payments = benefits.flatMap((benefit) => benefit.payments.map((payment) => ({ ...payment, benefit })))
    const paidCount = payments.filter((payment) => payment.status === 'paid').length
    const pendingCount = payments.filter((payment) => payment.status === 'pending').length

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-4">
                    <span className="rounded-3xl bg-cyan-400/15 p-4 text-cyan-200 ring-1 ring-cyan-200/20">
                        <WalletCards className="h-7 w-7" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100/70">Employee Benefit</p>
                        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">ค่าใช้จ่าย/สวัสดิการ</h1>
                        <p className="mt-2 text-white/65">รายการค่าใช้จ่ายที่บริษัทบันทึกให้ เช่น ค่าโทรศัพท์ ค่าเดินทาง หรือสวัสดิการเฉพาะบุคคล</p>
                    </div>
                </div>
            </header>

            {!hasEmployeeRow && (
                <div className="mt-6 rounded-3xl border border-yellow-300/30 bg-yellow-400/10 p-5 text-yellow-50">
                    ยังไม่พบข้อมูลพนักงานที่เชื่อมกับบัญชีนี้ กรุณาแจ้ง HR
                </div>
            )}

            <section className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-xl backdrop-blur">
                    <p className="text-sm text-white/60">สิทธิ์ที่ได้รับ</p>
                    <p className="mt-2 text-4xl font-bold">{benefits.filter((benefit) => benefit.is_active).length}</p>
                    <p className="text-sm text-white/55">รายการที่ยังใช้งาน</p>
                </div>
                <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-xl backdrop-blur">
                    <p className="text-sm text-emerald-100/75">จ่ายแล้ว</p>
                    <p className="mt-2 text-4xl font-bold text-emerald-100">{paidCount}</p>
                    <p className="text-sm text-white/55">ประวัติการจ่ายทั้งหมด</p>
                </div>
                <div className="rounded-3xl border border-yellow-300/20 bg-yellow-400/10 p-5 shadow-xl backdrop-blur">
                    <p className="text-sm text-yellow-100/75">รอจ่าย</p>
                    <p className="mt-2 text-4xl font-bold text-yellow-100">{pendingCount}</p>
                    <p className="text-sm text-white/55">รายการที่ HR ยังไม่ได้บันทึกจ่าย</p>
                </div>
            </section>

            <section className="mt-6 space-y-4">
                {benefits.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/20 bg-white/10 p-10 text-center text-white/60">
                        ยังไม่มีรายการค่าใช้จ่ายหรือสวัสดิการเฉพาะบุคคล
                    </div>
                ) : benefits.map((benefit) => (
                    <article key={benefit.id} className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-xl backdrop-blur">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-2xl font-bold">{benefit.title}</h2>
                                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">{getCategoryLabel(benefit.category)}</span>
                                </div>
                                <p className="mt-2 text-sm text-white/65">
                                    ยอดปกติ {formatExpenseAmount(benefit.default_amount)} บาท
                                    {benefit.start_month ? ` · เริ่ม ${benefit.start_month}` : ''}
                                    {benefit.end_month ? ` · ถึง ${benefit.end_month}` : ''}
                                </p>
                                {benefit.description && <p className="mt-1 text-sm text-white/55">{benefit.description}</p>}
                            </div>
                            <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${benefit.is_active ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/10 text-white/50'}`}>
                                {benefit.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                            </span>
                        </div>

                        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                            <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr_auto] gap-2 bg-black/20 px-3 py-2 text-xs font-semibold text-white/60">
                                <span>เดือน</span>
                                <span>สถานะ</span>
                                <span>ยอดเงิน</span>
                                <span>ใบเสร็จ</span>
                            </div>
                            {benefit.payments.length === 0 ? (
                                <div className="px-3 py-5 text-sm text-white/45">ยังไม่มีประวัติการจ่าย</div>
                            ) : benefit.payments.map((payment) => (
                                <div key={payment.id} className="grid grid-cols-[1.1fr_0.8fr_0.7fr_auto] items-center gap-2 border-t border-white/10 px-3 py-2 text-sm">
                                    <span>{formatExpenseMonth(payment.payment_year, payment.payment_month)}</span>
                                    <span className={`w-fit rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(payment.status)}`}>{getStatusLabel(payment.status)}</span>
                                    <span>{formatExpenseAmount(payment.amount)} บาท</span>
                                    <span className="flex justify-end">
                                        {payment.receipt_path ? (
                                            <a href={`/api/portal/expenses/${payment.id}`} className="rounded-lg bg-white/10 p-2 text-cyan-100 hover:bg-white/15" title="ดาวน์โหลดใบเสร็จ">
                                                <Download className="h-4 w-4" />
                                            </a>
                                        ) : (
                                            <ReceiptText className="h-4 w-4 text-white/25" />
                                        )}
                                    </span>
                                    {payment.notes && <p className="col-span-4 text-xs text-white/50">{payment.notes}</p>}
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </section>
        </main>
    )
}
