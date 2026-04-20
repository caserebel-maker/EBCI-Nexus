'use client'

import { ShieldCheck, Clock, Check, X } from 'lucide-react'
import type { UserPermissions } from '@/lib/permissions'

export function TabAuthority({ permissions }: { permissions: UserPermissions }) {
    return (
        <div
            className="p-6 lg:p-10 rounded-2xl border border-white/15 text-center space-y-4"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
        >
            <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-amber-400/20 ring-2 ring-amber-400/40">
                <ShieldCheck className="text-amber-300" size={28} />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-white">อำนาจอนุมัติ</h2>
                <p className="text-white/70 text-sm max-w-md mx-auto">
                    แสดงรายชื่อผู้มีอำนาจอนุมัติพร้อม scope (ลา / OT / เบิกเงิน / HR) และวงเงิน
                </p>
            </div>

            <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                {permissions.can_view_approval_limits ? (
                    <>
                        <Check size={12} className="text-emerald-300" /> คุณจะเห็นวงเงินตัวเลขเป๊ะ
                    </>
                ) : (
                    <>
                        <X size={12} className="text-white/40" /> วงเงินจะแสดงเป็นช่วง (💧 / 💎 / 🔥 / ♾️)
                    </>
                )}
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs text-white/50 italic pt-2">
                <Clock size={12} /> กำลังพัฒนา · Phase 2
            </div>
        </div>
    )
}
