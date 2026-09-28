import Link from 'next/link'
import { MapPin, Building, Home, HelpCircle, ArrowRight } from 'lucide-react'

interface Props {
    stats: {
        officeCount: number
        wfhCount: number
        outsideHeadOfficeCount?: number
        checkedInCount: number
        totalActive: number
    }
}

export function AttendanceWidget({ stats }: Props) {
    const notCheckedIn = stats.totalActive - stats.checkedInCount
    const outsideCount = stats.outsideHeadOfficeCount ?? 0

    return (
        <Link
            href="/hradmin/attendance"
            className="@container/attendance block min-w-0 rounded-2xl p-4 sm:p-5 border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
            style={{ backdropFilter: 'blur(8px)' }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-white/15 flex items-center justify-center text-amber-300 ring-1 ring-white/25">
                        <MapPin size={16} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[16px] leading-snug font-bold text-white">การเข้างานวันนี้</h3>
                        <p className="text-[14px] text-white/60">{stats.checkedInCount}/{stats.totalActive} คน</p>
                    </div>
                </div>
                <ArrowRight size={16} className="shrink-0 text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="grid grid-cols-1 @min-[260px]/attendance:grid-cols-2 @min-[760px]/attendance:grid-cols-4 gap-3">
                <div className="min-w-0 rounded-lg p-3 border border-emerald-400/40 bg-gradient-to-br from-emerald-600/80 to-emerald-800/80 shadow-lg shadow-emerald-900/30">
                    <div className="flex items-center justify-between gap-2">
                        <Building className="text-emerald-100 size-[28px] shrink-0" strokeWidth={1.5} />
                        <div className="text-[32px] font-black tabular-nums text-white leading-none">{stats.officeCount}</div>
                    </div>
                    <div className="text-[14px] leading-snug font-semibold text-emerald-100/90 mt-2 break-words">ออฟฟิศ</div>
                </div>
                <div className="min-w-0 rounded-lg p-3 border border-blue-400/40 bg-gradient-to-br from-blue-600/80 to-blue-800/80 shadow-lg shadow-blue-900/30">
                    <div className="flex items-center justify-between gap-2">
                        <Home className="text-blue-100 size-[28px] shrink-0" strokeWidth={1.5} />
                        <div className="text-[32px] font-black tabular-nums text-white leading-none">{stats.wfhCount}</div>
                    </div>
                    <div className="text-[14px] leading-snug font-semibold text-blue-100/90 mt-2 break-words">WFH</div>
                </div>
                <div className="min-w-0 rounded-lg p-3 border border-cyan-400/40 bg-gradient-to-br from-cyan-600/80 to-cyan-800/80 shadow-lg shadow-cyan-900/30">
                    <div className="flex items-center justify-between gap-2">
                        <MapPin className="text-cyan-100 size-[28px] shrink-0" strokeWidth={1.5} />
                        <div className="text-[32px] font-black tabular-nums text-white leading-none">{outsideCount}</div>
                    </div>
                    <div className="text-[14px] leading-snug font-semibold text-cyan-100/90 mt-2 break-words">นอก Head Office</div>
                </div>
                <div className="min-w-0 rounded-lg p-3 border border-amber-400/40 bg-gradient-to-br from-amber-500/80 to-amber-700/80 shadow-lg shadow-amber-900/30">
                    <div className="flex items-center justify-between gap-2">
                        <HelpCircle className="text-amber-50 size-[28px] shrink-0" strokeWidth={1.5} />
                        <div className="text-[32px] font-black tabular-nums text-white leading-none">{notCheckedIn}</div>
                    </div>
                    <div className="text-[14px] leading-snug font-semibold text-amber-50/90 mt-2 break-words">ยังไม่เช็คอิน</div>
                </div>
            </div>
        </Link>
    )
}
