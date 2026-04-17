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
                    <div className="h-9 w-9 rounded-lg bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
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
                <div className="rounded-lg p-3 border border-emerald-500/30 bg-emerald-500/10">
                    <Building size={14} className="text-emerald-300 mb-1" />
                    <div className="text-xl font-bold text-emerald-300">{stats.officeCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50">ออฟฟิศ</div>
                </div>
                <div className="rounded-lg p-3 border border-blue-500/30 bg-blue-500/10">
                    <Home size={14} className="text-blue-300 mb-1" />
                    <div className="text-xl font-bold text-blue-300">{stats.wfhCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50">WFH</div>
                </div>
                <div className="rounded-lg p-3 border border-amber-500/30 bg-amber-500/10">
                    <HelpCircle size={14} className="text-amber-300 mb-1" />
                    <div className="text-xl font-bold text-amber-300">{notCheckedIn}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50">ยังไม่เช็คอิน</div>
                </div>
            </div>
        </Link>
    )
}
