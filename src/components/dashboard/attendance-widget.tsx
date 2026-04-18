import Link from 'next/link'
import { MapPin, Building, Home, HelpCircle, ArrowRight } from 'lucide-react'

interface Props {
    stats: {
        officeCount: number
        wfhCount: number
        checkedInCount: number
        totalActive: number
    }
}

export function AttendanceWidget({ stats }: Props) {
    const notCheckedIn = stats.totalActive - stats.checkedInCount

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

            <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg p-4 border border-emerald-400/40 bg-gradient-to-br from-emerald-600/80 to-emerald-800/80 shadow-lg shadow-emerald-900/30 flex flex-col lg:grid lg:grid-cols-2 items-center gap-2 lg:gap-3">
                    <Building className="text-emerald-100 w-10 h-10 lg:w-full lg:h-auto lg:max-h-16" strokeWidth={1} />
                    <div className="flex flex-col items-center text-center">
                        <div className="text-2xl lg:text-4xl font-black text-white leading-none">{stats.officeCount}</div>
                        <div className="text-xs font-semibold text-emerald-100/80 mt-1.5">ออฟฟิศ</div>
                    </div>
                </div>
                <div className="rounded-lg p-4 border border-blue-400/40 bg-gradient-to-br from-blue-600/80 to-blue-800/80 shadow-lg shadow-blue-900/30 flex flex-col lg:grid lg:grid-cols-2 items-center gap-2 lg:gap-3">
                    <Home className="text-blue-100 w-10 h-10 lg:w-full lg:h-auto lg:max-h-16" strokeWidth={1} />
                    <div className="flex flex-col items-center text-center">
                        <div className="text-2xl lg:text-4xl font-black text-white leading-none">{stats.wfhCount}</div>
                        <div className="text-xs font-semibold text-blue-100/80 mt-1.5">WFH</div>
                    </div>
                </div>
                <div className="rounded-lg p-4 border border-amber-400/40 bg-gradient-to-br from-amber-500/80 to-amber-700/80 shadow-lg shadow-amber-900/30 flex flex-col lg:grid lg:grid-cols-2 items-center gap-2 lg:gap-3">
                    <HelpCircle className="text-amber-50 w-10 h-10 lg:w-full lg:h-auto lg:max-h-16" strokeWidth={1} />
                    <div className="flex flex-col items-center text-center">
                        <div className="text-2xl lg:text-4xl font-black text-white leading-none">{notCheckedIn}</div>
                        <div className="text-xs font-semibold text-amber-50/80 mt-1.5">ยังไม่เช็คอิน</div>
                    </div>
                </div>
            </div>
        </Link>
    )
}
