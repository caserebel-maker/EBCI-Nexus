'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HandCoins, Paperclip, Plus } from 'lucide-react'
import { ClaimSheet } from '@/components/expenses/claim-sheet'
import {
    claimStatusClass,
    claimStatusLabel,
    formatBaht,
    formatThaiDate,
    type ClaimCategory,
    type ExpenseClaim,
} from '@/lib/expense-claims-shared'

interface Props {
    claims: ExpenseClaim[]
    categories: ClaimCategory[]
    notReady: boolean
}

const inputClass =
    'block w-full min-w-0 max-w-full appearance-none rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-lg text-white placeholder:text-white/40 focus:border-cyan-300 focus:outline-none'

export function PortalClaimsSection({ claims, categories, notReady }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const pending = claims.filter((c) => c.status === 'pending')
    const waitingPay = claims.filter((c) => c.status === 'approved')
    const paidTotal = claims.filter((c) => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSaving(true)
        setError(null)
        const response = await fetch('/api/portal/expense-claims', { method: 'POST', body: new FormData(event.currentTarget) })
        const result = await response.json().catch(() => ({}))
        setSaving(false)
        if (!response.ok) {
            setError(result.error ?? 'ส่งคำขอไม่สำเร็จ')
            return
        }
        setOpen(false)
        router.refresh()
    }

    async function cancel(id: string) {
        if (!window.confirm('ยกเลิกคำขอเบิกนี้?')) return
        const response = await fetch(`/api/portal/expense-claims/${id}`, { method: 'DELETE' })
        if (!response.ok) {
            const result = await response.json().catch(() => ({}))
            window.alert(result.error ?? 'ยกเลิกไม่สำเร็จ')
        }
        router.refresh()
    }

    return (
        <section className="space-y-5">
            <header className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-200 ring-1 ring-amber-200/20">
                        <HandCoins className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold leading-tight">เบิกค่าใช้จ่าย</h1>
                        <p className="text-sm text-white/60">ยื่นเบิก ดูสถานะ และประวัติการเบิกของคุณ</p>
                    </div>
                </div>
                {!notReady && (
                    <button
                        type="button"
                        onClick={() => { setError(null); setOpen(true) }}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-base font-bold text-black shadow hover:bg-amber-300 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        ยื่นเบิก
                    </button>
                )}
            </header>

            {notReady && (
                <div className="rounded-2xl border border-yellow-300/30 bg-yellow-400/10 p-4 text-base text-yellow-50">
                    ระบบเบิกค่าใช้จ่ายยังไม่เปิดใช้งาน กรุณาแจ้ง HR
                </div>
            )}

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-yellow-300/20 bg-yellow-400/10 p-3 sm:p-4">
                    <p className="text-sm text-yellow-100/80">รออนุมัติ</p>
                    <p className="mt-1 text-2xl font-bold text-yellow-100 sm:text-3xl">{pending.length}</p>
                </div>
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 sm:p-4">
                    <p className="text-sm text-cyan-100/80">รอจ่าย</p>
                    <p className="mt-1 text-2xl font-bold text-cyan-100 sm:text-3xl">{waitingPay.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 sm:p-4">
                    <p className="text-sm text-emerald-100/80">ได้รับแล้ว</p>
                    <p className="mt-1 truncate text-2xl font-bold text-emerald-100 sm:text-3xl">{formatBaht(paidTotal)}<span className="ml-1 text-sm font-medium">บาท</span></p>
                </div>
            </div>

            <div className="space-y-3">
                {claims.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-base text-white/55">
                        ยังไม่มีประวัติการเบิก
                    </div>
                ) : claims.map((claim) => (
                    <article key={claim.id} className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-lg font-bold leading-snug">{claim.title}</p>
                                <p className="mt-0.5 text-sm text-white/60">
                                    {claim.category_name} · ใช้จ่ายวันที่ {formatThaiDate(claim.expense_date)}
                                </p>
                                {claim.description && <p className="mt-1 text-sm text-white/50">{claim.description}</p>}
                            </div>
                            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                                <p className="text-xl font-bold">{formatBaht(claim.amount)} <span className="text-sm font-medium text-white/60">บาท</span></p>
                                <span className={`rounded-full border px-3 py-0.5 text-sm font-semibold ${claimStatusClass(claim.status)}`}>
                                    {claimStatusLabel(claim.status)}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/10 pt-3 text-sm text-white/55">
                            <span>ยื่นเมื่อ {formatThaiDate(claim.created_at)}</span>
                            {claim.status === 'paid' && <span className="text-emerald-200">จ่ายแล้ววันที่ {formatThaiDate(claim.paid_on)}</span>}
                            {claim.status === 'rejected' && claim.review_note && (
                                <span className="text-rose-200">เหตุผล: {claim.review_note}</span>
                            )}
                            {claim.receipt_path && (
                                <a href={`/api/expense-claims/${claim.id}/receipt`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-200 hover:underline">
                                    <Paperclip className="h-4 w-4" /> ใบเสร็จ
                                </a>
                            )}
                            {claim.status === 'pending' && (
                                <button type="button" onClick={() => cancel(claim.id)} className="text-rose-200 hover:underline">
                                    ยกเลิกคำขอ
                                </button>
                            )}
                        </div>
                    </article>
                ))}
            </div>

            {open && (
                <ClaimSheet title="ยื่นเบิกค่าใช้จ่าย" onClose={() => setOpen(false)} onSubmit={submit}>
                        <div className="space-y-4">
                            <label className="block">
                                <span className="mb-1 block text-lg">ประเภท</span>
                                <select name="category_id" required defaultValue="" className={inputClass}>
                                    <option value="" disabled>เลือกประเภท</option>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-lg">รายการ</span>
                                <input name="title" required maxLength={200} placeholder="เช่น ค่าแท็กซี่ไปพบลูกค้า" className={inputClass} />
                            </label>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1 block text-lg">จำนวนเงิน (บาท)</span>
                                    <input name="amount" required type="number" inputMode="decimal" min="0.01" step="0.01" className={inputClass} />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-lg">วันที่ใช้จ่าย</span>
                                    <input name="expense_date" required type="date" defaultValue={new Date().toLocaleDateString('sv-SE')} className={inputClass} />
                                </label>
                            </div>
                            <label className="block">
                                <span className="mb-1 block text-lg">รายละเอียด (ไม่บังคับ)</span>
                                <textarea name="description" rows={2} maxLength={1000} className={inputClass} />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-lg">แนบใบเสร็จ (ไม่บังคับ)</span>
                                <input name="receipt" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="w-full text-base file:mr-3 file:rounded-xl file:border-0 file:bg-white/15 file:px-4 file:py-2 file:text-white" />
                                <span className="mt-1 block text-sm text-white/50">PDF หรือรูปภาพ ไม่เกิน 10MB</span>
                            </label>
                        </div>
                        {error && <p className="mt-4 rounded-2xl bg-rose-500/20 p-3 text-lg text-rose-100">{error}</p>}
                        <button type="submit" disabled={saving} className="mt-6 w-full rounded-2xl bg-amber-400 py-4 text-xl font-bold text-black hover:bg-amber-300 disabled:opacity-60">
                            {saving ? 'กำลังส่ง...' : 'ส่งคำขอเบิก'}
                        </button>
                </ClaimSheet>
            )}
        </section>
    )
}
