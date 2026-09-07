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
            className="block rounded-2xl p-5 border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
            style={{ backdropFilter: 'blur(8px)' }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center text-amber-300 ring-1 ring-white/25">
                        <MapPin size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">การเข้างานวันนี้</h3>
                        <p className="text-[11px] text-white/40">{stats.checkedInCount}/{stats.totalActive} คน</p>
                    </div>
                </div>
                <ArrowRight size={16} className="text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="rounded-lg p-3.5 border border-emerald-400/40 bg-gradient-to-br from-emerald-600/80 to-emerald-800/80 shadow-lg shadow-emerald-900/30 flex items-center justify-between gap-2">
                    <Building className="text-emerald-100 w-8 h-8 lg:w-10 lg:h-10 shrink-0" strokeWidth={1.5} />
                    <div className="flex flex-col items-end text-right min-w-0">
                        <div className="text-2xl lg:text-3xl font-black text-white leading-none">{stats.officeCount}</div>
                        <div className="text-[11px] font-semibold text-emerald-100/80 mt-1 truncate">ออฟฟิศ</div>
                    </div>
                </div>
                <div className="rounded-lg p-3.5 border border-blue-400/40 bg-gradient-to-br from-blue-600/80 to-blue-800/80 shadow-lg shadow-blue-900/30 flex items-center justify-between gap-2">
                    <Home className="text-blue-100 w-8 h-8 lg:w-10 lg:h-10 shrink-0" strokeWidth={1.5} />
                    <div className="flex flex-col items-end text-right min-w-0">
                        <div className="text-2xl lg:text-3xl font-black text-white leading-none">{stats.wfhCount}</div>
                        <div className="text-[11px] font-semibold text-blue-100/80 mt-1 truncate">WFH</div>
                    </div>
                </div>
                <div className="rounded-lg p-3.5 border border-cyan-400/40 bg-gradient-to-br from-cyan-600/80 to-cyan-800/80 shadow-lg shadow-cyan-900/30 flex items-center justify-between gap-2">
                    <MapPin className="text-cyan-100 w-8 h-8 lg:w-10 lg:h-10 shrink-0" strokeWidth={1.5} />
                    <div className="flex flex-col items-end text-right min-w-0">
                        <div className="text-2xl lg:text-3xl font-black text-white leading-none">{outsideCount}</div>
                        <div className="text-[11px] font-semibold text-cyan-100/80 mt-1 truncate">นอก Head Office</div>
                    </div>
                </div>
                <div className="rounded-lg p-3.5 border border-amber-400/40 bg-gradient-to-br from-amber-500/80 to-amber-700/80 shadow-lg shadow-amber-900/30 flex items-center justify-between gap-2">
                    <HelpCircle className="text-amber-50 w-8 h-8 lg:w-10 lg:h-10 shrink-0" strokeWidth={1.5} />
                    <div className="flex flex-col items-end text-right min-w-0">
                        <div className="text-2xl lg:text-3xl font-black text-white leading-none">{notCheckedIn}</div>
                        <div className="text-[11px] font-semibold text-amber-50/80 mt-1 truncate">ยังไม่เช็คอิน</div>
                    </div>
                </div>
            </div>
        </Link>
    )
}
