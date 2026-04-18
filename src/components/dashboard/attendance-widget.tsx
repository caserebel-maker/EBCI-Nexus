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
                <div className="rounded-lg p-3 border border-emerald-400/40 bg-gradient-to-br from-emerald-600/80 to-emerald-800/80 shadow-lg shadow-emerald-900/30">
                    <Building size={14} className="text-emerald-100 mb-1" />
                    <div className="text-xl font-bold text-white">{stats.officeCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-100/80">ออฟฟิศ</div>
                </div>
                <div className="rounded-lg p-3 border border-blue-400/40 bg-gradient-to-br from-blue-600/80 to-blue-800/80 shadow-lg shadow-blue-900/30">
                    <Home size={14} className="text-blue-100 mb-1" />
                    <div className="text-xl font-bold text-white">{stats.wfhCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-blue-100/80">WFH</div>
                </div>
                <div className="rounded-lg p-3 border border-amber-400/40 bg-gradient-to-br from-amber-500/80 to-amber-700/80 shadow-lg shadow-amber-900/30">
                    <HelpCircle size={14} className="text-amber-50 mb-1" />
                    <div className="text-xl font-bold text-white">{notCheckedIn}</div>
                    <div className="text-[10px] uppercase tracking-wider text-amber-50/80">ยังไม่เช็คอิน</div>
                </div>
            </div>
        </Link>
    )
}
