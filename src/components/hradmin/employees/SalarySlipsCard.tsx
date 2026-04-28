'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    Wallet, Upload, Download, Trash2, Loader2, AlertTriangle,
    Check, X, LayoutGrid, List, AlertCircle,
} from 'lucide-react'

/**
 * SalarySlipsCard — HR-side section on the employee profile that
 * lists every active monthly slip and offers a single-month upload
 * form. Only renders when the parent page determines the viewer
 * has `can_manage_payroll` (so HR-Manager-without-payroll users
 * like มด don't even see the empty state).
 *
 * Two views (toggled at the top of the card):
 *   - Grid (default): a 4×3 calendar grid for one year. Each cell
 *     shows the month name with a status indicator — ✅ uploaded,
 *     ⚠️ past month with no slip, — future month. Click ✅ to
 *     download, click ⚠️ in edit mode to upload that month directly.
 *   - List: scrollable list of slips for the selected year, each
 *     row with download + delete buttons.
 *
 * The year selector at the top scopes both views — flipping to a
 * past year shows that year's calendar / list.
 */

const THAI_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]
const THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
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

type ViewMode = 'grid' | 'list'

export function SalarySlipsCard({ employeeId, slips, canEdit }: Props) {
    const router = useRouter()

    // ── Index slips by "YYYY-M" so the grid can look one up in O(1)
    // and the list view can filter by year cheaply.
    const slipMap = useMemo(() => {
        const m = new Map<string, SalarySlip>()
        for (const s of slips) m.set(`${s.year}-${s.month}`, s)
        return m
    }, [slips])

    // Years that actually have at least one slip on file, descending.
    // We always include the current year so HR can land on "this year"
    // even before any slip exists for it.
    const now = new Date()
    const currentYear = now.getFullYear()
    const yearsWithSlips = useMemo(() => {
        const set = new Set<number>(slips.map(s => s.year))
        set.add(currentYear)
        return [...set].sort((a, b) => b - a)
    }, [slips, currentYear])

    const [selectedYear, setSelectedYear] = useState<number>(yearsWithSlips[0] ?? currentYear)
    const [viewMode, setViewMode] = useState<ViewMode>('grid')

    // Upload form state. `prefilledMonth` is set when HR clicks an
    // empty cell in the grid — the form opens with that month already
    // selected so the upload is one file-pick away.
    const [showForm, setShowForm] = useState(false)
    const [prefilledMonth, setPrefilledMonth] = useState<{ year: number; month: number } | null>(null)
    const openUploadFor = (year: number, month: number) => {
        setPrefilledMonth({ year, month })
        setShowForm(true)
    }
    const openBlankUpload = () => {
        setPrefilledMonth(null)
        setShowForm(true)
    }
    const closeUpload = () => {
        setShowForm(false)
        setPrefilledMonth(null)
    }

    // ── Delete (soft) ─────────────────────────────────────────────────
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

    // Slips for the year currently in focus, newest month first.
    const slipsForYear = useMemo(
        () => slips
            .filter(s => s.year === selectedYear)
            .sort((a, b) => b.month - a.month),
        [slips, selectedYear],
    )

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
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Wallet size={18} className="text-emerald-300/85 shrink-0" />
                    <h2 className="text-[1.05rem] font-bold text-white tracking-wide truncate">
                        สลิปเงินเดือน
                    </h2>
                    <span className="text-[0.85rem] text-white/55 shrink-0">
                        ({slips.length} รายการ)
                    </span>
                </div>
                {canEdit && !showForm && (
                    <button
                        type="button"
                        onClick={openBlankUpload}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/30"
                    >
                        <Upload size={13} />
                        อัปโหลดสลิป
                    </button>
                )}
            </div>

            {/* Inline upload form */}
            {canEdit && showForm && (
                <UploadForm
                    employeeId={employeeId}
                    initialYear={prefilledMonth?.year ?? selectedYear}
                    initialMonth={prefilledMonth?.month}
                    onClose={closeUpload}
                    onSuccess={() => { closeUpload(); router.refresh() }}
                />
            )}

            {deleteError && (
                <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-[0.85rem] text-red-200 inline-flex items-start gap-2 w-full">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>{deleteError}</span>
                </div>
            )}

            {/* Toolbar: view toggle + year selector. Always renders even
                with zero slips so HR sees the calendar skeleton from
                day one — empty grid is more useful than an empty-state
                text card. */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
                    <ViewToggleButton
                        active={viewMode === 'grid'}
                        onClick={() => setViewMode('grid')}
                        icon={<LayoutGrid size={13} />}
                        label="ปฏิทิน"
                    />
                    <ViewToggleButton
                        active={viewMode === 'list'}
                        onClick={() => setViewMode('list')}
                        icon={<List size={13} />}
                        label="รายการ"
                    />
                </div>

                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-9 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm font-semibold focus:outline-none focus:border-emerald-300/50"
                >
                    {yearsWithSlips.map((y) => (
                        <option key={y} value={y} className="bg-[#15040a]">
                            ปี {y + 543} ({slips.filter(s => s.year === y).length} ฉบับ)
                        </option>
                    ))}
                </select>
            </div>

            {/* Body — grid (default) or list. Both handle the
                "year has no slip" case internally; the upper-level
                "no slips at all" hint sits as a banner above the grid. */}
            {slips.length === 0 && (
                <div className="mb-3 rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2 text-[0.78rem] text-white/60 leading-relaxed">
                    ยังไม่มีสลิปในระบบ — {canEdit ? <>กดเซลล์เดือนใดก็ได้ในปฏิทินด้านล่างเพื่ออัปโหลดทีละเดือน · หรือใช้ <a href="/hradmin/payroll/bulk" className="text-emerald-200/85 underline-offset-2 hover:underline">หน้า Bulk Upload</a> สำหรับทั้งบริษัทพร้อมกัน</> : 'ฝ่ายบัญชีจะอัปโหลดและส่ง notification + email ให้พนักงานเมื่อสลิปพร้อม'}
                </div>
            )}

            {viewMode === 'grid' ? (
                <CalendarGridView
                    year={selectedYear}
                    slipMap={slipMap}
                    employeeId={employeeId}
                    canEdit={canEdit}
                    onUploadMonth={openUploadFor}
                    currentYear={currentYear}
                    currentMonth={now.getMonth() + 1}
                />
            ) : (
                <ListView
                    slips={slipsForYear}
                    employeeId={employeeId}
                    canDelete={canEdit}
                    isDeleting={isDeleting}
                    onDelete={handleDelete}
                />
            )}
        </div>
    )
}

// ── Toolbar pieces ──────────────────────────────────────────────────────

function ViewToggleButton({
    active, onClick, icon, label,
}: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.78rem] font-semibold transition-colors ${
                active
                    ? 'bg-emerald-500/20 text-emerald-100 shadow-inner'
                    : 'text-white/65 hover:text-white hover:bg-white/5'
            }`}
        >
            {icon}
            {label}
        </button>
    )
}

// ── Calendar grid view ─────────────────────────────────────────────────

function CalendarGridView({
    year, slipMap, employeeId, canEdit, onUploadMonth, currentYear, currentMonth,
}: {
    year: number
    slipMap: Map<string, SalarySlip>
    employeeId: string
    canEdit: boolean
    onUploadMonth: (year: number, month: number) => void
    currentYear: number
    currentMonth: number  // 1-12
}) {
    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const slip = slipMap.get(`${year}-${month}`)
                    // Three states drive the cell appearance:
                    //   - has slip: green, click to download
                    //   - no slip + month already passed: amber "missing"
                    //   - no slip + month is in the future: dim placeholder
                    const isFuture =
                        year > currentYear ||
                        (year === currentYear && month > currentMonth)
                    const state: CellState = slip
                        ? 'filled'
                        : isFuture
                            ? 'future'
                            : 'missing'
                    return (
                        <CalendarCell
                            key={month}
                            year={year}
                            month={month}
                            state={state}
                            slip={slip ?? null}
                            employeeId={employeeId}
                            canEdit={canEdit}
                            onUpload={() => onUploadMonth(year, month)}
                        />
                    )
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.75rem] text-white/55">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/60 border border-emerald-400/50" />
                    มีสลิป — กดเพื่อดาวน์โหลด
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/40 border border-amber-400/40" />
                    ยังไม่มี — รอเดือนผ่าน{canEdit ? ' / กดเพื่ออัปโหลด' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-white/10 border border-white/15" />
                    ยังไม่ถึงเดือน
                </span>
            </div>
        </>
    )
}

type CellState = 'filled' | 'missing' | 'future'

function CalendarCell({
    year, month, state, slip, employeeId, canEdit, onUpload,
}: {
    year: number
    month: number
    state: CellState
    slip: SalarySlip | null
    employeeId: string
    canEdit: boolean
    onUpload: () => void
}) {
    const monthLabel = THAI_MONTHS[month - 1] ?? String(month)
    const fullMonthLabel = THAI_MONTHS_FULL[month - 1] ?? String(month)

    // Filled: anchor → download (signed URL via API redirect)
    if (state === 'filled' && slip) {
        const downloadUrl = `/api/hradmin/employees/${employeeId}/salary-slips/${slip.id}`
        return (
            <a
                href={downloadUrl}
                title={`ดาวน์โหลดสลิป${fullMonthLabel} ${year + 543} · ${slip.file_name ?? 'slip.pdf'} · ${formatFileSize(slip.file_size ?? 0)}`}
                className="group relative flex flex-col items-center justify-center gap-1.5 h-20 rounded-lg border-2 border-emerald-400/40 bg-emerald-500/15 hover:bg-emerald-500/25 hover:border-emerald-300/60 transition-colors"
            >
                <Check size={14} className="text-emerald-300" />
                <p className="text-emerald-100 font-bold text-[0.85rem] leading-none">{monthLabel}</p>
                <p className="text-emerald-200/65 text-[0.65rem] leading-none">{year + 543}</p>
                {slip.file_size && (
                    <span className="absolute bottom-1 right-1.5 text-[0.6rem] text-emerald-200/60">
                        {formatFileSize(slip.file_size)}
                    </span>
                )}
            </a>
        )
    }

    // Missing past month: amber. If HR is in edit mode, clicking
    // jumps straight to the upload form pre-filled with this month.
    if (state === 'missing') {
        const baseClass = 'flex flex-col items-center justify-center gap-1.5 h-20 rounded-lg border-2 border-amber-500/30 bg-amber-500/10'
        const innerContent = (
            <>
                <AlertCircle size={14} className="text-amber-300" />
                <p className="text-amber-100 font-bold text-[0.85rem] leading-none">{monthLabel}</p>
                <p className="text-amber-200/55 text-[0.65rem] leading-none">{year + 543}</p>
            </>
        )
        if (canEdit) {
            return (
                <button
                    type="button"
                    onClick={onUpload}
                    title={`คลิกเพื่ออัปโหลดสลิป${fullMonthLabel} ${year + 543}`}
                    className={`${baseClass} hover:bg-amber-500/20 hover:border-amber-400/50 transition-colors cursor-pointer`}
                >
                    {innerContent}
                </button>
            )
        }
        return (
            <div className={baseClass} title={`ยังไม่มีสลิป${fullMonthLabel} ${year + 543}`}>
                {innerContent}
            </div>
        )
    }

    // Future month (or current year not yet reached this month) — quiet placeholder.
    return (
        <div
            className="flex flex-col items-center justify-center gap-1.5 h-20 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02]"
            title={`ยังไม่ถึงเดือน${fullMonthLabel}`}
        >
            <p className="text-white/30 font-semibold text-[0.85rem] leading-none">{monthLabel}</p>
            <p className="text-white/20 text-[0.65rem] leading-none">—</p>
        </div>
    )
}

// ── List view (year-scoped) ─────────────────────────────────────────────

function ListView({
    slips, employeeId, canDelete, isDeleting, onDelete,
}: {
    slips: SalarySlip[]
    employeeId: string
    canDelete: boolean
    isDeleting: boolean
    onDelete: (slipId: string, label: string) => void
}) {
    if (slips.length === 0) {
        return (
            <p className="text-white/55 text-[0.9rem] text-center py-8">
                ปีที่เลือกยังไม่มีสลิป — สลับ tab เป็น "ปฏิทิน" เพื่อดูภาพรวม หรือเปลี่ยนปี
            </p>
        )
    }
    return (
        <ul className="space-y-2">
            {slips.map((slip) => (
                <SlipRow
                    key={slip.id}
                    slip={slip}
                    employeeId={employeeId}
                    canDelete={canDelete}
                    onDelete={() => onDelete(slip.id, `${THAI_MONTHS[slip.month - 1]} ${slip.year + 543}`)}
                    isDeleting={isDeleting}
                />
            ))}
        </ul>
    )
}

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

// ── Upload form (now accepts initial year + month for grid pre-fill) ───

function UploadForm({
    employeeId, initialYear, initialMonth, onClose, onSuccess,
}: {
    employeeId: string
    initialYear: number
    initialMonth?: number
    onClose: () => void
    onSuccess: () => void
}) {
    const now = new Date()
    const [file, setFile] = useState<File | null>(null)
    const [year, setYear] = useState(initialYear)
    const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1)
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

    const prefilledLabel = initialMonth
        ? ` · pre-fill: ${THAI_MONTHS[initialMonth - 1]} ${initialYear + 543}`
        : ''

    return (
        <form
            onSubmit={handleSubmit}
            className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3"
        >
            <div className="flex items-center justify-between">
                <p className="text-emerald-200 font-bold text-[0.95rem] inline-flex items-center gap-1.5">
                    <Upload size={14} />
                    อัปโหลดสลิปใหม่{prefilledLabel}
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
