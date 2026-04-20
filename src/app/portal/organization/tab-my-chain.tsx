'use client'

import { Route, Clock } from 'lucide-react'
import type { UserPermissions } from '@/lib/permissions'

// Permissions reserved for future gating (e.g. hide chain for users with can_approve_leave = true
// but no assigned chain). Keep the prop so the shell signature stays stable across tabs.
export function TabMyChain({ permissions: _permissions }: { permissions: UserPermissions }) {
    return (
        <div
            className="p-6 lg:p-10 rounded-2xl border border-white/15 text-center space-y-4"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
        >
            <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-emerald-400/20 ring-2 ring-emerald-400/40">
                <Route className="text-emerald-300" size={28} />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-white">สายอนุมัติของฉัน</h2>
                <p className="text-white/70 text-sm max-w-md mx-auto">
                    แสดงขั้นตอนการอนุมัติของคุณเอง (ลา / OT / เบิกเงิน) พร้อมชื่อผู้อนุมัติแต่ละขั้น
                </p>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs text-white/50 italic pt-2">
                <Clock size={12} /> กำลังพัฒนา · Phase 2
            </div>
        </div>
    )
}
