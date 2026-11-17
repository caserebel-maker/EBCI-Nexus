'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, HandCoins, Paperclip, Plus, Search, Wallet, X } from 'lucide-react'
import { ClaimSheet } from '@/components/expenses/claim-sheet'
import {
    claimEmployeeName,
    claimStatusClass,
    claimStatusLabel,
    formatBaht,
    formatThaiDate,
    type ClaimCategory,
    type ExpenseClaim,
} from '@/lib/expense-claims-shared'

interface EmployeeOption {
    id: string
    label: string
}

interface Props {
    claims: ExpenseClaim[]
    categories: ClaimCategory[]
    employees: EmployeeOption[]
    notReady: boolean
}

type Tab = 'pending' | 'approved' | 'all' | 'categories'

const inputClass =
    'block w-full min-w-0 max-w-full appearance-none rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-lg text-white placeholder:text-white/40 focus:border-cyan-300 focus:outline-none'

function today() {
    return new Date().toLocaleDateString('sv-SE')
}

export function HrClaimsPanel({ claims, categories, employees, notReady }: Props) {
    const router = useRouter()
    const [tab, setTab] = useState<Tab>('pending')
    const [search, setSearch] = useState('')
    const [busyId, setBusyId] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)

    const pending = claims.filter((c) => c.status === 'pending')
    const approved = claims.filter((c) => c.status === 'approved')

    const visible = useMemo(() => {
        const base = tab === 'pending' ? pending : tab === 'approved' ? approved : claims
        const q = search.trim().toLowerCase()
        if (!q) return base
        return base.filter((c) =>
            [claimEmployeeName(c), c.employee?.employee_code, c.title, c.category_name]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q)),
        )
    }, [tab, claims, pending, approved, search])

    async function act(claim: ExpenseClaim, action: 'approve' | 'reject' | 'pay') {
        let note: string | null = null
        let paidOn: string | null = null
        if (action === 'reject') {
            note = window.prompt('เหตุผลที่ไม่อนุมัติ')
            if (!note?.trim()) return
        }
        if (action === 'pay') {
            paidOn = window.prompt('วันที่จ่ายเงิน (ปปปป-ดด-วว)', today())
            if (!paidOn) return
        }
        if (action === 'approve' && !window.confirm(`อนุมัติ "${claim.title}" ${formatBaht(claim.amount)} บาท?`)) return

        setBusyId(claim.id)
        const response = await fetch(`/api/hradmin/expense-claims/${claim.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, note, paid_on: paidOn }),
        })
        setBusyId(null)
        if (!response.ok) {
            const result = await response.json().catch(() => ({}))
            window.alert(result.error ?? 'บันทึกไม่สำเร็จ')
        }
        router.refresh()
    }

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'pending', label: 'รออนุมัติ', count: pending.length },
        { key: 'approved', label: 'รอจ่าย', count: approved.length },
        { key: 'all', label: 'ประวัติทั้งหมด' },
        { key: 'categories', label: 'ประเภทการเบิก' },
    ]

    return (
        <section className="space-y-4">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-200 ring-1 ring-amber-200/20">
                        <HandCoins className="h-6 w-6" />
                    </span>
                    <div>
                        <h1 className="text-2xl font-bold leading-tight">การเบิกค่าใช้จ่าย</h1>
                        <p className="text-sm text-white/60">อนุมัติคำขอ บันทึกการจ่าย และดูประวัติการเบิกทั้งหมด</p>
                    </div>
                </div>
                {!notReady && (
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-base font-bold text-black hover:bg-amber-300"
                    >
                        <Plus className="h-5 w-5" />
                        บันทึกการเบิกแทนพนักงาน
                    </button>
                )}
            </header>

            {notReady ? (
                <div className="rounded-3xl border border-yellow-300/30 bg-yellow-400/10 p-5 text-lg text-yellow-50">
                    ยังไม่พบตารางการเบิกในฐานข้อมูล กรุณารัน migration <code>20261117_create_expense_claims.sql</code> บน Supabase
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setTab(t.key)}
                                className={`rounded-xl border px-4 py-2 text-base font-semibold transition ${tab === t.key
                                    ? 'border-yellow-300/60 bg-yellow-300/20 text-yellow-50'
                                    : 'border-white/15 bg-white/10 text-white/75 hover:bg-white/15'
                                    }`}
                            >
                                {t.label}
                                {t.count ? <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">{t.count}</span> : null}
                            </button>
                        ))}
                    </div>

                    {tab === 'categories' ? (
                        <CategoryManager categories={categories} />
                    ) : (
                        <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-xl backdrop-blur">
                            <div className="border-b border-white/10 p-4">
                                <label className="relative block max-w-md">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="ค้นหาชื่อ รหัส หรือรายการ"
                                        className={`${inputClass} pl-12`}
                                    />
                                </label>
                            </div>
                            {visible.length === 0 ? (
                                <p className="p-8 text-center text-lg text-white/55">ไม่มีรายการ</p>
                            ) : visible.map((claim) => (
                                <div key={claim.id} className="flex flex-col gap-3 border-b border-white/10 p-4 last:border-b-0 lg:flex-row lg:items-center">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-lg font-bold">
                                            {claimEmployeeName(claim)}
                                            <span className="ml-2 text-base font-normal text-white/50">{claim.employee?.employee_code ?? ''} · {claim.employee?.department ?? '-'}</span>
                                        </p>
                                        <p className="text-lg">{claim.title}</p>
                                        <p className="text-base text-white/60">
                                            {claim.category_name} · ใช้จ่าย {formatThaiDate(claim.expense_date)} · ยื่น {formatThaiDate(claim.created_at)}
                                            {claim.submitted_by_name ? ` โดย ${claim.submitted_by_name}` : ''}
                                        </p>
                                        {claim.description && <p className="text-base text-white/50">{claim.description}</p>}
                                        {claim.status === 'rejected' && claim.review_note && <p className="text-base text-rose-200">เหตุผล: {claim.review_note}</p>}
                                        {claim.status === 'paid' && (
                                            <p className="text-base text-emerald-200">จ่ายวันที่ {formatThaiDate(claim.paid_on)}{claim.paid_by_name ? ` · บันทึกโดย ${claim.paid_by_name}` : ''}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                        <p className="mr-2 text-2xl font-bold">{formatBaht(claim.amount)} <span className="text-base">บาท</span></p>
                                        {claim.receipt_path && (
                                            <a href={`/api/expense-claims/${claim.id}/receipt`} target="_blank" rel="noreferrer" className="rounded-xl bg-white/10 p-3 text-cyan-100 hover:bg-white/15" title="ดูใบเสร็จ">
                                                <Paperclip className="h-5 w-5" />
                                            </a>
                                        )}
                                        {claim.status === 'pending' && (
                                            <>
                                                <button disabled={busyId === claim.id} onClick={() => act(claim, 'approve')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-4 py-3 text-lg font-bold text-white hover:bg-emerald-400 disabled:opacity-50">
                                                    <Check className="h-5 w-5" /> อนุมัติ
                                                </button>
                                                <button disabled={busyId === claim.id} onClick={() => act(claim, 'reject')} className="inline-flex items-center gap-1 rounded-xl bg-rose-500/80 px-4 py-3 text-lg font-bold text-white hover:bg-rose-500 disabled:opacity-50">
                                                    <X className="h-5 w-5" /> ไม่อนุมัติ
                                                </button>
                                            </>
                                        )}
                                        {claim.status === 'approved' && (
                                            <button disabled={busyId === claim.id} onClick={() => act(claim, 'pay')} className="inline-flex items-center gap-1 rounded-xl bg-cyan-500 px-4 py-3 text-lg font-bold text-white hover:bg-cyan-400 disabled:opacity-50">
                                                <Wallet className="h-5 w-5" /> บันทึกจ่ายแล้ว
                                            </button>
                                        )}
                                        {!['pending', 'approved'].includes(claim.status) && (
                                            <span className={`rounded-full border px-3 py-1 text-base font-semibold ${claimStatusClass(claim.status)}`}>{claimStatusLabel(claim.status)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {createOpen && (
                <CreateClaimDialog
                    employees={employees}
                    categories={categories.filter((c) => c.is_active)}
                    onClose={() => setCreateOpen(false)}
                    onSaved={() => { setCreateOpen(false); router.refresh() }}
                />
            )}
        </section>
    )
}

function CategoryManager({ categories }: { categories: ClaimCategory[] }) {
    const router = useRouter()
    const [name, setName] = useState('')

    async function send(url: string, method: string, body: unknown) {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!response.ok) {
            const result = await response.json().catch(() => ({}))
            window.alert(result.error ?? 'บันทึกไม่สำเร็จ')
            return false
        }
        router.refresh()
        return true
    }

    return (
        <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-xl backdrop-blur">
            <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={async (e) => {
                    e.preventDefault()
                    if (await send('/api/hradmin/expense-categories', 'POST', { name })) setName('')
                }}
            >
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อประเภทใหม่" maxLength={100} className={inputClass} />
                <button type="submit" disabled={!name.trim()} className="shrink-0 rounded-2xl bg-amber-400 px-6 py-3 text-lg font-bold text-black hover:bg-amber-300 disabled:opacity-50">
                    เพิ่มประเภท
                </button>
            </form>
            <p className="mt-2 text-base text-white/50">ปิดใช้งานแทนการลบ เพื่อให้ประวัติการเบิกเดิมยังอยู่ครบ</p>
            <ul className="mt-4 divide-y divide-white/10">
                {categories.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                        <span className={`text-lg ${c.is_active ? '' : 'text-white/40 line-through'}`}>{c.name}</span>
                        <div className="flex shrink-0 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const next = window.prompt('แก้ชื่อประเภท', c.name)
                                    if (next && next.trim() !== c.name) send(`/api/hradmin/expense-categories/${c.id}`, 'PATCH', { name: next })
                                }}
                                className="rounded-xl bg-white/10 px-4 py-2 text-base hover:bg-white/15"
                            >
                                แก้ชื่อ
                            </button>
                            <button
                                type="button"
                                onClick={() => send(`/api/hradmin/expense-categories/${c.id}`, 'PATCH', { is_active: !c.is_active })}
                                className="rounded-xl bg-white/10 px-4 py-2 text-base hover:bg-white/15"
                            >
                                {c.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function CreateClaimDialog({
    employees,
    categories,
    onClose,
    onSaved,
}: {
    employees: EmployeeOption[]
    categories: ClaimCategory[]
    onClose: () => void
    onSaved: () => void
}) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [alreadyPaid, setAlreadyPaid] = useState(false)

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSaving(true)
        setError(null)
        const form = new FormData(event.currentTarget)
        if (!alreadyPaid) form.delete('paid_on')
        const response = await fetch('/api/hradmin/expense-claims', { method: 'POST', body: form })
        const result = await response.json().catch(() => ({}))
        setSaving(false)
        if (!response.ok) {
            setError(result.error ?? 'บันทึกไม่สำเร็จ')
            return
        }
        onSaved()
    }

    return (
        <ClaimSheet title="บันทึกการเบิกแทนพนักงาน" subtitle="รายการที่ HR บันทึกจะถือว่าอนุมัติแล้ว" onClose={onClose} onSubmit={submit}>
                <div className="space-y-4">
                    <label className="block">
                        <span className="mb-1 block text-lg">พนักงาน</span>
                        <select name="employee_id" required defaultValue="" className={inputClass}>
                            <option value="" disabled>เลือกพนักงาน</option>
                            {employees.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-lg">ประเภท</span>
                        <select name="category_id" required defaultValue="" className={inputClass}>
                            <option value="" disabled>เลือกประเภท</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-lg">รายการ</span>
                        <input name="title" required maxLength={200} className={inputClass} />
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-lg">จำนวนเงิน (บาท)</span>
                            <input name="amount" required type="number" inputMode="decimal" min="0.01" step="0.01" className={inputClass} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-lg">วันที่ใช้จ่าย</span>
                            <input name="expense_date" required type="date" defaultValue={today()} className={inputClass} />
                        </label>
                    </div>
                    <label className="block">
                        <span className="mb-1 block text-lg">รายละเอียด (ไม่บังคับ)</span>
                        <textarea name="description" rows={2} maxLength={1000} className={inputClass} />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-lg">แนบใบเสร็จ (ไม่บังคับ)</span>
                        <input name="receipt" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="w-full text-base file:mr-3 file:rounded-xl file:border-0 file:bg-white/15 file:px-4 file:py-2 file:text-white" />
                    </label>
                    <label className="flex items-center gap-3 text-lg">
                        <input type="checkbox" checked={alreadyPaid} onChange={(e) => setAlreadyPaid(e.target.checked)} className="h-6 w-6" />
                        จ่ายเงินแล้ว
                    </label>
                    {alreadyPaid && (
                        <label className="block">
                            <span className="mb-1 block text-lg">วันที่จ่าย</span>
                            <input name="paid_on" type="date" required defaultValue={today()} className={inputClass} />
                        </label>
                    )}
                </div>
                {error && <p className="mt-4 rounded-2xl bg-rose-500/20 p-3 text-lg text-rose-100">{error}</p>}
                <button type="submit" disabled={saving} className="mt-6 w-full rounded-2xl bg-amber-400 py-4 text-xl font-bold text-black hover:bg-amber-300 disabled:opacity-60">
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
        </ClaimSheet>
    )
}
