import Link from 'next/link'
import { MapPin, Building, Home, HelpCircle, ArrowRight } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function AttendanceWidget() {
    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    // Count employees
    const { count: totalEmployees } = await supabaseAdmin
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

    // Get today's checkins
    const { data: checkins } = await supabaseAdmin
        .from('checkins')
        .select('employee_id, type')
        .gte('checked_in_at', startOfDay.toISOString())
        .lte('checked_in_at', endOfDay.toISOString())

    // Dedupe by employee_id (latest checkin wins for counting)
    const checkinMap = new Map<string, string>()
    for (const c of checkins ?? []) {
        checkinMap.set(c.employee_id, c.type)
    }

    let officeCount = 0
    let wfhCount = 0
    for (const type of checkinMap.values()) {
        if (type === 'office') officeCount++
        else if (type === 'wfh') wfhCount++
    }

    const checkedInCount = checkinMap.size
    const notCheckedIn = (totalEmployees ?? 0) - checkedInCount

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
                        <p className="text-[11px] text-white/40">{checkedInCount}/{totalEmployees ?? 0} คน</p>
                    </div>
                </div>
                <ArrowRight size={16} className="text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg p-3 border border-emerald-500/30 bg-emerald-500/10">
                    <Building size={14} className="text-emerald-300 mb-1" />
                    <div className="text-xl font-bold text-emerald-300">{officeCount}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50">ออฟฟิศ</div>
                </div>
                <div className="rounded-lg p-3 border border-blue-500/30 bg-blue-500/10">
                    <Home size={14} className="text-blue-300 mb-1" />
                    <div className="text-xl font-bold text-blue-300">{wfhCount}</div>
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
