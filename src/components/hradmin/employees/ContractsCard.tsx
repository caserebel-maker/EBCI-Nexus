'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    FileText, Upload, Download, Trash2, Loader2, AlertTriangle,
    Check, FileSignature, X,
} from 'lucide-react'

/**
 * ContractsCard — section that lives on the employee profile page so
 * HR can see every signed contract for that employee in one place,
 * plus upload a new scan/PDF without leaving the page.
 *
 * Two modes:
 *   - read mode: list of contracts + per-row download & delete actions
 *   - upload mode: inline form (toggle via "+ อัปโหลดสัญญาใหม่")
 *
 * Uploads use multipart POST so files stream through Next's edge
 * runtime without burning memory. The server routes are at
 * /api/hradmin/employees/[id]/contracts and .../contracts/[contractId].
 */

export interface Contract {
    id: string
    contract_type: 'probation' | 'permanent' | 'amendment' | 'renewal' | 'termination'
    signed_date: string
    effective_start: string | null
    effective_end: string | null
    file_path: string
    file_name: string | null
    file_size: number | null
    mime_type: string | null
    page_count: number | null
    notes: string | null
    uploaded_at: string
}

interface Props {
    employeeId: string         // employee_code or UUID — whatever the page URL uses
    contracts: Contract[]
    canEdit: boolean           // HR-only flag from the page
}

const CONTRACT_TYPE_LABELS: Record<Contract['contract_type'], { th: string; color: string; bg: string }> = {
    probation:   { th: 'ทดลองงาน',   color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
    permanent:   { th: 'ประจำ',       color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
    amendment:   { th: 'แก้ไข',        color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    renewal:     { th: 'ต่ออายุ',      color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    termination: { th: 'สิ้นสุดสัญญา', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
}

export function ContractsCard({ employeeId, contracts, canEdit }: Props) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [isDeleting, startDelete] = useTransition()
    const [deleteError, setDeleteError] = useState<string | null>(null)

    function handleDelete(contractId: string) {
        const reason = window.prompt(
            'เหตุผลที่ลบสัญญานี้ (เช่น "อัปโหลดผิดไฟล์", "เซ็นซ้ำ"):',
            '',
        )
        if (reason === null) return  // user cancelled prompt

        startDelete(async () => {
            setDeleteError(null)
            try {
                const res = await fetch(
                    `/api/hradmin/employees/${employeeId}/contracts/${contractId}`,
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
            className="shadow-xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <FileSignature size={18} className="text-amber-200/85" />
                    <h2 className="text-[1.05rem] font-bold text-white tracking-wide">
                        เอกสารสัญญาจ้าง
                    </h2>
                    <span className="text-[0.85rem] text-white/55">
                        ({contracts.length} ฉบับ)
                    </span>
                </div>
                {canEdit && !showForm && (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/30"
                    >
                        <Upload size={13} />
                        อัปโหลดสัญญาใหม่
                    </button>
                )}
            </div>

            {/* Upload form (collapsed by default) */}
            {canEdit && showForm && (
                <UploadForm
                    employeeId={employeeId}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); router.refresh() }}
                />
            )}

            {/* Error from delete */}
            {deleteError && (
                <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-[0.85rem] text-red-200 inline-flex items-start gap-2 w-full">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>{deleteError}</span>
                </div>
            )}

            {/* List */}
            {contracts.length === 0 ? (
                <EmptyState canUpload={canEdit} onUpload={() => setShowForm(true)} />
            ) : (
                <ul className="space-y-2.5">
                    {contracts.map((c) => (
                        <ContractRow
                            key={c.id}
                            contract={c}
                            employeeId={employeeId}
                            canDelete={canEdit}
                            onDelete={() => handleDelete(c.id)}
                            isDeleting={isDeleting}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}

// ── Pieces ──────────────────────────────────────────────────────────────

function EmptyState({ canUpload, onUpload }: { canUpload: boolean; onUpload: () => void }) {
    return (
        <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-white/30 mb-2" />
            <p className="text-white/65 text-[0.95rem] mb-3">ยังไม่มีเอกสารสัญญาจ้างในระบบ</p>
            {canUpload && (
                <button
                    type="button"
                    onClick={onUpload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/14 text-white/80 text-xs font-semibold border border-white/15"
                >
                    <Upload size={12} />
                    อัปโหลดสัญญาแรก
                </button>
            )}
        </div>
    )
}

function ContractRow({
    contract, employeeId, canDelete, onDelete, isDeleting,
}: {
    contract: Contract
    employeeId: string
    canDelete: boolean
    onDelete: () => void
    isDeleting: boolean
}) {
    const meta = CONTRACT_TYPE_LABELS[contract.contract_type]
    const downloadUrl = `/api/hradmin/employees/${employeeId}/contracts/${contract.id}`

    return (
        <li
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/8 hover:border-white/15 transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)' }}
        >
            {/* Type badge */}
            <span
                className="shrink-0 px-2.5 py-1 rounded-md text-[0.78rem] font-bold whitespace-nowrap"
                style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30` }}
            >
                {meta.th}
            </span>

            {/* Date + filename */}
            <div className="flex-1 min-w-0">
                <p className="text-white text-[0.95rem] font-semibold leading-snug truncate">
                    {formatThaiDate(contract.signed_date)}
                </p>
                <p className="text-white/55 text-[0.8rem] truncate">
                    {contract.file_name ?? 'สัญญา.pdf'}
                    {contract.file_size && (
                        <span className="text-white/35"> · {formatFileSize(contract.file_size)}</span>
                    )}
                </p>
            </div>

            {/* Actions */}
            <a
                href={downloadUrl}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/12 text-white/75 hover:text-white text-[0.8rem] font-semibold border border-white/10"
                title="ดาวน์โหลดสัญญา"
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
                    title="ลบสัญญา (soft delete)"
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
    const [file, setFile] = useState<File | null>(null)
    const [contractType, setContractType] = useState<Contract['contract_type']>('permanent')
    const [signedDate, setSignedDate] = useState(() => todayKey())
    const [effectiveStart, setEffectiveStart] = useState('')
    const [effectiveEnd, setEffectiveEnd] = useState('')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return
        if (!file) {
            setError('กรุณาเลือกไฟล์สัญญา')
            return
        }

        setSubmitting(true)
        setError(null)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('contract_type', contractType)
            fd.append('signed_date', signedDate)
            if (effectiveStart) fd.append('effective_start', effectiveStart)
            if (effectiveEnd) fd.append('effective_end', effectiveEnd)
            if (notes.trim()) fd.append('notes', notes.trim())

            const res = await fetch(`/api/hradmin/employees/${employeeId}/contracts`, {
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
                    อัปโหลดสัญญาจ้างใหม่
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-white/55 hover:text-white hover:bg-white/10"
                    title="ยกเลิก"
                >
                    <X size={14} />
                </button>
            </div>

            {/* File picker — accepts PDF + image, supports phone camera */}
            <label className="block">
                <span className="text-[0.75rem] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">
                    ไฟล์สัญญา (PDF หรือรูปภาพ ≤ 20MB)
                </span>
                <input
                    type="file"
                    accept="application/pdf,image/*"
                    capture="environment"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={submitting}
                    required
                    className="block w-full text-sm text-white/85 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-emerald-500/20 file:text-emerald-100 file:font-semibold hover:file:bg-emerald-500/30 file:cursor-pointer"
                />
                {file && (
                    <p className="text-white/60 text-[0.78rem] mt-1.5">
                        {file.name} · {formatFileSize(file.size)} · {file.type || '—'}
                    </p>
                )}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="ประเภทสัญญา *">
                    <select
                        value={contractType}
                        onChange={(e) => setContractType(e.target.value as Contract['contract_type'])}
                        disabled={submitting}
                        required
                        className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50"
                    >
                        <option value="probation"   className="bg-[#15040a]">ทดลองงาน</option>
                        <option value="permanent"   className="bg-[#15040a]">ประจำ</option>
                        <option value="amendment"   className="bg-[#15040a]">แก้ไข (ขึ้นเงินเดือน / เปลี่ยนตำแหน่ง)</option>
                        <option value="renewal"     className="bg-[#15040a]">ต่ออายุ</option>
                        <option value="termination" className="bg-[#15040a]">สิ้นสุดสัญญา</option>
                    </select>
                </FormField>

                <FormField label="วันที่ลงนาม *">
                    <input
                        type="date"
                        value={signedDate}
                        onChange={(e) => setSignedDate(e.target.value)}
                        disabled={submitting}
                        required
                        className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50"
                    />
                </FormField>

                <FormField label="เริ่มมีผล (optional)">
                    <input
                        type="date"
                        value={effectiveStart}
                        onChange={(e) => setEffectiveStart(e.target.value)}
                        disabled={submitting}
                        className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50"
                    />
                </FormField>

                <FormField label="สิ้นสุด (optional)">
                    <input
                        type="date"
                        value={effectiveEnd}
                        onChange={(e) => setEffectiveEnd(e.target.value)}
                        disabled={submitting}
                        className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50"
                    />
                </FormField>
            </div>

            <FormField label="หมายเหตุ (optional)">
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={submitting}
                    rows={2}
                    placeholder="เช่น ปรับเงินเดือนรอบกลางปี / ต่ออายุ 1 ปี"
                    className="w-full px-3 py-2 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50 resize-none"
                />
            </FormField>

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
                            บันทึกสัญญา
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="text-[0.72rem] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">
                {label}
            </span>
            {children}
        </label>
    )
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatThaiDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function todayKey(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
