'use client'

import { useMemo, useState } from 'react'
import {
    Wallet, Download, AlertCircle, LayoutGrid, List, Check,
} from 'lucide-react'

const THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

export interface PortalSlip {
    id: string
    year: number
    month: number
    file_name: string | null
    file_size: number | null
    mime_type: string | null
    uploaded_at: string
    notes: string | null
}

interface Props {
    slips: PortalSlip[]
    hasEmployeeRow: boolean
}

type ViewMode = 'grid' | 'list'

/**
 * PortalPayrollView — what the employee themselves sees at
 * /portal/payroll.
 *
 * Two views:
 *   - Grid (default): a 4×3 calendar grid for one year. Months with
 *     a slip render green-with-check; future months sit dimmed; past
 *     months without a slip show as amber so the employee knows
 *     accounting hasn't issued it yet.
 *   - List: simple stacked list scoped to the selected year.
 *
 * Year selector at the top scopes both views. Each download fires
 * /api/portal/payroll/[slipId] which mints a 1h signed URL with
 * Content-Disposition: attachment, then 302-redirects.
 */
export function PortalPayrollView({ slips, hasEmployeeRow }: Props) {
    // Index by "YYYY-M" so the grid does O(1) lookups.
    const slipMap = useMemo(() => {
        const m = new Map<string, PortalSlip>()
        for (const s of slips) m.set(`${s.year}-${s.month}`, s)
        return m
    }, [slips])

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Years that actually have slips — newest first. Always include
    // current year so the grid renders even on month 1 of year 1.
    const years = useMemo(() => {
        const set = new Set<number>(slips.map(s => s.year))
        set.add(currentYear)
        return [...set].sort((a, b) => b - a)
    }, [slips, currentYear])

    const [selectedYear, setSelectedYear] = useState<number>(years[0] ?? currentYear)
    const [viewMode, setViewMode] = useState<ViewMode>('grid')

    const slipsForYear = useMemo(
        () => slips.filter(s => s.year === selectedYear).sort((a, b) => b.month - a.month),
        [slips, selectedYear],
    )

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <header className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 inline-flex items-center justify-center shrink-0">
                    <Wallet size={20} className="text-emerald-300" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-white">สลิปเงินเดือน</h1>
                    <p className="text-white/60 text-[0.95rem] mt-0.5">
                        {slips.length > 0
                            ? `ทั้งหมด ${slips.length} รายการ — ดาวน์โหลดได้ทุกเมื่อ`
                            : 'ยังไม่มีสลิปในระบบ'}
                    </p>
                </div>
            </header>

            {!hasEmployeeRow && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100 inline-flex items-start gap-2 w-full">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span className="text-[0.9rem]">
                        บัญชีของคุณยังไม่ถูกผูกกับข้อมูลพนักงานในระบบ — กรุณาแจ้งฝ่ายบุคคลเพื่อตรวจสอบ
                    </span>
                </div>
            )}

            {/* Toolbar + grid render even at 0 slips so the employee
                sees a calendar skeleton (all amber "waiting for
                accounting" cells) instead of a stark empty card —
                conveys "this is where slips will land" much more
                clearly than text alone. */}
            {hasEmployeeRow && (
                <>
                    <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
                            <ToggleButton
                                active={viewMode === 'grid'}
                                onClick={() => setViewMode('grid')}
                                icon={<LayoutGrid size={13} />}
                                label="ปฏิทิน"
                            />
                            <ToggleButton
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
                            {years.map((y) => (
                                <option key={y} value={y} className="bg-[#15040a]">
                                    ปี {y + 543} ({slips.filter(s => s.year === y).length} ฉบับ)
                                </option>
                            ))}
                        </select>
                    </div>

                    {slips.length === 0 && (
                        <div className="rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2.5 text-[0.85rem] text-white/65 leading-relaxed">
                            <span className="text-white/85 font-semibold">ยังไม่มีสลิปในระบบ</span> — ฝ่ายบัญชีจะอัปโหลดและส่ง email + แจ้งเตือนให้ทราบเมื่อสลิปแต่ละเดือนพร้อม
                        </div>
                    )}

                    {viewMode === 'grid' ? (
                        <CalendarGridView
                            year={selectedYear}
                            slipMap={slipMap}
                            currentYear={currentYear}
                            currentMonth={currentMonth}
                        />
                    ) : (
                        <ListView slips={slipsForYear} />
                    )}

                    {slips.length > 0 && (
                        <p className="text-white/40 text-[0.78rem] leading-relaxed text-center pt-2">
                            หากพบความผิดพลาดในรายการเงินเดือน หรือมีคำถามเกี่ยวกับสลิป
                            กรุณาติดต่อฝ่ายบัญชีเพื่อขอแก้ไข
                        </p>
                    )}
                </>
            )}
        </div>
    )
}

// ── Pieces ──────────────────────────────────────────────────────────────

function ToggleButton({
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

function CalendarGridView({
    year, slipMap, currentYear, currentMonth,
}: {
    year: number
    slipMap: Map<string, PortalSlip>
    currentYear: number
    currentMonth: number
}) {
    return (
        <div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const slip = slipMap.get(`${year}-${month}`)
                    const isFuture =
                        year > currentYear ||
                        (year === currentYear && month > currentMonth)
                    const monthShort = THAI_MONTHS_SHORT[month - 1]
                    const monthFull = THAI_MONTHS_FULL[month - 1]

                    if (slip) {
                        // Filled cell — anchor → /api/portal/payroll/[slipId] (signed URL redirect)
                        const downloadUrl = `/api/portal/payroll/${slip.id}`
                        return (
                            <a
                                key={month}
                                href={downloadUrl}
                                title={`ดาวน์โหลดสลิป ${monthFull} ${year + 543}`}
                                className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-xl border-2 border-emerald-400/40 bg-emerald-500/15 hover:bg-emerald-500/25 hover:border-emerald-300/60 transition-colors"
                            >
                                <Check size={16} className="text-emerald-300" />
                                <p className="text-emerald-100 font-bold text-sm leading-none">{monthShort}</p>
                                <p className="text-emerald-200/65 text-[0.7rem] leading-none">{year + 543}</p>
                                <span className="text-[0.65rem] text-emerald-200/60 inline-flex items-center gap-1">
                                    <Download size={9} />
                                    ดาวน์โหลด
                                </span>
                            </a>
                        )
                    }

                    if (isFuture) {
                        // Future months — quiet, dim, not actionable
                        return (
                            <div
                                key={month}
                                className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02]"
                                title={`ยังไม่ถึง ${monthFull}`}
                            >
                                <p className="text-white/30 font-semibold text-sm leading-none">{monthShort}</p>
                                <p className="text-white/20 text-[0.7rem] leading-none">—</p>
                            </div>
                        )
                    }

                    // Past month, no slip — amber "waiting" state
                    return (
                        <div
                            key={month}
                            className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-xl border-2 border-amber-500/30 bg-amber-500/10"
                            title={`ยังไม่มีสลิป ${monthFull} — ฝ่ายบัญชียังไม่ได้อัปโหลด`}
                        >
                            <AlertCircle size={14} className="text-amber-300" />
                            <p className="text-amber-100 font-bold text-sm leading-none">{monthShort}</p>
                            <p className="text-amber-200/55 text-[0.7rem] leading-none">{year + 543}</p>
                            <span className="text-[0.65rem] text-amber-200/55">รอ</span>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.78rem] text-white/55">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/60 border border-emerald-400/50" />
                    มีสลิป — กดเพื่อดาวน์โหลด
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/40 border border-amber-400/40" />
                    รอฝ่ายบัญชี
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-white/10 border border-white/15" />
                    ยังไม่ถึงเดือน
                </span>
            </div>
        </div>
    )
}

function ListView({ slips }: { slips: PortalSlip[] }) {
    if (slips.length === 0) {
        return (
            <p className="text-white/55 text-[0.9rem] text-center py-8">
                ปีที่เลือกยังไม่มีสลิป — สลับ tab เป็น "ปฏิทิน" เพื่อดูภาพรวม หรือเปลี่ยนปี
            </p>
        )
    }
    return (
        <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {slips.map((s) => <SlipRow key={s.id} slip={s} />)}
        </div>
    )
}

function SlipRow({ slip }: { slip: PortalSlip }) {
    const downloadUrl = `/api/portal/payroll/${slip.id}`
    const monthLabelLong = THAI_MONTHS_FULL[slip.month - 1] ?? String(slip.month)
    const monthLabelShort = THAI_MONTHS_SHORT[slip.month - 1] ?? String(slip.month)
    const uploadedDate = new Date(slip.uploaded_at).toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
    return (
        <a
            href={downloadUrl}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
        >
            <div className="shrink-0 w-14 text-center">
                <p className="text-emerald-300 font-bold text-sm leading-none">{monthLabelShort}</p>
                <p className="text-white/45 text-[0.7rem] mt-0.5">{slip.year + 543}</p>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white text-[0.95rem] font-semibold leading-snug">
                    สลิปเงินเดือน {monthLabelLong}
                </p>
                <p className="text-white/55 text-[0.78rem] mt-0.5 truncate">
                    {slip.file_name ?? 'slip.pdf'}
                    {slip.file_size && (
                        <span className="text-white/35"> · {formatFileSize(slip.file_size)}</span>
                    )}
                    <span className="text-white/35"> · ออกเมื่อ {uploadedDate}</span>
                </p>
                {slip.notes && (
                    <p className="text-emerald-200/70 text-[0.78rem] mt-0.5 truncate">
                        💬 {slip.notes}
                    </p>
                )}
            </div>
            <div className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white/5 group-hover:bg-emerald-500/20 text-white/70 transition-colors">
                <Download size={14} />
            </div>
        </a>
    )
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
