'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
    AlertCircle,
    Download,
    Loader2,
    Plus,
    ReceiptText,
    Trash2,
    Upload,
    WalletCards,
} from 'lucide-react'
import {
    EXPENSE_CATEGORIES,
    EXPENSE_PAYMENT_STATUSES,
    formatExpenseAmount,
    formatExpenseMonth,
    getCategoryLabel,
    getStatusLabel,
    type EmployeeExpenseBenefit,
    type ExpensePaymentStatus,
} from '@/lib/employee-expense-shared'

interface Props {
    employeeId: string
    benefits: EmployeeExpenseBenefit[]
    canEdit: boolean
}

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

function statusClass(status: ExpensePaymentStatus) {
    if (status === 'paid') return 'border-emerald-300/35 bg-emerald-400/15 text-emerald-100'
    if (status === 'pending') return 'border-yellow-300/35 bg-yellow-400/15 text-yellow-100'
    if (status === 'not_eligible') return 'border-slate-300/30 bg-white/10 text-white/70'
    return 'border-rose-300/35 bg-rose-400/15 text-rose-100'
}

export function EmployeeExpensesCard({ employeeId, benefits, canEdit }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [isAddingBenefit, setIsAddingBenefit] = useState(false)

    const stats = useMemo(() => {
        const payments = benefits.flatMap((benefit) => benefit.payments)
        return {
            activeBenefits: benefits.filter((benefit) => benefit.is_active).length,
            paid: payments.filter((payment) => payment.status === 'paid').length,
            pending: payments.filter((payment) => payment.status === 'pending').length,
        }
    }, [benefits])

    function refresh() {
        startTransition(() => router.refresh())
    }

    async function handleAddBenefit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        const form = new FormData(event.currentTarget)
        const payload = {
            title: form.get('title'),
            category: form.get('category'),
            default_amount: form.get('default_amount'),
            start_month: form.get('start_month'),
            end_month: form.get('end_month'),
            description: form.get('description'),
            is_active: true,
        }
        const response = await fetch(`/api/hradmin/employees/${employeeId}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            setError(result.error ?? 'เพิ่มรายการค่าใช้จ่ายไม่สำเร็จ')
            return
        }
        event.currentTarget.reset()
        setIsAddingBenefit(false)
        refresh()
    }

    async function handleAddPayment(event: FormEvent<HTMLFormElement>, benefitId: string) {
        event.preventDefault()
        setError(null)
        const response = await fetch(`/api/hradmin/employees/${employeeId}/expenses/${benefitId}/payments`, {
            method: 'POST',
            body: new FormData(event.currentTarget),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            setError(result.error ?? 'บันทึกการจ่ายไม่สำเร็จ')
            return
        }
        event.currentTarget.reset()
        refresh()
    }

    async function updateBenefit(benefitId: string, patch: Record<string, unknown>) {
        setError(null)
        const response = await fetch(`/api/hradmin/employees/${employeeId}/expenses/${benefitId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            setError(result.error ?? 'อัปเดตรายการไม่สำเร็จ')
            return
        }
        refresh()
    }

    async function deleteBenefit(benefitId: string) {
        if (!confirm('ลบรายการค่าใช้จ่ายนี้พร้อมประวัติการจ่ายทั้งหมด?')) return
        setError(null)
        const response = await fetch(`/api/hradmin/employees/${employeeId}/expenses/${benefitId}`, {
            method: 'DELETE',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            setError(result.error ?? 'ลบรายการไม่สำเร็จ')
            return
        }
        refresh()
    }

    async function deletePayment(benefitId: string, paymentId: string) {
        if (!confirm('ลบประวัติการจ่ายรายการนี้?')) return
        setError(null)
        const response = await fetch(`/api/hradmin/employees/${employeeId}/expenses/${benefitId}/payments/${paymentId}`, {
            method: 'DELETE',
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
            setError(result.error ?? 'ลบประวัติไม่สำเร็จ')
            return
        }
        refresh()
    }

    return (
        <section className="rounded-[28px] border border-white/20 bg-white/10 p-5 text-white shadow-xl backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-200">
                        <WalletCards className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-2xl font-bold">ค่าใช้จ่าย/สวัสดิการ</h2>
                        <p className="text-sm text-white/65">บันทึกค่าใช้จ่ายที่บริษัทตกลงจ่ายให้ เช่น ค่าโทรศัพท์ ค่าเดินทาง หรือสวัสดิการเฉพาะบุคคล</p>
                    </div>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        onClick={() => setIsAddingBenefit((value) => !value)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/35 bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/30"
                    >
                        <Plus className="h-4 w-4" />
                        เพิ่มรายการ
                    </button>
                )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-black/15 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Active</p>
                    <p className="mt-2 text-3xl font-bold">{stats.activeBenefits}</p>
                    <p className="text-sm text-white/60">รายการที่ยังใช้งาน</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/70">Paid</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-100">{stats.paid}</p>
                    <p className="text-sm text-white/60">เดือนที่จ่ายแล้ว</p>
                </div>
                <div className="rounded-2xl border border-yellow-300/20 bg-yellow-400/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-100/70">Pending</p>
                    <p className="mt-2 text-3xl font-bold text-yellow-100">{stats.pending}</p>
                    <p className="text-sm text-white/60">เดือนที่รอจ่าย</p>
                </div>
            </div>

            {error && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-300/40 bg-rose-500/20 p-3 text-sm text-rose-50">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {isPending && (
                <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังอัปเดตข้อมูล
                </div>
            )}

            {canEdit && isAddingBenefit && (
                <form onSubmit={handleAddBenefit} className="mt-5 rounded-2xl border border-cyan-300/25 bg-black/20 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-white/80">ชื่อรายการ</span>
                            <input name="title" required placeholder="เช่น ค่าโทรศัพท์รายเดือน" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-300" />
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-white/80">ประเภท</span>
                            <select name="category" defaultValue="phone" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-300">
                                {EXPENSE_CATEGORIES.map((category) => (
                                    <option key={category.value} value={category.value}>{category.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1 text-sm">
                            <span className="font-semibold text-white/80">ยอดปกติ/เดือน</span>
                            <input name="default_amount" inputMode="decimal" placeholder="เช่น 500" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-300" />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="space-y-1 text-sm">
                                <span className="font-semibold text-white/80">เริ่มเดือน</span>
                                <input name="start_month" type="month" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-300" />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span className="font-semibold text-white/80">ถึงเดือน</span>
                                <input name="end_month" type="month" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-300" />
                            </label>
                        </div>
                    </div>
                    <label className="mt-3 block space-y-1 text-sm">
                        <span className="font-semibold text-white/80">หมายเหตุ</span>
                        <textarea name="description" rows={2} placeholder="เงื่อนไขหรือรายละเอียดเพิ่มเติม" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-300" />
                    </label>
                    <div className="mt-3 flex justify-end">
                        <button type="submit" className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300">บันทึกรายการ</button>
                    </div>
                </form>
            )}

            <div className="mt-5 space-y-4">
                {benefits.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-black/10 p-8 text-center text-white/60">
                        ยังไม่มีรายการค่าใช้จ่ายหรือสวัสดิการเฉพาะบุคคล
                    </div>
                ) : benefits.map((benefit) => (
                    <article key={benefit.id} className="rounded-2xl border border-white/15 bg-black/15 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-xl font-bold">{benefit.title}</h3>
                                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">{getCategoryLabel(benefit.category)}</span>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${benefit.is_active ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/10 text-white/50'}`}>
                                        {benefit.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-white/65">
                                    ยอดปกติ {formatExpenseAmount(benefit.default_amount)} บาท
                                    {benefit.start_month ? ` · เริ่ม ${benefit.start_month}` : ''}
                                    {benefit.end_month ? ` · ถึง ${benefit.end_month}` : ''}
                                </p>
                                {benefit.description && <p className="mt-1 text-sm text-white/55">{benefit.description}</p>}
                            </div>
                            {canEdit && (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateBenefit(benefit.id, { is_active: !benefit.is_active })}
                                        className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                                    >
                                        {benefit.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteBenefit(benefit.id)}
                                        className="inline-flex items-center gap-1 rounded-xl border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/25"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        ลบ
                                    </button>
                                </div>
                            )}
                        </div>

                        {canEdit && (
                            <form onSubmit={(event) => handleAddPayment(event, benefit.id)} className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 md:grid-cols-6">
                                <label className="space-y-1 text-xs">
                                    <span className="text-white/65">ปี</span>
                                    <input name="payment_year" type="number" defaultValue={currentYear} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none" />
                                </label>
                                <label className="space-y-1 text-xs">
                                    <span className="text-white/65">เดือน</span>
                                    <input name="payment_month" type="number" min={1} max={12} defaultValue={currentMonth} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none" />
                                </label>
                                <label className="space-y-1 text-xs">
                                    <span className="text-white/65">สถานะ</span>
                                    <select name="status" defaultValue="paid" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none">
                                        {EXPENSE_PAYMENT_STATUSES.map((status) => (
                                            <option key={status.value} value={status.value}>{status.label}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1 text-xs">
                                    <span className="text-white/65">ยอดเงิน</span>
                                    <input name="amount" inputMode="decimal" defaultValue={benefit.default_amount ?? ''} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none" />
                                </label>
                                <label className="space-y-1 text-xs">
                                    <span className="text-white/65">วันที่จ่าย</span>
                                    <input name="paid_on" type="date" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none" />
                                </label>
                                <label className="space-y-1 text-xs">
                                    <span className="text-white/65">ใบเสร็จ</span>
                                    <input name="receipt" type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white file:mr-2 file:rounded-lg file:border-0 file:bg-white/15 file:px-2 file:py-1 file:text-white" />
                                </label>
                                <label className="space-y-1 text-xs md:col-span-5">
                                    <span className="text-white/65">หมายเหตุ</span>
                                    <input name="notes" placeholder="รายละเอียด เช่น รอบบิล/เลขที่ใบเสร็จ" className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none" />
                                </label>
                                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">
                                    <Upload className="h-4 w-4" />
                                    บันทึก
                                </button>
                            </form>
                        )}

                        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr_auto] gap-2 bg-white/10 px-3 py-2 text-xs font-semibold text-white/60">
                                <span>เดือน</span>
                                <span>สถานะ</span>
                                <span>ยอดเงิน</span>
                                <span>หมายเหตุ</span>
                                <span>ไฟล์</span>
                            </div>
                            {benefit.payments.length === 0 ? (
                                <div className="px-3 py-5 text-sm text-white/45">ยังไม่มีประวัติการจ่าย</div>
                            ) : benefit.payments.map((payment) => (
                                <div key={payment.id} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr_auto] items-center gap-2 border-t border-white/10 px-3 py-2 text-sm">
                                    <span>{formatExpenseMonth(payment.payment_year, payment.payment_month)}</span>
                                    <span className={`w-fit rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(payment.status)}`}>{getStatusLabel(payment.status)}</span>
                                    <span>{formatExpenseAmount(payment.amount)} บาท</span>
                                    <span className="truncate text-white/60">{payment.notes || (payment.paid_on ? `จ่ายวันที่ ${payment.paid_on}` : '—')}</span>
                                    <span className="flex items-center justify-end gap-2">
                                        {payment.receipt_path ? (
                                            <a href={`/api/hradmin/employees/${employeeId}/expenses/${benefit.id}/payments/${payment.id}`} className="rounded-lg bg-white/10 p-2 text-cyan-100 hover:bg-white/15" title="ดาวน์โหลดใบเสร็จ">
                                                <Download className="h-4 w-4" />
                                            </a>
                                        ) : (
                                            <ReceiptText className="h-4 w-4 text-white/25" />
                                        )}
                                        {canEdit && (
                                            <button type="button" onClick={() => deletePayment(benefit.id, payment.id)} className="rounded-lg bg-rose-500/15 p-2 text-rose-100 hover:bg-rose-500/25" title="ลบรายการ">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}
