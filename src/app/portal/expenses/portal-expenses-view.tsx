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
        <section className="space-y-4 border-t border-white/10 pt-8">
            <header>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                    <WalletCards className="h-6 w-6 text-cyan-200" />
                    สวัสดิการประจำ
                </h2>
                <p className="mt-1 text-sm text-white/60">ค่าใช้จ่ายและสวัสดิการที่บริษัทบันทึกให้ เช่น ค่าโทรศัพท์ ค่าเดินทาง</p>
            </header>

            {!hasEmployeeRow && (
                <div className="rounded-2xl border border-yellow-300/30 bg-yellow-400/10 p-4 text-base text-yellow-50">
                    ยังไม่พบข้อมูลพนักงานที่เชื่อมกับบัญชีนี้ กรุณาแจ้ง HR
                </div>
            )}

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 sm:p-4">
                    <p className="text-sm text-white/60">สิทธิ์ที่ใช้งาน</p>
                    <p className="mt-1 text-2xl font-bold sm:text-3xl">{benefits.filter((benefit) => benefit.is_active).length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 sm:p-4">
                    <p className="text-sm text-emerald-100/80">จ่ายแล้ว</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-100 sm:text-3xl">{paidCount}</p>
                </div>
                <div className="rounded-2xl border border-yellow-300/20 bg-yellow-400/10 p-3 sm:p-4">
                    <p className="text-sm text-yellow-100/80">รอจ่าย</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-100 sm:text-3xl">{pendingCount}</p>
                </div>
            </div>

            <div className="space-y-3">
                {benefits.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-base text-white/55">
                        ยังไม่มีรายการค่าใช้จ่ายหรือสวัสดิการเฉพาะบุคคล
                    </div>
                ) : benefits.map((benefit) => (
                    <article key={benefit.id} className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-bold">{benefit.title}</h3>
                                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">{getCategoryLabel(benefit.category)}</span>
                                </div>
                                <p className="mt-1 text-sm text-white/60">
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
            </div>
        </section>
    )
}
