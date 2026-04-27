'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Upload, RefreshCcw, Check, AlertTriangle, Loader2,
    PhoneCall, Users, FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Tab-separated / CSV paste-form for bulk emergency-contact import.
 *
 * Workflow:
 *   1. HR pastes 4 columns (code, name, phone, relation) — tab OR comma
 *   2. Click Preview → server returns counts + sample
 *   3. Confirm overwrite policy → click Apply
 *
 * No file picker — paste is faster for the typical workflow (HR has
 * the data in Excel and just copy-paste). File upload can come later.
 */

interface ParsedRow {
    employee_code: string
    name: string
    phone: string
    relation: string
}

interface PreviewResp {
    success: true
    counts: {
        apply: number
        skip_existing: number
        skip_unknown: number
        skip_invalid: number
    }
    sample: Array<{
        employee_code: string | null
        employee_id: string | null
        name: string | null
        action: 'apply' | 'skip-existing' | 'skip-unknown' | 'skip-invalid'
        reason?: string
        new_contact?: { name?: string; phone?: string; relation?: string | null } | null
    }>
}

const SAMPLE = `001-23\tแม่ สมศรี\t081-234-5678\tแม่
001-25\tพี่ชาย วิชัย\t082-345-6789\tพี่ชาย
002-10\tภรรยา นภา\t083-456-7890\tภรรยา`

export function BulkEmergencyView() {
    const router = useRouter()
    const [raw, setRaw] = useState('')
    const [overwrite, setOverwrite] = useState(false)
    const [preview, setPreview] = useState<PreviewResp | null>(null)
    const [busy, setBusy] = useState<'idle' | 'previewing' | 'applying'>('idle')
    const [error, setError] = useState<string | null>(null)
    const [resultMsg, setResultMsg] = useState<string | null>(null)

    const parsed = parsePasted(raw)

    const runPreview = async () => {
        setBusy('previewing')
        setError(null)
        setResultMsg(null)
        setPreview(null)
        try {
            const res = await fetch('/api/hradmin/employees/bulk-emergency-contact', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    mode: 'preview',
                    rows: parsed,
                    overwrite,
                }),
            })
            const j = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`)
            setPreview(j as PreviewResp)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'preview ล้มเหลว')
        } finally {
            setBusy('idle')
        }
    }

    const runApply = async () => {
        if (!preview || preview.counts.apply === 0) return
        setBusy('applying')
        setError(null)
        try {
            const res = await fetch('/api/hradmin/employees/bulk-emergency-contact', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    mode: 'apply',
                    rows: parsed,
                    overwrite,
                }),
            })
            const j = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`)
            const failed = (j?.failures?.length ?? 0)
            setResultMsg(failed > 0
                ? `บันทึกแล้ว ${j.applied} แถว · ล้มเหลว ${failed}`
                : `บันทึกแล้ว ${j.applied} แถว`)
            setPreview(null)  // force re-preview before next apply
            setRaw('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'apply ล้มเหลว')
        } finally {
            setBusy('idle')
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                    <Link
                        href="/hradmin/employees"
                        className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white border border-white/15 transition-all shrink-0"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                            ผู้ติดต่อฉุกเฉิน — Bulk Import
                        </h1>
                        <p className="text-sm text-white/60 mt-0.5">
                            วางข้อมูลจาก Excel หลายแถวพร้อมกัน — preview ก่อน apply
                        </p>
                    </div>
                </div>
            </div>

            {/* Format hint */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet size={14} className="text-amber-300" />
                    <p className="text-sm font-bold text-white">รูปแบบที่รองรับ</p>
                </div>
                <p className="text-[11px] text-white/65 leading-relaxed">
                    4 คอลัมน์: <code className="text-amber-200">รหัสพนักงาน</code> ·
                    {' '}<code className="text-amber-200">ชื่อ</code> ·
                    {' '}<code className="text-amber-200">เบอร์โทร</code> ·
                    {' '}<code className="text-amber-200">ความสัมพันธ์ (ทางเลือก)</code>
                </p>
                <p className="text-[11px] text-white/45 mt-1">
                    คั่นด้วย Tab (paste จาก Excel) หรือ comma — แต่ละแถวเป็นพนักงาน 1 คน
                </p>
                <button
                    onClick={() => setRaw(SAMPLE)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/55 hover:text-white underline decoration-dotted"
                >
                    ดูตัวอย่าง
                </button>
            </div>

            {/* Paste area */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 bg-white/[0.03] border-b border-white/8 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                        ข้อมูลที่จะนำเข้า
                    </span>
                    <span className="text-[11px] text-white/45 tabular-nums">
                        {parsed.length} แถว
                    </span>
                </div>
                <textarea
                    value={raw}
                    onChange={e => { setRaw(e.target.value); setPreview(null); setResultMsg(null) }}
                    placeholder="วางข้อมูลที่นี่ — เช่น:&#10;001-23	แม่ สมศรี	081-234-5678	แม่"
                    rows={10}
                    className="w-full px-3 py-2.5 bg-[rgba(20,5,8,0.6)] text-white placeholder-white/30 text-sm font-mono resize-y focus:outline-none focus:bg-[rgba(20,5,8,0.8)] transition-colors"
                />
            </div>

            {/* Overwrite toggle */}
            <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] cursor-pointer hover:bg-white/[0.05] transition-colors">
                <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={e => { setOverwrite(e.target.checked); setPreview(null) }}
                    className="mt-0.5 h-4 w-4 accent-amber-400"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold">เขียนทับข้อมูลเดิม</p>
                    <p className="text-[11px] text-white/55 mt-0.5">
                        {overwrite
                            ? 'จะแทนที่ผู้ติดต่อฉุกเฉินที่มีอยู่ในระบบทั้งหมดที่ตรงรหัสในไฟล์'
                            : 'ข้ามแถวของคนที่มีผู้ติดต่อฉุกเฉินอยู่แล้ว — ปลอดภัยกว่า ปกติเลือกตัวนี้'}
                    </p>
                </div>
            </label>

            {/* Preview result */}
            {preview && (
                <div className="rounded-xl border border-amber-300/30 bg-amber-400/[0.06] p-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <SummaryStat label="จะบันทึก"     value={preview.counts.apply}         tone="green" />
                        <SummaryStat label="ข้าม (มีแล้ว)" value={preview.counts.skip_existing} tone="amber" />
                        <SummaryStat label="ไม่พบ"        value={preview.counts.skip_unknown}  tone="red" />
                        <SummaryStat label="ขาดข้อมูล"    value={preview.counts.skip_invalid}  tone="red" />
                    </div>

                    {preview.sample.length > 0 && (
                        <div className="rounded-lg bg-black/20 border border-white/10 overflow-hidden">
                            <table className="w-full text-[11px]">
                                <thead className="text-white/45 border-b border-white/10">
                                    <tr>
                                        <th className="text-left px-2 py-1.5 font-semibold">รหัส</th>
                                        <th className="text-left px-2 py-1.5 font-semibold">พนักงาน</th>
                                        <th className="text-left px-2 py-1.5 font-semibold">ผลลัพธ์</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {preview.sample.map((p, i) => (
                                        <tr key={i}>
                                            <td className="px-2 py-1.5 text-white/85 font-mono">{p.employee_code ?? '—'}</td>
                                            <td className="px-2 py-1.5 text-white/75 truncate max-w-[200px]">{p.name ?? '—'}</td>
                                            <td className="px-2 py-1.5">
                                                <ActionBadge action={p.action} reason={p.reason} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Result + error */}
            {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/20 text-xs text-red-200">
                    {error}
                </div>
            )}
            {resultMsg && (
                <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-sm text-emerald-100 inline-flex items-center gap-2">
                    <Check size={14} />
                    {resultMsg}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 flex-wrap">
                <button
                    onClick={runPreview}
                    disabled={parsed.length === 0 || busy !== 'idle'}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white/10 text-white border border-white/15 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {busy === 'previewing' ? (
                        <><Loader2 size={14} className="animate-spin" /> กำลัง preview</>
                    ) : (
                        <><RefreshCcw size={14} /> Preview ({parsed.length})</>
                    )}
                </button>
                <button
                    onClick={runApply}
                    disabled={!preview || preview.counts.apply === 0 || busy !== 'idle'}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-400 text-[#2a0a0e] shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
                >
                    {busy === 'applying' ? (
                        <><Loader2 size={14} className="animate-spin" /> กำลังบันทึก</>
                    ) : (
                        <><Upload size={14} /> Apply{preview ? ` (${preview.counts.apply})` : ''}</>
                    )}
                </button>
            </div>

            <button
                onClick={() => router.push('/hradmin/employees')}
                className="text-xs text-white/55 hover:text-white underline decoration-dotted"
            >
                ← กลับไปหน้ารายชื่อพนักงาน
            </button>
        </div>
    )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parsePasted(raw: string): ParsedRow[] {
    return raw.split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean)
        .map(line => {
            // Tab first; comma fallback. Tab is the default when pasting
            // from Excel/Google Sheets so it should win.
            const cells = line.includes('\t') ? line.split('\t') : line.split(',')
            const [code = '', name = '', phone = '', relation = ''] = cells.map(c => c.trim())
            return { employee_code: code, name, phone, relation }
        })
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'amber' | 'red' }) {
    const toneClass = tone === 'green' ? 'text-emerald-200'
        : tone === 'amber' ? 'text-amber-200'
        : 'text-red-200'
    return (
        <div>
            <p className={cn('text-2xl font-bold tabular-nums', toneClass)}>{value}</p>
            <p className="text-[10px] text-white/55 uppercase tracking-wider">{label}</p>
        </div>
    )
}

function ActionBadge({ action, reason }: { action: string; reason?: string }) {
    const meta: Record<string, { label: string; bg: string; color: string }> = {
        'apply':         { label: 'บันทึก',     bg: 'rgba(52,211,153,0.18)', color: '#6ee7b7' },
        'skip-existing': { label: 'มีแล้ว',     bg: 'rgba(251,191,36,0.18)', color: '#fcd34d' },
        'skip-unknown':  { label: 'ไม่พบ',      bg: 'rgba(239,68,68,0.18)',  color: '#fca5a5' },
        'skip-invalid':  { label: 'ขาดข้อมูล', bg: 'rgba(239,68,68,0.18)',  color: '#fca5a5' },
    }
    const m = meta[action] ?? meta['skip-invalid']
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: m.bg, color: m.color }}
            title={reason}
        >
            {m.label}
        </span>
    )
}
