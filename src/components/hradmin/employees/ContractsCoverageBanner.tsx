import { FileSignature, CheckCircle2, AlertCircle } from 'lucide-react'

/**
 * Banner that shows HR how far along they are on the contract-backfill
 * project: scanning every active employee's signed contract into the
 * system within 3 months (decided Apr 27, 2026).
 *
 * Pure server component — no interactivity needed; the numbers
 * refresh on every page load because the parent route is dynamic.
 */
interface Props {
    withContract: number
    activeTotal: number
}

export function ContractsCoverageBanner({ withContract, activeTotal }: Props) {
    if (activeTotal === 0) return null
    const pct = Math.round((withContract / activeTotal) * 100)
    const remaining = activeTotal - withContract
    const isComplete = remaining === 0

    // Three visual tones depending on how close HR is to done.
    const tone = isComplete         ? 'green'
              : pct >= 60           ? 'blue'
              : pct >= 30           ? 'amber'
                                    : 'maroon'
    const palette = {
        green:  { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.35)',  bar: '#10b981', text: '#34d399' },
        blue:   { bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.35)',  bar: '#3b82f6', text: '#60a5fa' },
        amber:  { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.35)',  bar: '#fbbf24', text: '#fcd34d' },
        maroon: { bg: 'rgba(136,33,54,0.12)',   border: 'rgba(136,33,54,0.40)',   bar: '#882136', text: '#ec8a9c' },
    }[tone]

    return (
        <div
            className="rounded-2xl border p-4 sm:p-5 shadow-xl"
            style={{
                background: palette.bg,
                borderColor: palette.border,
                backdropFilter: 'blur(6px)',
            }}
        >
            <div className="flex items-center gap-3 mb-3">
                <div
                    className="h-9 w-9 rounded-lg inline-flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                    {isComplete
                        ? <CheckCircle2 size={16} style={{ color: palette.text }} />
                        : <FileSignature size={16} style={{ color: palette.text }} />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-[1rem] leading-tight">
                        {isComplete
                            ? 'Backfill สัญญาจ้างเสร็จสมบูรณ์'
                            : 'ความคืบหน้า — Backfill สัญญาจ้างพนักงานทั้งหมด'}
                    </h3>
                    <p className="text-white/60 text-[0.8rem] mt-0.5">
                        เป้า: เก็บสัญญาทุกคนภายใน 3 เดือน · เริ่ม Apr 27, 2026
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-white font-bold text-[1.4rem] leading-none tabular-nums" style={{ color: palette.text }}>
                        {pct}%
                    </p>
                    <p className="text-white/55 text-[0.75rem] mt-0.5">
                        {withContract} / {activeTotal} คน
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div
                className="h-2.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.08)' }}
            >
                <div
                    className="h-full transition-all duration-500"
                    style={{
                        width: `${Math.max(pct, 2)}%`,
                        background: palette.bar,
                        boxShadow: `0 0 12px ${palette.bar}80`,
                    }}
                />
            </div>

            {/* Footer line — encourage action when not done */}
            {!isComplete && (
                <p className="mt-3 text-[0.85rem] text-white/70 inline-flex items-center gap-1.5">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>
                        ยังเหลือ <strong className="text-white">{remaining}</strong> คนที่ยังไม่มีสัญญาในระบบ — เปิดโปรไฟล์พนักงานแล้วกด <strong>"อัปโหลดสัญญาใหม่"</strong> ในการ์ด <em>เอกสารสัญญาจ้าง</em>
                    </span>
                </p>
            )}
        </div>
    )
}
