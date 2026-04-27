'use client'

import { useMemo, useState } from 'react'
import { Wallet, Download, FileText, AlertCircle } from 'lucide-react'

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

/**
 * PortalPayrollView — what the employee themselves sees at
 * /portal/payroll. Slips are grouped by year (newest first) so
 * scanning across decades works. Each row is a button that hits
 * /api/portal/payroll/[slipId] which mints a 1h signed URL with
 * Content-Disposition: attachment, then 302-redirects.
 */
export function PortalPayrollView({ slips, hasEmployeeRow }: Props) {
    // Group by year for the section headers
    const byYear = useMemo(() => {
        const map = new Map<number, PortalSlip[]>()
        for (const s of slips) {
            const list = map.get(s.year) ?? []
            list.push(s)
            map.set(s.year, list)
        }
        // Keep year DESC, month DESC inside each year
        return Array.from(map.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([year, list]) => [year, list.sort((a, b) => b.month - a.month)] as const)
    }, [slips])

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <header className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 inline-flex items-center justify-center shrink-0">
                    <Wallet size={20} className="text-emerald-300" />
                </div>
                <div>
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

            {byYear.length === 0 && hasEmployeeRow && (
                <EmptyState />
            )}

            {byYear.map(([year, list]) => (
                <section key={year} className="space-y-2">
                    <h2 className="text-white/70 text-[0.85rem] font-bold tracking-widest uppercase pl-1">
                        ปี {year + 543}
                    </h2>
                    <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                        {list.map((s) => <SlipRow key={s.id} slip={s} />)}
                    </div>
                </section>
            ))}

            {byYear.length > 0 && (
                <p className="text-white/40 text-[0.78rem] leading-relaxed text-center pt-2">
                    หากพบความผิดพลาดในรายการเงินเดือน หรือมีคำถามเกี่ยวกับสลิป
                    กรุณาติดต่อฝ่ายบัญชีเพื่อขอแก้ไข
                </p>
            )}
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

function EmptyState() {
    return (
        <div className="text-center py-16">
            <FileText size={40} className="mx-auto text-white/25 mb-3" />
            <p className="text-white/60 text-[0.95rem] mb-1">
                ยังไม่มีสลิปเงินเดือนในระบบ
            </p>
            <p className="text-white/40 text-[0.85rem]">
                ฝ่ายบัญชีจะอัปโหลดและแจ้งให้ทราบเมื่อสลิปพร้อม
            </p>
        </div>
    )
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
