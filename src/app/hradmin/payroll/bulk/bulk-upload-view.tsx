'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Upload, AlertTriangle, FileUp,
    Loader2, Wallet, Eye, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

const THAI_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]
const FILE_ACCEPT = [
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.heic',
    '.heif',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
].join(',')

interface Outcome {
    filename: string
    size: number
    status: 'ok' | 'matched' | 'no_match' | 'invalid_type' | 'too_large' | 'error'
    employee_id?: string
    employee_code?: string
    employee_name?: string
    error?: string
}
interface Summary {
    total: number
    ok: number
    matched: number
    no_match: number
    invalid_type: number
    too_large: number
    error: number
}

/**
 * Bulk upload — three-step wizard:
 *
 *   1. Pick period (year + month) and select files (multi-file
 *      <input type="file" multiple>).
 *   2. POST with ?dryRun=1 → server replies with per-file outcomes
 *      (matched / no_match / invalid_type / too_large) without
 *      writing anything. UI renders the preview table.
 *   3. User reviews, hits "ยืนยันอัปโหลด" → POST without dryRun;
 *      server saves and notifies. Replace the preview with the
 *      final summary.
 *
 * This pattern matches the bulk-emergency-contact import we shipped
 * earlier — HR likes it because they always want to know what's
 * about to happen before clicking the destructive button.
 */
export function BulkUploadView() {
    const router = useRouter()
    const now = new Date()

    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [files, setFiles] = useState<FileList | null>(null)
    const [stage, setStage] = useState<'pick' | 'preview' | 'done'>('pick')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [summary, setSummary] = useState<Summary | null>(null)
    const [outcomes, setOutcomes] = useState<Outcome[]>([])

    function handleFiles(nextFiles: FileList | null) {
        setFiles(nextFiles)
        setError(null)
        setSummary(null)
        setOutcomes([])
    }

    async function runUpload(dryRun: boolean) {
        if (!files || files.length === 0) {
            setError('กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์')
            return
        }
        setSubmitting(true)
        setError(null)
        try {
            const fd = new FormData()
            fd.append('year', String(year))
            fd.append('month', String(month))
            for (const file of Array.from(files)) {
                fd.append('file', file)
            }
            const url = `/api/hradmin/payroll/bulk-upload${dryRun ? '?dryRun=1' : ''}`
            const res = await fetch(url, { method: 'POST', body: fd })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(json.error ?? `Error ${res.status}`)
                return
            }
            setSummary(json.summary)
            setOutcomes(json.outcomes ?? [])
            setStage(dryRun ? 'preview' : 'done')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
        } finally {
            setSubmitting(false)
        }
    }

    function reset() {
        setStage('pick')
        setSummary(null)
        setOutcomes([])
        setError(null)
        setFiles(null)
        // Keep year/month in case HR is fixing one period and re-doing.
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[0.95rem] text-white/80">
                <Link href="/hradmin" className="hover:text-white">
                    <ArrowLeft size={14} className="inline mr-1" />
                    กลับ
                </Link>
                <span className="text-white/30">·</span>
                <span className="text-white/65">Payroll</span>
                <span className="text-white/30">·</span>
                <span className="text-white font-medium">Bulk Upload สลิปเงินเดือน</span>
            </div>

            {/* Header */}
            <header className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 inline-flex items-center justify-center shrink-0">
                    <Wallet size={20} className="text-emerald-300" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        อัปโหลดสลิปเงินเดือนพร้อมกัน
                    </h1>
                    <p className="text-white/65 text-[0.95rem] mt-1">
                        ลากไฟล์ PDF ของพนักงานทุกคนเข้ามาทีเดียว — ระบบจะจับคู่ไฟล์กับพนักงานจากชื่อไฟล์ที่มี <strong>รหัสพนักงาน</strong> อยู่
                    </p>
                </div>
            </header>

            {/* Filename pattern hint */}
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                <p className="text-sky-200 font-bold text-[0.9rem] mb-2">📋 รูปแบบชื่อไฟล์ที่ระบบเข้าใจ</p>
                <ul className="text-sky-100/85 text-[0.85rem] space-y-1 ml-5 list-disc">
                    <li><code className="bg-sky-900/30 px-1.5 py-0.5 rounded text-sky-100">060-01.pdf</code></li>
                    <li><code className="bg-sky-900/30 px-1.5 py-0.5 rounded text-sky-100">Slip_060-01_2026-04.pdf</code></li>
                    <li><code className="bg-sky-900/30 px-1.5 py-0.5 rounded text-sky-100">payroll-060-01-march.pdf</code></li>
                </ul>
                <p className="text-sky-100/65 text-[0.78rem] mt-2">
                    ระบบจะหารหัสพนักงาน (เช่น <code>060-01</code>) จากชื่อไฟล์ — มีตำแหน่งไหนก็ได้
                </p>
            </div>

            {/* Stage 1: Pick */}
            {stage === 'pick' && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="text-[0.75rem] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">
                                ปี (ค.ศ.)
                            </span>
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                min={2000} max={2100}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[0.75rem] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">
                                เดือน
                            </span>
                            <select
                                value={month}
                                onChange={(e) => setMonth(Number(e.target.value))}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-300/50"
                            >
                                {THAI_MONTHS.map((m, i) => (
                                    <option key={i} value={i + 1} className="bg-[#15040a]">{m}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="block">
                        <span className="text-[0.75rem] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">
                            ไฟล์สลิป (เลือกหลายไฟล์ได้)
                        </span>
                        <label className="flex min-h-[118px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-emerald-300/35 bg-emerald-500/8 px-4 py-5 text-center transition hover:bg-emerald-500/12 active:scale-[0.99]">
                            <FileUp size={24} className="text-emerald-200" />
                            <span className="text-sm font-bold text-white">แตะเพื่อเลือกไฟล์สลิป</span>
                            <span className="text-xs text-white/55">
                                รองรับ PDF, JPG, PNG, WEBP, HEIC · เลือกหลายไฟล์ได้
                            </span>
                            <input
                                type="file"
                                multiple
                                accept={FILE_ACCEPT}
                                onChange={(e) => handleFiles(e.target.files)}
                                className="sr-only"
                            />
                        </label>
                        {files && files.length > 0 && (
                            <p className="text-white/60 text-[0.85rem] mt-2">
                                เลือกไว้ {files.length} ไฟล์ · รวม {formatFileSize(
                                    Array.from(files).reduce((s, f) => s + f.size, 0)
                                )}
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200 inline-flex items-start gap-2 w-full">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => runUpload(true)}
                            disabled={submitting || !files || files.length === 0}
                            className="px-5 h-11 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-500/30"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    กำลังตรวจไฟล์…
                                </>
                            ) : (
                                <>
                                    <Eye size={14} />
                                    ตรวจสอบไฟล์ก่อน (Preview)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Stage 2 / 3: Preview / Done */}
            {(stage === 'preview' || stage === 'done') && summary && (
                <div className="space-y-4">
                    <SummaryBanner stage={stage} year={year} month={month} summary={summary} />

                    <OutcomeTable outcomes={outcomes} />

                    {error && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200 inline-flex items-start gap-2 w-full">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        {stage === 'preview' && (
                            <>
                                <button
                                    onClick={reset}
                                    disabled={submitting}
                                    className="px-4 h-11 rounded-lg bg-white/8 hover:bg-white/14 text-white/85 text-sm font-semibold border border-white/15"
                                >
                                    เลือกไฟล์ใหม่
                                </button>
                                <button
                                    onClick={() => runUpload(false)}
                                    disabled={submitting || summary.matched === 0}
                                    className="px-5 h-11 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-500/30"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            กำลังบันทึก…
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={14} />
                                            ยืนยันอัปโหลด {summary.matched} ไฟล์ + ส่งแจ้งเตือน
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                        {stage === 'done' && (
                            <button
                                onClick={() => { reset(); router.refresh() }}
                                className="px-5 h-11 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold"
                            >
                                อัปโหลดเดือนถัดไป
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Pieces ──────────────────────────────────────────────────────────────

function SummaryBanner({
    stage, year, month, summary,
}: {
    stage: 'preview' | 'done'
    year: number
    month: number
    summary: Summary
}) {
    const period = `${THAI_MONTHS[month - 1] ?? month} ${year + 543}`
    const errors = summary.no_match + summary.invalid_type + summary.too_large + summary.error
    const success = stage === 'done' ? summary.ok : summary.matched

    return (
        <div
            className="rounded-xl border p-4"
            style={{
                background: stage === 'done' ? 'rgba(16,185,129,0.10)' : 'rgba(251,191,36,0.10)',
                borderColor: stage === 'done' ? 'rgba(16,185,129,0.35)' : 'rgba(251,191,36,0.35)',
            }}
        >
            <p className="text-white font-bold text-base mb-1">
                {stage === 'done'
                    ? `✅ บันทึกแล้ว ${success} ไฟล์ · ${period}`
                    : `🔍 Preview · ${period}`}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[0.85rem] mt-2">
                <Stat label={stage === 'done' ? 'อัปโหลด' : 'จับคู่ได้'} value={success} color="emerald" />
                {summary.no_match > 0 && <Stat label="หารหัสไม่เจอ" value={summary.no_match} color="amber" />}
                {summary.invalid_type > 0 && <Stat label="ประเภทไฟล์ไม่ถูกต้อง" value={summary.invalid_type} color="red" />}
                {summary.too_large > 0 && <Stat label="ไฟล์ใหญ่เกิน" value={summary.too_large} color="red" />}
                {summary.error > 0 && <Stat label="error อื่นๆ" value={summary.error} color="red" />}
            </div>
            {errors > 0 && stage === 'preview' && (
                <p className="text-amber-200 text-[0.85rem] mt-3">
                    ⚠️ ไฟล์ที่ไม่ผ่านการจับคู่จะถูกข้ามไป — เปลี่ยนชื่อไฟล์แล้วลองใหม่ถ้าต้องการ
                </p>
            )}
        </div>
    )
}

function Stat({ label, value, color }: { label: string; value: number; color: 'emerald' | 'amber' | 'red' }) {
    const cssColor = { emerald: '#34d399', amber: '#fcd34d', red: '#fca5a5' }[color]
    return (
        <span className="inline-flex items-center gap-1.5 text-white/80">
            <span className="font-bold tabular-nums" style={{ color: cssColor }}>{value}</span>
            <span className="text-white/55">{label}</span>
        </span>
    )
}

function OutcomeTable({ outcomes }: { outcomes: Outcome[] }) {
    if (outcomes.length === 0) return null
    return (
        <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-[0.85rem]">
                    <thead className="bg-white/[0.04] text-white/60">
                        <tr>
                            <th className="text-left px-3 py-2 font-semibold">ไฟล์</th>
                            <th className="text-left px-3 py-2 font-semibold">พนักงาน</th>
                            <th className="text-left px-3 py-2 font-semibold">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {outcomes.map((o, i) => (
                            <tr key={`${o.filename}-${i}`} className="border-t border-white/5">
                                <td className="px-3 py-2 text-white/85 truncate max-w-[280px]">
                                    {o.filename}
                                </td>
                                <td className="px-3 py-2 text-white/75">
                                    {o.employee_code ? (
                                        <>
                                            <span className="text-white">{o.employee_name}</span>
                                            <span className="text-white/45 ml-1.5">[{o.employee_code}]</span>
                                        </>
                                    ) : (
                                        <span className="text-white/40">—</span>
                                    )}
                                </td>
                                <td className="px-3 py-2">
                                    <StatusPill status={o.status} error={o.error} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function StatusPill({ status, error }: { status: Outcome['status']; error?: string }) {
    const map: Record<Outcome['status'], { label: string; tone: 'green' | 'amber' | 'red' | 'sky' }> = {
        ok:           { label: '✓ บันทึกแล้ว', tone: 'green' },
        matched:      { label: '✓ จับคู่ได้',  tone: 'sky' },
        no_match:     { label: 'หารหัสไม่เจอ', tone: 'amber' },
        invalid_type: { label: 'ประเภทไฟล์',   tone: 'red' },
        too_large:    { label: 'ใหญ่เกิน',     tone: 'red' },
        error:        { label: 'error',        tone: 'red' },
    }
    const m = map[status]
    const tone = {
        green: { color: '#34d399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' },
        sky:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.3)' },
        amber: { color: '#fcd34d', bg: 'rgba(252,211,77,0.15)', border: 'rgba(252,211,77,0.3)' },
        red:   { color: '#fca5a5', bg: 'rgba(252,165,165,0.15)', border: 'rgba(252,165,165,0.3)' },
    }[m.tone]
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.78rem] font-semibold whitespace-nowrap"
            style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
            title={error ?? undefined}
        >
            {m.label}
        </span>
    )
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
