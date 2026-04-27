'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    Wallet, Upload, Download, Trash2, Loader2, AlertTriangle,
    Check, X,
} from 'lucide-react'

/**
 * SalarySlipsCard — HR-side section on the employee profile that
 * lists every active monthly slip and offers a single-month upload
 * form. Only renders when the parent page determines the viewer
 * has `can_manage_payroll` (so HR-Manager-without-payroll users
 * like มด don't even see the empty state).
 *
 * Bulk uploads (per-period across many employees) live on a
 * separate page at /hradmin/payroll/bulk; this card is for the
 * "I need to fix one person's slip" flow.
 */

const THAI_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

export interface SalarySlip {
    id: string
    year: number
    month: number  // 1-12
    file_name: string | null
    file_size: number | null
    mime_type: string | null
    notes: string | null
    uploaded_at: string
}

interface Props {
    employeeId: string         // employee_code or UUID
    slips: SalarySlip[]
    /** Mirror ContractsCard pattern: only show upload + delete
     *  while the parent profile is in edit mode, so the read
     *  view stays clean and HR doesn't click the green button by
     *  accident. */
    canEdit: boolean
}

export function SalarySlipsCard({ employeeId, slips, canEdit }: Props) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [isDeleting, startDelete] = useTransition()
    const [deleteError, setDeleteError] = useState<string | null>(null)

    function handleDelete(slipId: string, label: string) {
        const reason = window.prompt(
            `เหตุผลที่ลบสลิป ${label} (เช่น "อัปโหลดผิดเดือน"):`,
            '',
        )
        if (reason === null) return
        startDelete(async () => {
            setDeleteError(null)
            try {
                const res = await fetch(
                    `/api/hradmin/employees/${employeeId}/salary-slips/${slipId}`,
                    {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason: reason.trim() || null }),
                    },
                )
                const json = await res.json().catch(() => ({}))
                if (!res.ok) {
                    setDeleteError(json.error ?? `Error ${res.status}`)
                    return
                }
                router.refresh()
            } catch (err) {
                setDeleteError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
            }
        })
    }

    return (
        <div
            style={{
                background: 'rgba(21,4,10,0.55)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 16,
                padding: '20px 22px',
                backdropFilter: 'blur(6px)',
            }}
            className="shadow-xl print:hidden"
        >
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <Wallet size={18} className="text-emerald-300/85" />
                    <h2 className="text-[1.05rem] font-bold text-white tracking-wide">
                        สลิปเงินเดือน
                    </h2>
                    <span className="text-[0.85rem] text-white/55">
                        ({slips.length} รายการ)
                    </span>
                </div>
                {canEdit && !showForm && (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/30"
                    >
                        <Upload size={13} />
                        อัปโหลดสลิป
                    </button>
                )}
            </div>

            {canEdit && showForm && (
                <UploadForm
                    employeeId={employeeId}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); router.refresh() }}
                />
            )}

            {deleteError && (
                <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-[0.85rem] text-red-200 inline-flex items-start gap-2 w-full">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>{deleteError}</span>
                </div>
            )}

            {slips.length === 0 ? (
                <div className="text-center py-8">
                    <Wallet size={32} className="mx-auto text-white/30 mb-2" />
                    <p className="text-white/65 text-[0.95rem] mb-1">ยังไม่มีสลิปในระบบ</p>
                    <p className="text-white/45 text-[0.78rem]">
                        ใช้ <a href="/hradmin/payroll/bulk" className="text-emerald-200/85 underline-offset-2 hover:underline">หน้า Bulk Upload</a> ถ้าจะอัปโหลดทั้งบริษัทพร้อมกัน
                    </p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {slips.map((slip) => (
                        <SlipRow
                            key={slip.id}
                            slip={slip}
                            employeeId={employeeId}
                            canDelete={canEdit}
                            onDelete={() => handleDelete(slip.id, `${THAI_MONTHS[slip.month - 1]} ${slip.year + 543}`)}
                            isDeleting={isDeleting}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}

// ── Pieces ──────────────────────────────────────────────────────────────

function SlipRow({
    slip, employeeId, canDelete, onDelete, isDeleting,
}: {
    slip: SalarySlip
    employeeId: string
    canDelete: boolean
    onDelete: () => void
    isDeleting: boolean
}) {
    const downloadUrl = `/api/hradmin/employees/${employeeId}/salary-slips/${slip.id}`
    const periodLabel = `${THAI_MONTHS[slip.month - 1] ?? slip.month} ${slip.year + 543}`

    return (
        <li
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/8 hover:border-white/15 transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)' }}
        >
            <span className="shrink-0 px-2.5 py-1 rounded-md text-[0.78rem] font-bold whitespace-nowrap"
                style={{ color: '#34d399', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
                {periodLabel}
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-white text-[0.9rem] truncate">
                    {slip.file_name ?? 'slip.pdf'}
                    {slip.file_size && (
                        <span className="text-white/40"> · {formatFileSize(slip.file_size)}</span>
                    )}
                </p>
                {slip.notes && (
                    <p className="text-white/55 text-[0.75rem] truncate">{slip.notes}</p>
                )}
            </div>
            <a
                href={downloadUrl}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/12 text-white/75 hover:text-white text-[0.8rem] font-semibold border border-white/10"
                title="ดาวน์โหลดสลิป"
            >
                <Download size={12} />
                ดาวน์โหลด
            </a>
            {canDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 disabled:opacity-50"
                    title="ลบสลิป (soft delete)"
                >
                    {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
            )}
        </li>
    )
}

function UploadForm({
    employeeId, onClose, onSuccess,
}: {
    employeeId: string
    onClose: () => void
    onSuccess: () => void
}) {
    const now = new Date()
    const [file, setFile] = useState<File | null>(null)
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (submitting || !file) return
        setSubmitting(true)
        setError(null)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('year', String(year))
            fd.append('month', String(month))
            if (notes.trim()) fd.append('notes', notes.trim())
            const res = await fetch(`/api/hradmin/employees/${employeeId}/salary-slips`, {
                method: 'POST',
                body: fd,
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(json.error ?? `Error ${res.status}`)
                return
            }
            onSuccess()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3"
        >
            <div className="flex items-center justify-between">
                <p className="text-emerald-200 font-bold text-[0.95rem] inline-flex items-center gap-1.5">
                    <Upload size={14} />
                    อัปโหลดสลิปใหม่
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-white/55 hover:text-white hover:bg-white/10"
                >
                    <X size={14} />
                </button>
            </div>

            <label className="block">
                <span className="text-[0.75rem] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">
                    ไฟล์สลิป (PDF/รูปภาพ ≤ 10MB)
                </span>
                <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={submitting}
                    required
                    className="block w-full text-sm text-white/85 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-emerald-500/20 file:text-emerald-100 file:font-semibold hover:file:bg-emerald-500/30 file:cursor-pointer"
                />
                {file && (
                    <p className="text-white/60 text-[0.78rem] mt-1.5">
                        {file.name} · {formatFileSize(file.size)}
                    </p>
                )}
            </label>

            <div className="grid grid-cols-2 gap-3">
                <label className="block">
                    <span className="text-[0.72rem] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">ปี (ค.ศ.)</span>
                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        min={2000} max={2100}
                        disabled={submitting}
                        required
                        className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50"
                    />
                </label>
                <label className="block">
                    <span className="text-[0.72rem] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">เดือน</span>
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        disabled={submitting}
                        required
                        className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50"
                    >
                        {THAI_MONTHS.map((m, i) => (
                            <option key={i} value={i + 1} className="bg-[#15040a]">{m}</option>
                        ))}
                    </select>
                </label>
            </div>

            <label className="block">
                <span className="text-[0.72rem] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">หมายเหตุ (optional)</span>
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={submitting}
                    placeholder="เช่น โบนัสประจำปี, ปรับเงินเดือน"
                    className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50"
                />
            </label>

            <p className="text-[0.75rem] text-white/55 leading-relaxed">
                💡 หากเดือนนี้มีสลิปอยู่แล้ว ระบบจะ replace ของเดิม (เก็บไว้ใน history) และส่ง notification + email ให้พนักงานอัตโนมัติ
            </p>

            {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-[0.85rem] text-red-200 inline-flex items-start gap-2 w-full">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/75 text-sm font-semibold border border-white/10 disabled:opacity-50"
                >
                    ยกเลิก
                </button>
                <button
                    type="submit"
                    disabled={submitting || !file}
                    className="px-5 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-500/30"
                >
                    {submitting ? (
                        <>
                            <Loader2 size={13} className="animate-spin" />
                            กำลังอัปโหลด…
                        </>
                    ) : (
                        <>
                            <Check size={13} />
                            บันทึก + ส่งแจ้งเตือน
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
