'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, KeyRound, Loader2, ShieldAlert, X } from 'lucide-react'
import { approvePasswordRequest, rejectPasswordRequest } from './actions'

export interface PasswordRequestRow {
    id: string
    userId: string
    name: string
    email: string
    source: 'forgot_password' | 'in_app'
    status: 'pending' | 'processing' | 'approved' | 'rejected'
    requestedAt: string
    reviewedAt: string | null
    reviewNote: string | null
    requestedIp?: string | null
    requestedUserAgent?: string | null
}

const statusLabel = {
    pending: 'รอตรวจสอบ',
    processing: 'กำลังดำเนินการ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธแล้ว',
}

export function PasswordRequestsClient({ rows }: { rows: PasswordRequestRow[] }) {
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [message, setMessage] = useState<string | null>(null)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()

    const run = (row: PasswordRequestRow, action: 'approve' | 'reject') => {
        setActiveId(row.id)
        setMessage(null)
        startTransition(async () => {
            const result = action === 'approve'
                ? await approvePasswordRequest(row.id, notes[row.id])
                : await rejectPasswordRequest(row.id, notes[row.id])
            setMessage(result.error ?? (action === 'approve' ? 'อนุมัติและส่งลิงก์เรียบร้อยแล้ว' : 'ปฏิเสธคำขอเรียบร้อยแล้ว'))
            setActiveId(null)
        })
    }

    const ordered = [...rows].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'))
    const pendingCount = rows.filter((row) => row.status === 'pending').length

    return (
        <div className="space-y-5">
            <div className="flex items-start gap-3">
                <Link href="/hradmin/settings" className="mt-1 rounded-lg p-2 text-white/65 hover:bg-white/10 hover:text-white" aria-label="กลับ">
                    <ArrowLeft size={19} />
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <KeyRound size={22} className="text-amber-300" />
                        <h1 className="text-[22px] font-bold text-white">คำขอเปลี่ยนรหัสผ่าน</h1>
                    </div>
                    <p className="mt-1 text-sm text-white/60">อนุมัติได้เฉพาะ Super Admin · รอตรวจสอบ {pendingCount} รายการ</p>
                </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-relaxed text-white/75">
                <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-200" />
                <p>ตรวจสอบชื่อ อีเมล และ IP Address ก่อนอนุมัติ ระบบจะส่งลิงก์ตั้งรหัสใหม่ให้เจ้าของบัญชี และบันทึกผู้อนุมัติกับเวลาไว้ทุกครั้ง</p>
            </div>

            {message && <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">{message}</div>}

            <div className="space-y-3">
                {ordered.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center text-white/60">ยังไม่มีคำขอเปลี่ยนรหัสผ่าน</div>}
                {ordered.map((row) => {
                    const isPending = row.status === 'pending'
                    const isBusy = pending && activeId === row.id
                    return (
                        <section key={row.id} className={`rounded-2xl border p-4 sm:p-5 ${isPending ? 'border-amber-300/25 bg-white/[0.10]' : 'border-white/10 bg-white/[0.05] opacity-75'}`}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-base font-bold text-white">{row.name}</h2>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${row.status === 'pending' ? 'bg-amber-300/15 text-amber-200' : row.status === 'approved' ? 'bg-emerald-300/15 text-emerald-200' : row.status === 'processing' ? 'bg-sky-300/15 text-sky-200' : 'bg-red-300/15 text-red-200'}`}>{statusLabel[row.status]}</span>
                                    </div>
                                    <p className="mt-1 break-all text-sm text-white/65">{row.email}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/55">
                                        <span>{row.source === 'in_app' ? '📱 ตั้งค่าในระบบ' : '🌐 หน้าลืมรหัสผ่าน'}</span>
                                        <span>·</span>
                                        <span>{new Date(row.requestedAt).toLocaleString('th-TH')}</span>
                                        {row.requestedIp && (
                                            <>
                                                <span>·</span>
                                                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                                                    IP: {row.requestedIp}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {!isPending && row.reviewedAt && <p className="mt-2 text-xs text-white/45">ดำเนินการ {new Date(row.reviewedAt).toLocaleString('th-TH')}{row.reviewNote ? ` · ${row.reviewNote}` : ''}</p>}
                                </div>
                            </div>

                            {isPending && (
                                <div className="mt-4 border-t border-white/10 pt-4">
                                    <label className="mb-1.5 block text-xs font-semibold text-white/65">หมายเหตุ (ไม่บังคับ)</label>
                                    <input
                                        value={notes[row.id] ?? ''}
                                        onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                                        placeholder="เช่น ยืนยันกับเจ้าของบัญชีแล้ว"
                                        className="w-full rounded-xl border border-white/15 bg-black/15 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-300/40"
                                    />
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button type="button" disabled={pending} onClick={() => run(row, 'reject')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2.5 text-sm font-bold text-red-100 disabled:opacity-50">
                                            <X size={16} /> ปฏิเสธ
                                        </button>
                                        <button type="button" disabled={pending} onClick={() => run(row, 'approve')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 py-2.5 text-sm font-bold text-emerald-950 disabled:opacity-50">
                                            {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} อนุมัติและส่งลิงก์
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>
                    )
                })}
            </div>
        </div>
    )
}
