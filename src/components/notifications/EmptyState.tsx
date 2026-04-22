'use client'

import { BellOff } from 'lucide-react'

export function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <BellOff size={24} className="text-white/50" />
            </div>
            <p className="text-white font-semibold text-sm mb-1">
                ยังไม่มีการแจ้งเตือน
            </p>
            <p className="text-white/50 text-xs leading-relaxed max-w-[240px]">
                เราจะแจ้งให้คุณทราบเมื่อมีการเปลี่ยนแปลงใบลา ใบสมัคร
                หรือประกาศจากฝ่าย HR
            </p>
        </div>
    )
}
